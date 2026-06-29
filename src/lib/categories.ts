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
