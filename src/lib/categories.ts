// Mind-map categories (labels, colors). Distinct from `public.categories`
// (item budget axes) — the map is a design/coordination tool with its own
// taxonomy.
//
// Item category axis policy — see `categories.axis` column (migration M3):
// - Fees follow their item's category axis.
// - Project-level fees (no category) count toward 'construction' by default.
// - `null` axis in the DB is treated as 'construction' by `budgetMath.axisOf`
//   so unclassified categories never silently drop out of the totals; Giana
//   can reclassify them at any time without a redeploy.
export const CATEGORY_AXIS_FALLBACK = "construction" as const;

export const CATEGORIES = [
  { id: "root", label: "Root" },
  { id: "rooms", label: "Rooms" },
  { id: "schedule", label: "Schedule" },
  { id: "trade", label: "Trade" },
  { id: "furniture", label: "Furniture" },
  { id: "kitchen", label: "Kitchen" },
  { id: "logistics", label: "Logistics" },
  { id: "budget", label: "Budget" },
  { id: "coordination", label: "Coordination" },
  { id: "data_model", label: "Data model" },
  { id: "roster", label: "Roster" },
  { id: "roadmap", label: "Roadmap" },
  { id: "deferred", label: "Deferred" },
  { id: "field", label: "Field" },
  { id: "action", label: "Action" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const STATUSES = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "blocked", label: "Blocked" },
] as const;

export const PRIORITIES = [
  { id: "asap", label: "ASAP" },
  { id: "high", label: "High" },
  { id: "normal", label: "Normal" },
] as const;

export function categoryColorVar(category: string | null | undefined) {
  const c = (category ?? "field") as CategoryId;
  return `var(--cat-${c})`;
}

export function categoryLabel(category: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === category)?.label ?? "—";
}
