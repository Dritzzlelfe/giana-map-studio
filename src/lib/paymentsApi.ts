import { supabase } from "@/integrations/supabase/client";

export type PaymentDirection = "client_to_gad" | "gad_to_vendor";
export type PaymentState = "paid" | "due" | "reserved";
export type PaymentSource = "manual" | "reconciliation_import" | "reconciliation_derived";

export type Payment = {
  id: string;
  item_id: string | null;
  amount: number | null; // masked → null
  direction: PaymentDirection;
  state: PaymentState;
  due_date: string | null;
  phase_id: string | null;
  // Free-text audit trail: phase-move history and manual notes.
  // Read from base `payments` table (not surfaced by payments_visible).
  notes: string | null;
  // M4-bis reconciliation fields (non-money, merged from base table).
  vendor_id: string | null;
  invoice_num: string | null;
  description: string | null;
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  source: PaymentSource | null;
  dismissed: boolean;
  created_at: string;
  updated_at: string;
};

// Non-money columns pulled from base `payments`. `amount` is READ-ONLY through
// the masking view — never merged from base (authenticated has no SELECT on it).
const BASE_META_COLS =
  "id, notes, vendor_id, invoice_num, description, confirmed, confirmed_by, confirmed_at, source, dismissed";

type BaseMeta = {
  id: string;
  notes: string | null;
  vendor_id: string | null;
  invoice_num: string | null;
  description: string | null;
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  source: PaymentSource | null;
  dismissed: boolean;
};

function mergeMeta(visible: unknown[], base: BaseMeta[]): Payment[] {
  const byId = new Map<string, BaseMeta>(base.map((x) => [x.id, x]));
  return (visible as Payment[]).map((p) => {
    const m = byId.get(p.id);
    return {
      ...p,
      notes: m?.notes ?? null,
      vendor_id: m?.vendor_id ?? null,
      invoice_num: m?.invoice_num ?? null,
      description: m?.description ?? null,
      confirmed: m?.confirmed ?? false,
      confirmed_by: m?.confirmed_by ?? null,
      confirmed_at: m?.confirmed_at ?? null,
      source: m?.source ?? null,
      dismissed: m?.dismissed ?? false,
    };
  });
}

// READ money through the masking view; merge non-money metadata from base.
export async function fetchPaymentsForItem(itemId: string): Promise<Payment[]> {
  const [visible, base] = await Promise.all([
    supabase
      .from("payments_visible" as never)
      .select("*")
      .eq("item_id", itemId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("payments").select(BASE_META_COLS).eq("item_id", itemId),
  ]);
  if (visible.error) throw visible.error;
  if (base.error) throw base.error;
  return mergeMeta((visible.data ?? []) as unknown[], (base.data ?? []) as unknown as BaseMeta[]);
}

// Global fetch for the cashflow view. Same masking + metadata merge pattern.
export async function fetchAllPayments(): Promise<Payment[]> {
  const [visible, base] = await Promise.all([
    supabase
      .from("payments_visible" as never)
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("payments").select(BASE_META_COLS),
  ]);
  if (visible.error) throw visible.error;
  if (base.error) throw base.error;
  return mergeMeta((visible.data ?? []) as unknown[], (base.data ?? []) as unknown as BaseMeta[]);
}


// WRITE to the base table (RLS enforces cashflow edit right).
// Callers pass an ordinary Partial-of-Payment; createPayment lets DB defaults
// (confirmed=false, dismissed=false) fill in anything not provided.
export type NewPayment = Partial<Payment> & Pick<Payment, "direction" | "state">;

export async function createPayment(patch: NewPayment): Promise<void> {
  const { error } = await supabase.from("payments").insert(patch as never);
  if (error) throw error;
}

export async function updatePayment(id: string, patch: Partial<Payment>): Promise<void> {
  const { error } = await supabase.from("payments").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}

// Bulk confirm: writes {confirmed, confirmed_by, confirmed_at, state, ...patch}.
export async function confirmPayments(
  ids: string[],
  patch: Partial<Payment>,
  confirmedBy: string,
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("payments")
    .update({
      ...patch,
      confirmed: true,
      confirmed_by: confirmedBy,
      confirmed_at: new Date().toISOString(),
    } as never)
    .in("id", ids);
  if (error) throw error;
}

