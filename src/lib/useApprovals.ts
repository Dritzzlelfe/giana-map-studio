import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createApproval,
  fetchAllApprovals,
  fetchApprovalsForItem,
  type Approval,
} from "./approvalsApi";
import { updateItem } from "./itemsApi";
import { ITEMS_QK } from "./useItemsData";

export const approvalsQK = ["approvals"] as const;
export const itemApprovalsQK = (itemId: string) => ["approvals", "item", itemId] as const;

export function useAllApprovals() {
  return useQuery({ queryKey: approvalsQK, queryFn: fetchAllApprovals });
}

export function useApprovalsForItem(itemId: string | null | undefined) {
  return useQuery({
    queryKey: itemApprovalsQK(itemId ?? ""),
    queryFn: () => fetchApprovalsForItem(itemId as string),
    enabled: !!itemId,
  });
}

// Records an approval AND advances the item's lifecycle in a single gesture.
// Never overwrites: it inserts a fresh row every time.
export function useRecordApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      mode: Approval["mode"];
      decidedBy?: string | null; // people.id
      loggedBy?: string | null; // profiles.id (self, for verbal_logged)
      decidedAt?: string; // ISO
      note?: string | null;
      advanceTo?: string; // new lifecycle stage; skip on decline
    }) => {
      await createApproval({
        item_id: input.itemId,
        mode: input.mode,
        decided_by: input.decidedBy ?? null,
        logged_by: input.loggedBy ?? null,
        decided_at: input.decidedAt ?? new Date().toISOString(),
        note: input.note ?? null,
      });
      if (input.advanceTo) {
        await updateItem(input.itemId, { status: input.advanceTo });
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: itemApprovalsQK(vars.itemId) });
      qc.invalidateQueries({ queryKey: approvalsQK });
      qc.invalidateQueries({ queryKey: ITEMS_QK });
    },
    onError: (e: Error) => toast.error(`Couldn't record approval: ${e.message}`),
  });
}
