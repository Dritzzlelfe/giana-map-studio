import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ITEMS_QK } from "./useItemsData";
import type { Room } from "./itemsApi";

export type RoomHeaderPatch = Partial<
  Pick<Room, "name" | "plan_name" | "ceiling_height" | "width" | "length" | "notes">
> & {
  target_amount?: number | null; // writes to base rooms.target_amount (edit right required)
};

export async function updateRoom(id: string, patch: RoomHeaderPatch): Promise<void> {
  const { error } = await supabase.from("rooms").update(patch).eq("id", id);
  if (error) throw error;
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RoomHeaderPatch }) => updateRoom(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_QK }),
    onError: (e: Error) => toast.error(`Couldn't update room: ${e.message}`),
  });
}
