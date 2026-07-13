import { supabase } from "@/integrations/supabase/client";

export type PaymentDirection = "client_to_gad" | "gad_to_vendor";
export type PaymentState = "paid" | "due" | "reserved";

export type Payment = {
  id: string;
  item_id: string;
  amount: number | null; // masked → null
  direction: PaymentDirection;
  state: PaymentState;
  due_date: string | null;
  phase_id: string | null;
  created_at: string;
  updated_at: string;
};

// READ through the masking view.
export async function fetchPaymentsForItem(itemId: string): Promise<Payment[]> {
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }
  )
    .from("payments_visible")
    .select("*")
    .eq("item_id", itemId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

// WRITE to the base table (RLS enforces cashflow edit right).
export async function createPayment(
  patch: Omit<Payment, "id" | "created_at" | "updated_at">,
): Promise<void> {
  const { error } = await supabase.from("payments").insert(patch);
  if (error) throw error;
}

export async function updatePayment(id: string, patch: Partial<Payment>): Promise<void> {
  const { error } = await supabase.from("payments").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}
