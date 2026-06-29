import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeDragHandler,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { MindMapNode, type MindNodeData } from "./MindMapNode";
import { useUpdateNodePositions } from "@/lib/useMapData";
import type { LoadedMap, MapNode } from "@/lib/mapApi";

const NODE_W_ROOT = 260;
const NODE_W = 200;
const NODE_H = 56;

type Props = {
  data: LoadedMap;
  selectedId: string | null;
  editingId: string | null;
  searchMatches: Set<string>;
  searchActive: boolean;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddChildAt: (parentId: string | null, pos: { x: number; y: number }) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCommitTitle: (id: string, title: string) => void;
  onEditingChange: (id: string, editing: boolean) => void;
};

const nodeTypes = { mind: MindMapNode };

function computeDagreLayout(visible: MapNode[], rootId: string | null): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 22, ranksep: 80, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  visible.forEach((n) => {
    g.setNode(n.id, { width: n.id === rootId ? NODE_W_ROOT : NODE_W, height: NODE_H });
  });
  visible.forEach((n) => {
    if (n.parent_id) g.setEdge(n.parent_id, n.id);
  });
  dagre.layout(g);
  const out: Record<string, { x: number; y: number }> = {};
  visible.forEach((n) => {
    const p = g.node(n.id);
    const w = n.id === rootId ? NODE_W_ROOT : NODE_W;
    out[n.id] = { x: p.x - w / 2, y: p.y - NODE_H / 2 };
  });
  return out;
}

function collectVisible(data: LoadedMap): MapNode[] {
  const visible: MapNode[] = [];
  if (!data.rootId) return visible;
  const walk = (id: string, parentCollapsed: boolean) => {
    const n = data.byId[id];
    if (!n) return;
    visible.push(n);
    if (n.collapsed || parentCollapsed) return;
    const kids = data.childrenOf[id] ?? [];
    for (const k of kids) walk(k.id, false);
  };
  walk(data.rootId, false);
  return visible;
}

function InnerFlow(props: Props) {
  const { data, selectedId, editingId, searchMatches, searchActive } = props;
  const rf = useReactFlow();
  const didFit = useRef(false);
  const seededRef = useRef(false);
  const updatePositions = useUpdateNodePositions();

  // Seed missing positions exactly once per session.
  useEffect(() => {
    if (seededRef.current) return;
    if (!data.rootId) return;
    const missing = data.nodes.filter((n) => n.pos_x === null || n.pos_y === null);
    if (missing.length === 0) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    const positions = computeDagreLayout(data.nodes, data.rootId);
    const updates = missing.map((n) => ({
      id: n.id,
      pos_x: positions[n.id]?.x ?? 0,
      pos_y: positions[n.id]?.y ?? 0,
    }));
    updatePositions.mutate(updates);
  }, [data, updatePositions]);

  const { nodes, edges } = useMemo(() => {
    const visible = collectVisible(data);
    const visibleSet = new Set(visible.map((v) => v.id));

    // Fallback positions if some nodes are still null (pre-seed render).
    const fallback = computeDagreLayout(visible, data.rootId);

    const flowNodes: Node<MindNodeData>[] = visible.map((n) => {
      const x = n.pos_x ?? fallback[n.id]?.x ?? 0;
      const y = n.pos_y ?? fallback[n.id]?.y ?? 0;
      return {
        id: n.id,
        type: "mind",
        position: { x, y },
        selected: n.id === selectedId,
        data: {
          id: n.id,
          title: n.title,
          category: n.category,
          priority: n.priority,
          isRoot: n.parent_id === null,
          hasChildren: (data.childrenOf[n.id] ?? []).length > 0,
          collapsed: n.collapsed,
          highlighted: searchActive && searchMatches.has(n.id),
          dimmed: searchActive && !searchMatches.has(n.id),
          autoEdit: n.id === editingId,
          onSelect: props.onSelect,
          onAddChild: props.onAddChild,
          onEdit: props.onEdit,
          onDelete: props.onDelete,
          onToggleCollapse: props.onToggleCollapse,
          onCommitTitle: props.onCommitTitle,
          onEditingChange: props.onEditingChange,
        },
      };
    });

    const flowEdges: Edge[] = [];
    for (const n of visible) {
      if (n.parent_id && visibleSet.has(n.parent_id)) {
        flowEdges.push({
          id: `e-${n.parent_id}-${n.id}`,
          source: n.parent_id,
          target: n.id,
          type: "smoothstep",
        });
      }
    }
    return { nodes: flowNodes, edges: flowEdges };
  }, [data, selectedId, editingId, searchMatches, searchActive, props.onSelect, props.onAddChild, props.onEdit, props.onDelete, props.onToggleCollapse, props.onCommitTitle, props.onEditingChange]);

  useEffect(() => {
    if (didFit.current) return;
    if (nodes.length === 0) return;
    didFit.current = true;
    requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 300 }));
  }, [nodes, rf]);

  // Fit view to the selected node when selection changes (e.g. from Outline click).
  useEffect(() => {
    if (!selectedId) return;
    const t = setTimeout(() => {
      rf.fitView({ nodes: [{ id: selectedId }], duration: 300, padding: 0.3 });
    }, 50);
    return () => clearTimeout(t);
  }, [selectedId, rf]);

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      updatePositions.mutate([{ id: node.id, pos_x: node.position.x, pos_y: node.position.y }]);
    },
    [updatePositions],
  );

  // Double-click on empty canvas → create a child of selectedId (or root) at click position.
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const pos = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      // Offset so the new card's top-left lands near the cursor rather than centered.
      const x = pos.x - NODE_W / 2;
      const y = pos.y - NODE_H / 2;
      const parentId = selectedId ?? data.rootId;
      props.onAddChildAt(parentId, { x, y });
    },
    [rf, selectedId, data.rootId, props],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      minZoom={0.2}
      maxZoom={1.5}
      proOptions={{ hideAttribution: false }}
      nodesDraggable
      nodesConnectable={false}
      panOnScroll
      selectionOnDrag
      onNodeDragStop={onNodeDragStop}
      onPaneClick={() => { /* keep selection unless explicitly cleared elsewhere */ }}
      onDoubleClick={(e) => {
        // Only fire when the double-click target is the pane (not a node).
        const target = e.target as HTMLElement;
        if (target.closest('.react-flow__node')) return;
        onPaneDoubleClick(e);
      }}
    >
      <Background gap={24} size={1} color="oklch(0.85 0.01 85)" />
      <Controls showInteractive={false} className="!shadow-sm" />
      <MiniMap pannable zoomable className="!bg-card !border !border-border" nodeColor={() => "oklch(0.7 0.05 260)"} />
    </ReactFlow>
  );
}

export function MindMapView(props: Props) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <InnerFlow {...props} />
      </ReactFlowProvider>
    </div>
  );
}
