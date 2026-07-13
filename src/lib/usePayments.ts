import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createPayment,
  deletePayment,
  fetchPaymentsForItem,
  updatePayment,
  type NewPayment,
  type Payment,
} from "./paymentsApi";

export const paymentsQK = (itemId: string) => ["payments", itemId] as const;

export function usePaymentsForItem(itemId: string | null | undefined) {
  return useQuery({
    queryKey: paymentsQK(itemId ?? ""),
    queryFn: () => fetchPaymentsForItem(itemId as string),
    enabled: !!itemId,
  });
}

export function useCreatePayment(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: NewPayment) => createPayment(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentsQK(itemId) }),
    onError: (e: Error) => toast.error(`Couldn't add payment: ${e.message}`),
  });
}


export function useUpdatePayment(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Payment> }) => updatePayment(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentsQK(itemId) }),
    onError: (e: Error) => toast.error(`Couldn't update payment: ${e.message}`),
  });
}

export function useDeletePayment(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentsQK(itemId) }),
    onError: (e: Error) => toast.error(`Couldn't delete payment: ${e.message}`),
  });
}

// Derived figures — computed, never stored.
export type PaymentDerived = {
  clientDueOnDelivery: number | null;
  gadOwesVendor: number | null;
  invoicedToClient: number | null;
  hasMasked: boolean;
};

export function derivePaymentTotals(
  payments: Payment[],
  itemDeliveryDate: string | null,
): PaymentDerived {
  // Golden rule: unconfirmed/dismissed payments never enter any total.
  const src = payments.filter((p) => p.confirmed && !p.dismissed);
  let hasMasked = false;
  const each = (arr: Payment[]) => {
    let sum = 0;
    let any = false;

    for (const p of arr) {
      if (p.amount == null) {
        hasMasked = true;
        continue;
      }
      sum += Number(p.amount);
      any = true;
    }
    return any ? sum : 0;
  };
  const clientDueOnDelivery = each(
    src.filter(
      (p) =>
        p.direction === "client_to_gad" &&
        p.state !== "paid" &&
        itemDeliveryDate != null &&
        p.due_date === itemDeliveryDate,
    ),
  );
  const gadOwesVendor = each(
    src.filter((p) => p.direction === "gad_to_vendor" && p.state !== "paid"),
  );
  const invoicedToClient = each(src.filter((p) => p.direction === "client_to_gad"));

  return { clientDueOnDelivery, gadOwesVendor, invoicedToClient, hasMasked };
}
