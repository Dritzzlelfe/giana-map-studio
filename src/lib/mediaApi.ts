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
