import { supabase } from "@/integrations/supabase/client";

export type Room = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  plan_name: string | null;
  ceiling_height: string | null;
  width: string | null;
  length: string | null;
  notes: string | null;
};


export type Category = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
};

export type Vendor = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_info: string | null;
  trade_account_no: string | null;
  account_status: string;
  notes: string | null;
};

export type Person = {
  id: string;
  name: string;
  role: string | null;
  notes: string | null;
};

export type Item = {
  id: string;
  room_id: string | null;
  category_id: string | null;
  vendor_id: string | null;
  title: string;
  description: string | null;
  sku: string | null;
  design_placement: string | null;
  qty_needed: number | null;
  qty_ordered: number | null;
  status: string | null;
  priority: string | null;
  ordered_by: string | null;
  installer: string | null;
  lead_time: string | null;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_address_pending: boolean;
  storage_name: string | null;

  storage_address: string | null;
  logistics_location: string | null;
  option_source: string | null;
  gad_cost: number | null;
  client_price: number | null;
  client_paid_gad: boolean;
  gad_paid_vendor: boolean;
  balance_due_on_delivery: number | null;
  created_at: string;
  updated_at: string;
};

export type LoadedData = {
  rooms: Room[];
  categories: Category[];
  vendors: Vendor[];
  people: Person[];
  items: Item[];
  roomById: Record<string, Room>;
  categoryById: Record<string, Category>;
  categoryByKey: Record<string, Category>;
  vendorById: Record<string, Vendor>;
  personById: Record<string, Person>;
};

// Non-money columns of items — the ONLY columns readable directly from
// public.items by authenticated. Money columns are read through items_visible.
const ITEM_WRITE_RETURN_COLS =
  "id, room_id, category_id, vendor_id, product_id, title, description, sku, design_placement, qty_needed, qty_ordered, status, priority, ordered_by, installer, lead_time, delivery_address, delivery_address_pending, delivery_date, storage_name, storage_address, logistics_location, option_source, client_paid_gad, gad_paid_vendor, created_at, updated_at";


export async function loadAll(): Promise<LoadedData> {
  const [r, c, v, p, i] = await Promise.all([
    // Exclude money column `target_amount` — authenticated has no SELECT on it;
    // it is exposed only through `room_targets_visible` with role-aware masking.
    supabase
      .from("rooms")
      .select("*")
      .order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("vendors").select("*").order("name"),
    supabase.from("people").select("*").order("name"),
    // Read items through the role-aware view so money columns are nulled for
    // roles without full money visibility.
    (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> })
      .from("items_visible")
      .select("*")
      .order("created_at"),
  ]);
  for (const x of [r, c, v, p, i]) if (x.error) throw x.error;
  const rooms = (r.data ?? []) as Room[];
  const categories = (c.data ?? []) as Category[];
  const vendors = (v.data ?? []) as Vendor[];
  const people = (p.data ?? []) as Person[];
  const items = (i.data ?? []) as Item[];
  return {
    rooms,
    categories,
    vendors,
    people,
    items,
    roomById: Object.fromEntries(rooms.map((x) => [x.id, x])),
    categoryById: Object.fromEntries(categories.map((x) => [x.id, x])),
    categoryByKey: Object.fromEntries(categories.map((x) => [x.key, x])),
    vendorById: Object.fromEntries(vendors.map((x) => [x.id, x])),
    personById: Object.fromEntries(people.map((x) => [x.id, x])),
  };
}

export async function createItem(patch: Partial<Item> & { title: string }): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    // project_id and product_id are auto-filled by a BEFORE INSERT trigger
    // (items_autofill_context), so the generated types' required fields
    // don't apply at the app layer.
    .insert(patch as never)
    .select(ITEM_WRITE_RETURN_COLS)
    .single();
  if (error) throw error;
  return {
    gad_cost: null,
    client_price: null,
    balance_due_on_delivery: null,
    ...(data as object),
  } as Item;
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .update(patch)
    .eq("id", id)
    .select(ITEM_WRITE_RETURN_COLS)
    .single();
  if (error) throw error;
  return {
    gad_cost: null,
    client_price: null,
    balance_due_on_delivery: null,
    ...(data as object),
  } as Item;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

export async function createVendor(patch: Partial<Vendor> & { name: string }): Promise<Vendor> {
  const { data, error } = await supabase.from("vendors").insert(patch).select("*").single();
  if (error) throw error;
  return data as Vendor;
}

export async function updateVendor(id: string, patch: Partial<Vendor>): Promise<Vendor> {
  const { data, error } = await supabase
    .from("vendors")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Vendor;
}

export async function createPerson(patch: Partial<Person> & { name: string }): Promise<Person> {
  const { data, error } = await supabase.from("people").insert(patch).select("*").single();
  if (error) throw error;
  return data as Person;
}

export const STATUSES = [
  { id: "option", label: "Option" },
  { id: "to_spec", label: "To spec" },
  { id: "to_order", label: "To order" },
  { id: "ordered", label: "Ordered" },
  { id: "delivered", label: "Delivered" },
  { id: "on_hold", label: "On hold" },
] as const;

export const PRIORITIES = [
  { id: "asap", label: "ASAP" },
  { id: "high", label: "High" },
  { id: "normal", label: "Normal" },
] as const;

export const LOGISTICS_LOCATIONS = [
  { id: "france_ship", label: "France ship" },
  { id: "mississippi_truck", label: "Mississippi truck" },
  { id: "mississippi_warehouse", label: "Mississippi warehouse" },
  { id: "gad_warehouse", label: "GAD warehouse" },
  { id: "brownstone_movers", label: "Brownstone Movers" },
  { id: "third_party_storage", label: "Third-party storage" },
  { id: "residence", label: "Residence" },
  { id: "ny", label: "NY" },
  { id: "na", label: "N/A" },
] as const;

export type StatusRoll = "empty" | "all_delivered" | "in_motion" | "needs_action";

// Options are ideas being weighed — excluded from the red/amber/green roll-up.
export function rollupStatus(items: Item[]): StatusRoll {
  const committed = items.filter((i) => i.status !== "option");
  if (committed.length === 0) return "empty";
  if (committed.every((i) => i.status === "delivered")) return "all_delivered";
  if (
    committed.some(
      (i) => i.status === "on_hold" || i.status === "to_order" || i.status === "to_spec",
    )
  )
    return "needs_action";
  return "in_motion";
}

export function countOptions(items: Item[]): number {
  return items.filter((i) => i.status === "option").length;
}
