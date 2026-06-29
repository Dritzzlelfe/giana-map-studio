import { supabase } from "@/integrations/supabase/client";

export type MapNode = {
  id: string;
  map_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  priority: string | null;
  color: string | null;
  sort_order: number;
  collapsed: boolean;
  created_at: string;
  updated_at: string;
};

export type MapRow = {
  id: string;
  name: string;
  created_at: string;
};

export type TreeNode = MapNode & { children: TreeNode[] };

export type LoadedMap = {
  map: MapRow;
  nodes: MapNode[];
  byId: Record<string, MapNode>;
  childrenOf: Record<string, MapNode[]>;
  rootId: string | null;
  tree: TreeNode | null;
};

export async function loadMap(): Promise<LoadedMap | null> {
  const { data: maps, error: mapErr } = await supabase
    .from("maps")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1);
  if (mapErr) throw mapErr;
  const map = maps?.[0];
  if (!map) return null;

  const { data: nodes, error: nodesErr } = await supabase
    .from("map_nodes")
    .select("*")
    .eq("map_id", map.id)
    .order("sort_order", { ascending: true });
  if (nodesErr) throw nodesErr;

  return assemble(map as MapRow, (nodes ?? []) as MapNode[]);
}

export function assemble(map: MapRow, nodes: MapNode[]): LoadedMap {
  const byId: Record<string, MapNode> = {};
  const childrenOf: Record<string, MapNode[]> = {};
  let rootId: string | null = null;

  for (const n of nodes) {
    byId[n.id] = n;
    const key = n.parent_id ?? "__root__";
    (childrenOf[key] ||= []).push(n);
    if (n.parent_id === null) rootId = n.id;
  }
  for (const key of Object.keys(childrenOf)) {
    childrenOf[key].sort((a, b) => a.sort_order - b.sort_order);
  }

  const build = (n: MapNode): TreeNode => ({
    ...n,
    children: (childrenOf[n.id] ?? []).map(build),
  });

  const tree = rootId && byId[rootId] ? build(byId[rootId]) : null;
  return { map, nodes, byId, childrenOf, rootId, tree };
}

export function descendantCount(loaded: LoadedMap, nodeId: string): number {
  let count = 0;
  const walk = (id: string) => {
    const kids = loaded.childrenOf[id] ?? [];
    for (const k of kids) {
      count++;
      walk(k.id);
    }
  };
  walk(nodeId);
  return count;
}

export function nextSortOrder(loaded: LoadedMap, parentId: string | null): number {
  const siblings = loaded.childrenOf[parentId ?? "__root__"] ?? [];
  if (siblings.length === 0) return 100;
  return siblings[siblings.length - 1].sort_order + 100;
}

export function siblingSortOrderAfter(loaded: LoadedMap, siblingId: string): number {
  const sibling = loaded.byId[siblingId];
  if (!sibling) return 100;
  const parentKey = sibling.parent_id ?? "__root__";
  const siblings = loaded.childrenOf[parentKey] ?? [];
  const idx = siblings.findIndex((s) => s.id === siblingId);
  const next = siblings[idx + 1];
  if (!next) return sibling.sort_order + 100;
  return (sibling.sort_order + next.sort_order) / 2;
}

export async function insertNode(input: {
  map_id: string;
  parent_id: string | null;
  title: string;
  category?: string | null;
  sort_order: number;
}): Promise<MapNode> {
  const { data, error } = await supabase
    .from("map_nodes")
    .insert({
      map_id: input.map_id,
      parent_id: input.parent_id,
      title: input.title,
      category: input.category ?? "field",
      sort_order: input.sort_order,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MapNode;
}

export async function updateNode(id: string, patch: Partial<MapNode>): Promise<MapNode> {
  const allowed = (({ title, description, category, status, priority, color, sort_order, collapsed, parent_id }) => ({
    title, description, category, status, priority, color, sort_order, collapsed, parent_id,
  }))(patch as MapNode);
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(allowed)) if (v !== undefined) cleaned[k] = v;

  const { data, error } = await supabase
    .from("map_nodes")
    .update(cleaned)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as MapNode;
}

export async function deleteNode(id: string): Promise<void> {
  const { error } = await supabase.from("map_nodes").delete().eq("id", id);
  if (error) throw error;
}
