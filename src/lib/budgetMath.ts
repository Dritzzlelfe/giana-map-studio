// Single source of truth for money math: room/project spend, budget rows,
// per-unit suggestions, cashflow pivot. Screens read from here — do not
// duplicate this arithmetic in components.
import type { Item, Category } from "./itemsApi";
import type { Payment } from "./paymentsApi";
import { isCommitted, isOption } from "./lifecycle";

export type Axis = "construction" | "ffe";

export type RoomSpend = {
  committed: number | null; // null = masked (some money value hidden)
  options: number | null;
  committedCount: number;
  optionsCount: number;
  hasMaskedCommitted: boolean;
  hasMaskedOptions: boolean;
};

function sumClientPrice(items: Item[]): { total: number; masked: boolean } {
  let total = 0;
  let masked = false;
  for (const it of items) {
    if (it.client_price == null) {
      masked = true;
      continue;
    }
    total += Number(it.client_price);
  }
  return { total, masked };
}

export function roomSpend(items: Item[], roomId: string): RoomSpend {
  const scoped = items.filter((i) => i.room_id === roomId);
  return spendOf(scoped);
}

function spendOf(scoped: Item[]): RoomSpend {
  const committed = scoped.filter((i) => isCommitted(i.status));
  const options = scoped.filter((i) => isOption(i.status));
  const c = sumClientPrice(committed);
  const o = sumClientPrice(options);
  return {
    committed: committed.length ? c.total : 0,
    options: options.length ? o.total : 0,
    committedCount: committed.length,
    optionsCount: options.length,
    hasMaskedCommitted: c.masked,
    hasMaskedOptions: o.masked,
  };
}

export function gap(target: number | null, committed: number | null): number | null {
  if (target == null || committed == null) return null;
  return target - committed;
}

// Project-wide roll-up: EVERY item counts, including fees and room-less items.
export function projectSpend(items: Item[]): RoomSpend {
  return spendOf(items);
}

// Project-level (no room) items — surfaces as a "Project-wide costs" row in
// the Budget table. Fees are included by design (they roll into totals).
export function projectLevelSpend(items: Item[]): RoomSpend {
  return spendOf(items.filter((i) => i.room_id == null));
}

// Axis split. Uses categories.axis. Fees inherit their item's category axis.
// Items with no category (including project-level fees with no category) count
// as 'construction' by convention — see categories.ts comment.
export function axisOf(item: Item, byId: Record<string, Category>): Axis {
  const cat = item.category_id ? byId[item.category_id] : undefined;
  const a = cat?.axis;
  return a === "ffe" ? "ffe" : "construction";
}

export function axisSpend(
  items: Item[],
  categoriesById: Record<string, Category>,
  axis: Axis,
): RoomSpend {
  return spendOf(items.filter((i) => axisOf(i, categoriesById) === axis));
}

// Room row for the Budget module. Reuses roomSpend/gap.
export type BudgetRoomRow = {
  target: number | null;
  committed: number | null;
  options: number | null;
  gap: number | null;
  status: "empty" | "on_track" | "close" | "over";
  hasMasked: boolean;
};

export function roomBudgetRow(
  items: Item[],
  roomId: string,
  target: number | null,
  categoriesById?: Record<string, Category>,
  axis?: Axis,
): BudgetRoomRow {
  const scoped = items.filter((i) => {
    if (i.room_id !== roomId) return false;
    if (axis && categoriesById) return axisOf(i, categoriesById) === axis;
    return true;
  });
  const s = spendOf(scoped);
  const g = gap(target, s.committed);
  let status: BudgetRoomRow["status"] = "empty";
  if (target == null) status = s.committed && s.committed > 0 ? "on_track" : "empty";
  else if (g == null) status = "empty";
  else if (g < 0) status = "over";
  else if (target > 0 && g / target < 0.1) status = "close";
  else status = "on_track";
  return {
    target,
    committed: s.committed,
    options: s.options,
    gap: g,
    status,
    hasMasked: s.hasMaskedCommitted || s.hasMaskedOptions,
  };
}

