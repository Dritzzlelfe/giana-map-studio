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
  // Free-text audit trail: phase-move history and manual notes.
  // Read from base `payments` table (not surfaced by payments_visible).
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// READ money through the masking view; merge non-money `notes` from base.
export async function fetchPaymentsForItem(itemId: string): Promise<Payment[]> {
  const [visible, base] = await Promise.all([
    supabase
      .from("payments_visible" as never)
      .select("*")
      .eq("item_id", itemId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("payments").select("id, notes").eq("item_id", itemId),
  ]);
  if (visible.error) throw visible.error;
  if (base.error) throw base.error;
  const notesById = new Map<string, string | null>(
    ((base.data ?? []) as { id: string; notes: string | null }[]).map((x) => [x.id, x.notes]),
  );
  return ((visible.data ?? []) as Payment[]).map((p) => ({
    ...p,
    notes: notesById.get(p.id) ?? null,
  }));
}

// Global fetch for the cashflow view. Same masking + notes merge pattern.
export async function fetchAllPayments(): Promise<Payment[]> {
  const [visible, base] = await Promise.all([
    supabase
      .from("payments_visible" as never)
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("payments").select("id, notes"),
  ]);
  if (visible.error) throw visible.error;
  if (base.error) throw base.error;
  const notesById = new Map<string, string | null>(
    ((base.data ?? []) as { id: string; notes: string | null }[]).map((x) => [x.id, x.notes]),
  );
  return ((visible.data ?? []) as Payment[]).map((p) => ({
    ...p,
    notes: notesById.get(p.id) ?? null,
  }));
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
