import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadMap,
  insertNode,
  updateNode,
  deleteNode,
  nextSortOrder,
  siblingSortOrderAfter,
  type LoadedMap,
  type MapNode,
} from "./mapApi";
import { toast } from "sonner";

export const MAP_QUERY_KEY = ["map"] as const;

export function useMap() {
  return useQuery({
    queryKey: MAP_QUERY_KEY,
    queryFn: loadMap,
    staleTime: 60_000,
  });
}

export function useAddChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { parentId: string | null; title: string; category?: string | null }) => {
      const data = qc.getQueryData<LoadedMap | null>(MAP_QUERY_KEY);
      if (!data) throw new Error("Map not loaded");
      return insertNode({
        map_id: data.map.id,
        parent_id: input.parentId,
        title: input.title,
        category: input.category ?? "field",
        sort_order: nextSortOrder(data, input.parentId),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAP_QUERY_KEY }),
    onError: (e: Error) => toast.error(e.message || "Failed to add node"),
  });
}

export function useAddSibling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { siblingId: string; title: string; category?: string | null }) => {
      const data = qc.getQueryData<LoadedMap | null>(MAP_QUERY_KEY);
      if (!data) throw new Error("Map not loaded");
      const sibling = data.byId[input.siblingId];
      if (!sibling) throw new Error("Sibling not found");
      return insertNode({
        map_id: data.map.id,
        parent_id: sibling.parent_id,
        title: input.title,
        category: input.category ?? sibling.category ?? "field",
        sort_order: siblingSortOrderAfter(data, input.siblingId),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: MAP_QUERY_KEY }),
    onError: (e: Error) => toast.error(e.message || "Failed to add node"),
  });
}

export function useUpdateNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<MapNode> }) =>
      updateNode(input.id, input.patch),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: MAP_QUERY_KEY });
      const prev = qc.getQueryData<LoadedMap | null>(MAP_QUERY_KEY);
      if (prev) {
        const nodes = prev.nodes.map((n) =>
          n.id === input.id ? { ...n, ...input.patch } : n
        );
        const { assemble } = await import("./mapApi");
        qc.setQueryData(MAP_QUERY_KEY, assemble(prev.map, nodes));
      }
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(MAP_QUERY_KEY, ctx.prev);
      toast.error(e.message || "Failed to save");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: MAP_QUERY_KEY }),
  });
}

export function useDeleteNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deleteNode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MAP_QUERY_KEY }),
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}
