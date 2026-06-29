import { useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { MindMapNode, type MindNodeData } from "./MindMapNode";
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
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCommitTitle: (id: string, title: string) => void;
  onEditingChange: (id: string, editing: boolean) => void;
};

const nodeTypes = { mind: MindMapNode };

function layout(nodes: Node<MindNodeData>[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 22, ranksep: 70, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) =>
    g.setNode(n.id, { width: n.data.isRoot ? NODE_W_ROOT : NODE_W, height: NODE_H }),
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - (n.data.isRoot ? NODE_W_ROOT : NODE_W) / 2, y: pos.y - NODE_H / 2 } };
  });
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
  const { data, selectedId, searchMatches, searchActive } = props;
  const rf = useReactFlow();
  const didFit = useRef(false);

  const { nodes, edges } = useMemo(() => {
    const visible = collectVisible(data);
    const visibleSet = new Set(visible.map((v) => v.id));

    const flowNodes: Node<MindNodeData>[] = visible.map((n) => ({
      id: n.id,
      type: "mind",
      position: { x: 0, y: 0 },
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
        onSelect: props.onSelect,
        onAddChild: props.onAddChild,
        onEdit: props.onEdit,
        onDelete: props.onDelete,
        onToggleCollapse: props.onToggleCollapse,
      },
    }));

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
    return { nodes: layout(flowNodes, flowEdges), edges: flowEdges };
  }, [data, selectedId, searchMatches, searchActive, props.onSelect, props.onAddChild, props.onEdit, props.onDelete, props.onToggleCollapse]);

  useEffect(() => {
    if (didFit.current) return;
    if (nodes.length === 0) return;
    didFit.current = true;
    requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 300 }));
  }, [nodes, rf]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.2}
      maxZoom={1.5}
      proOptions={{ hideAttribution: false }}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnScroll
      selectionOnDrag
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
