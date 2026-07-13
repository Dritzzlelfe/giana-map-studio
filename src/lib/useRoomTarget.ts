import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Read masked room targets. Returns null when hidden for the role.
export function useRoomTarget(roomId: string | null | undefined) {
  return useQuery({
    queryKey: ["room-target", roomId ?? ""],
    queryFn: async (): Promise<{ target_amount: number | null } | null> => {
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: { target_amount: number | null } | null;
                error: { message: string } | null;
              }>;
            };
          };
        };
      };
      const { data, error } = await client
        .from("room_targets_visible")
        .select("target_amount")
        .eq("room_id", roomId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId,
  });
}
