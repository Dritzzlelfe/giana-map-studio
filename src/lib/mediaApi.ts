import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MediaRow = {
  id: string;
  product_id: string | null;
  item_id: string | null;
  room_id: string | null;
  file_url: string;
  kind: "photo" | "reference" | "lookbook";
  lookbook_section: string | null;
  created_at: string;
};

export function useMediaForProduct(productId: string | null | undefined) {
  return useQuery({
    queryKey: ["media", "product", productId ?? ""],
    queryFn: async (): Promise<MediaRow[]> => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("product_id", productId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MediaRow[];
    },
    enabled: !!productId,
  });
}

export function useMediaForRoom(roomId: string | null | undefined) {
  return useQuery({
    queryKey: ["media", "room", roomId ?? ""],
    queryFn: async (): Promise<MediaRow[]> => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("room_id", roomId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MediaRow[];
    },
    enabled: !!roomId,
  });
}

// Batch-fetch the first photo per item id — used for thumbnails on list views.
export function useItemPhotoMap(itemIds: string[]) {
  const key = [...itemIds].sort().join(",");
  return useQuery({
    queryKey: ["media", "items", key],
    queryFn: async (): Promise<Record<string, string>> => {
      if (itemIds.length === 0) return {};
      const { data, error } = await supabase
        .from("media")
        .select("item_id, file_url, created_at")
        .in("item_id", itemIds)
        .eq("kind", "photo")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { item_id: string | null; file_url: string }[]) {
        if (row.item_id && !map[row.item_id]) map[row.item_id] = row.file_url;
      }
      return map;
    },
    enabled: itemIds.length > 0,
  });
}
