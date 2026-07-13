// Budgets: read money via `budgets_visible`, merge non-money `scope`
// from base `budgets`. Writes hit base table (guarded by RLS + enforce_money_write).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type BudgetScope = "project" | "roof_deck";

export type Budget = {
  id: string;
  project_id: string;
  scope: BudgetScope;
  construction_budget: number | null; // masked when money_visibility != 'full'
  ffe_budget: number | null; // masked when money_visibility == 'none'
  per_unit_rates: Record<
    string,
    { label: string; unit: string; rate: number }
  > | null; // masked when != 'full'
  created_at: string;
  updated_at: string;
};

export const BUDGETS_QK = ["budgets"] as const;

export async function fetchBudgets(): Promise<Budget[]> {
  const [visible, base] = await Promise.all([
    supabase.from("budgets_visible" as never).select("*"),
    supabase.from("budgets").select("id, scope, project_id"),
  ]);
  if (visible.error) throw visible.error;
  if (base.error) throw base.error;
  const scopeById = new Map<string, { scope: BudgetScope; project_id: string }>(
    ((base.data ?? []) as { id: string; scope: BudgetScope; project_id: string }[]).map((x) => [
      x.id,
      { scope: x.scope, project_id: x.project_id },
    ]),
  );
  return ((visible.data ?? []) as Omit<Budget, "scope">[]).map((b) => ({
    ...b,
    scope: scopeById.get(b.id)?.scope ?? "project",
    project_id: scopeById.get(b.id)?.project_id ?? b.project_id,
  })) as Budget[];
}

export function useBudgets() {
  return useQuery({ queryKey: BUDGETS_QK, queryFn: fetchBudgets });
}

export type BudgetPatch = Partial<Pick<Budget, "construction_budget" | "ffe_budget" | "per_unit_rates">>;

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      project_id: string;
      scope: BudgetScope;
      patch: BudgetPatch;
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("budgets")
          .update(input.patch as never)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("budgets")
          .insert({
            project_id: input.project_id,
            scope: input.scope,
            ...(input.patch as object),
          } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_QK }),
    onError: (e: Error) => toast.error(`Couldn't save budget: ${e.message}`),
  });
}
