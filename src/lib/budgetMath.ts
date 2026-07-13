// Single source of truth for room committed / options totals.
// M2 is simple item-price sum; M3 will extend this to layer per-unit rates
// from budgets.per_unit_rates. Do not inline this math elsewhere.
import type { Item } from "./itemsApi";
import { isCommitted, isOption } from "./lifecycle";

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
