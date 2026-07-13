// Item lifecycle: option → approved → committed → to_order → ordered → delivered → installed
// on_hold available at any point. Stored in items.status as text; UI drives the flow.
import type { Item } from "./itemsApi";

export type LifecycleStage =
  | "option"
  | "approved"
  | "committed"
  | "to_order"
  | "ordered"
  | "delivered"
  | "installed"
  | "on_hold";

export const LIFECYCLE_STAGES: { id: LifecycleStage; label: string }[] = [
  { id: "option", label: "Option" },
  { id: "approved", label: "Approved" },
  { id: "committed", label: "Committed" },
  { id: "to_order", label: "To order" },
  { id: "ordered", label: "Ordered" },
  { id: "delivered", label: "Delivered" },
  { id: "installed", label: "Installed" },
];

export const ON_HOLD: LifecycleStage = "on_hold";

export function stageIndex(status: string | null | undefined): number {
  return LIFECYCLE_STAGES.findIndex((s) => s.id === status);
}

// Client-side guard. DB stays permissive. Returns error message or null.
export function checkTransition(item: Item, next: LifecycleStage): string | null {
  if (next === "ordered" && !item.vendor_id) {
    return "Cannot mark ordered without a vendor.";
  }
  if (next === "installed") {
    const addr = (item.delivery_address ?? "").trim();
    if (!addr) return "Cannot mark installed without a delivery address.";
    if (item.delivery_address_pending)
      return "Delivery address is pending — confirm it before installing.";
  }
  return null;
}

export function isOption(status: string | null | undefined): boolean {
  return status === "option";
}

export function isCommitted(status: string | null | undefined): boolean {
  return status != null && status !== "option" && status !== "on_hold";
}
