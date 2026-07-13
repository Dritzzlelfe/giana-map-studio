// Global payments fetch for the cashflow view.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchAllPayments,
  updatePayment,
  createPayment,
  type Payment,
} from "./paymentsApi";
import { paymentsQK } from "./usePayments";

export const ALL_PAYMENTS_QK = ["payments-all"] as const;

export function useAllPayments() {
  return useQuery({ queryKey: ALL_PAYMENTS_QK, queryFn: fetchAllPayments });
}

export function useUpdatePaymentGlobal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, itemId }: { id: string; patch: Partial<Payment>; itemId?: string }) =>
      updatePayment(id, patch).then(() => ({ itemId })),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ALL_PAYMENTS_QK });
      if (res.itemId) qc.invalidateQueries({ queryKey: paymentsQK(res.itemId) });
    },
    onError: (e: Error) => toast.error(`Couldn't update payment: ${e.message}`),
  });
}

export function useCreatePaymentGlobal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Omit<Payment, "id" | "created_at" | "updated_at">) => createPayment(patch),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ALL_PAYMENTS_QK });
      qc.invalidateQueries({ queryKey: paymentsQK(vars.item_id) });
    },
    onError: (e: Error) => toast.error(`Couldn't add payment: ${e.message}`),
  });
}
