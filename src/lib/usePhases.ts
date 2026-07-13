// Phases: read directly from base `phases` (no money columns to mask).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Phase = {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  axis: "construction" | "ffe";
};

export const PHASES_QK = ["phases"] as const;

export function usePhases() {
  return useQuery({
    queryKey: PHASES_QK,
    queryFn: async (): Promise<Phase[]> => {
      const { data, error } = await supabase
        .from("phases")
        .select("id, project_id, name, sort_order, axis")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Phase[];
    },
  });
}