// Per-unit rate suggestion. Displayed only — never applied to totals in M3.
// Hook is here so the later auto-recompute can land without touching screens.
export type PerUnitRates = Record<string, { label: string; unit: string; rate: number }>;

export function perUnitSuggestion(
  item: Item,
  rates: PerUnitRates | null | undefined,
  categoriesById: Record<string, Category>,
): { key: string; label: string; unit: string; rate: number; suggested: number | null } | null {
  if (!rates) return null;
  const cat = item.category_id ? categoriesById[item.category_id] : undefined;
  if (!cat) return null;
  const rate = rates[cat.key];
  if (!rate) return null;
  const qty = item.qty_needed ?? null;
  const suggested = qty != null ? qty * rate.rate : null;
  return { key: cat.key, label: rate.label, unit: rate.unit, rate: rate.rate, suggested };
}

// ---- Cashflow pivot ----

export type PaymentWithMeta = Payment & {
  itemTitle?: string;
  roomName?: string | null;
  phaseName?: string | null;
  phaseAxis?: Axis | null;
};

export type CashLane = { total: number; count: number; masked: boolean; payments: PaymentWithMeta[] };
export type CashCell = { column: string; clientLane: CashLane; vendorLane: CashLane };

function emptyLane(): CashLane {
  return { total: 0, count: 0, masked: false, payments: [] };
}
function push(lane: CashLane, p: PaymentWithMeta) {
  lane.payments.push(p);
  lane.count += 1;
  if (p.amount == null) lane.masked = true;
  else lane.total += Number(p.amount);
}

export type PivotAxis = "month" | "phase";

export function pivotPayments(
  payments: PaymentWithMeta[],
  axis: PivotAxis,
  phases: { id: string; name: string; sort_order: number }[],
): CashCell[] {
  const cells = new Map<string, CashCell>();
  const columnFor = (p: PaymentWithMeta): string => {
    if (axis === "month") return p.due_date ? p.due_date.slice(0, 7) : "Unscheduled";
    if (!p.phase_id) return "Unscheduled";
    const ph = phases.find((x) => x.id === p.phase_id);
    return ph?.name ?? "Unscheduled";
  };
  for (const p of payments) {
    const col = columnFor(p);
    let cell = cells.get(col);
    if (!cell) {
      cell = { column: col, clientLane: emptyLane(), vendorLane: emptyLane() };
      cells.set(col, cell);
    }
    if (p.direction === "client_to_gad") push(cell.clientLane, p);
    else push(cell.vendorLane, p);
  }
  const arr = [...cells.values()];
  if (axis === "month") {
    arr.sort((a, b) => (a.column === "Unscheduled" ? 1 : b.column === "Unscheduled" ? -1 : a.column.localeCompare(b.column)));
  } else {
    const order = new Map(phases.map((p) => [p.name, p.sort_order]));
    arr.sort(
      (a, b) => (order.get(a.column) ?? 999) - (order.get(b.column) ?? 999),
    );
  }
  return arr;
}

export function reservedTotal(payments: PaymentWithMeta[]): {
  total: number;
  count: number;
  masked: boolean;
  payments: PaymentWithMeta[];
} {
  const scoped = payments.filter((p) => p.state === "reserved");
  const lane = emptyLane();
  for (const p of scoped) push(lane, p);
  return { total: lane.total, count: lane.count, masked: lane.masked, payments: scoped };
}

export function upcomingSorted(payments: PaymentWithMeta[]): PaymentWithMeta[] {
  return [...payments]
    .filter((p) => p.state !== "paid")
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
}

// Dashboard card: this month / next month, split by lane.
export function dashboardCashCard(payments: PaymentWithMeta[], now: Date = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const thisKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const next = new Date(y, m + 1, 1);
  const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const bucket = (key: string) => {
    const client = emptyLane();
    const vendor = emptyLane();
    for (const p of payments) {
      if (!p.due_date || p.due_date.slice(0, 7) !== key || p.state === "paid") continue;
      if (p.direction === "client_to_gad") push(client, p);
      else push(vendor, p);
    }
    return { client, vendor };
  };
  return { thisMonth: bucket(thisKey), nextMonth: bucket(nextKey) };
}
