// Batch fetch of room targets via the role-aware masking view.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ROOM_TARGETS_QK = ["room-targets-all"] as const;

export function useAllRoomTargets() {
  return useQuery({
    queryKey: ROOM_TARGETS_QK,
    queryFn: async (): Promise<Map<string, number | null>> => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => { select: (c: string) => Promise<{ data: { room_id: string; target_amount: number | null }[] | null; error: { message: string } | null }> };
      })
        .from("room_targets_visible")
        .select("room_id, target_amount");
      if (error) throw error;
      const m = new Map<string, number | null>();
      for (const r of data ?? []) m.set(r.room_id, r.target_amount);
      return m;
    },
  });
}
