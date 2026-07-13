import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Printer } from "lucide-react";
import type { Item, LoadedData, Room } from "@/lib/itemsApi";
import { toast } from "sonner";
import { useCurrentProfile } from "@/lib/useCurrentProfile";

/**
 * Contractor directions: what the contractor does, orders (with vendor cost when
 * he is the buyer), and where things get delivered. No client-facing money.
 */
export function ContractorDirections({
  room,
  items,
  data,
}: {
  room: Room;
  items: Item[];
  data: LoadedData;
}) {
  const { data: profile } = useCurrentProfile();
  const canSeeCost = (profile?.role?.money_visibility ?? "none") === "full";
  const ref = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return items.filter(
      (i) =>
        i.room_id === room.id &&
        i.status !== "option" &&
        ((i.ordered_by && data.personById[i.ordered_by]) || (i.design_placement ?? "").trim()),
    );
  }, [items, room.id, data.personById]);

  const asText = () => {
    const lines: string[] = [];
    lines.push(`Directions — ${room.name}`);
    if (room.plan_name) lines.push(`Plan: ${room.plan_name}`);
    lines.push("");
    for (const i of rows) {
      const orderer = i.ordered_by ? data.personById[i.ordered_by] : null;
      const vendor = i.vendor_id ? data.vendorById[i.vendor_id] : null;
      const contractorOrders = orderer && /contractor|gc/i.test(orderer.role ?? "");
      lines.push(`• ${i.title}${i.sku ? ` [${i.sku}]` : ""}`);
      if (i.design_placement) lines.push(`  Placement: ${i.design_placement}`);
      if (contractorOrders) {
        lines.push(
          `  Contractor to order${vendor ? ` from ${vendor.name}` : ""}${
            canSeeCost && i.gad_cost != null ? ` — cost $${i.gad_cost.toLocaleString()}` : ""
          }`,
        );
      } else if (orderer) {
        lines.push(`  Ordered by: ${orderer.name}${vendor ? ` (via ${vendor.name})` : ""}`);
      }
      if (i.delivery_address) {
        lines.push(
          `  Deliver to: ${i.delivery_address}${i.delivery_address_pending ? " (PENDING)" : ""}`,
        );
      }
      if (i.delivery_date) lines.push(`  On: ${i.delivery_date}`);
      lines.push("");
    }
    return lines.join("\n");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(asText());
    toast.success("Directions copied.");
  };

  const print = () => {
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) return;
    w.document.write(
      `<pre style="font-family: 'Libre Franklin', system-ui; padding:32px; white-space:pre-wrap;">${asText()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="mb-6 rounded-md border border-[color:var(--rule-soft)] bg-card">
      <div className="flex items-center justify-between border-b border-[color:var(--rule-soft)] px-4 py-3">
        <div>
          <div className="label-micro">Contractor directions</div>
          <div className="text-xs text-muted-foreground">
            What to do and what to order for this room. No client pricing.
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            <Copy className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} /> Copy
          </Button>
          <Button size="sm" variant="outline" onClick={print}>
            <Printer className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} /> Print
          </Button>
        </div>
      </div>
      <div ref={ref} className="divide-y divide-[color:var(--rule-soft)]">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nothing to direct yet. Add a placement note or assign an orderer.
          </div>
        ) : (
          rows.map((i) => {
            const orderer = i.ordered_by ? data.personById[i.ordered_by] : null;
            const vendor = i.vendor_id ? data.vendorById[i.vendor_id] : null;
            const contractorOrders = orderer && /contractor|gc/i.test(orderer.role ?? "");
            return (
              <div key={i.id} className="grid grid-cols-[1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{i.title}</div>
                  {i.sku && (
                    <div className="num-tabular text-xs text-muted-foreground">{i.sku}</div>
                  )}
                  {i.design_placement && (
                    <div className="mt-1 text-xs text-muted-foreground">{i.design_placement}</div>
                  )}
                </div>
                <div className="text-xs">
                  {contractorOrders ? (
                    <>
                      <div className="font-medium">Contractor orders</div>
                      {vendor && <div>from {vendor.name}</div>}
                      {canSeeCost && i.gad_cost != null && (
                        <div className="num-tabular text-muted-foreground">
                          Cost ${i.gad_cost.toLocaleString()}
                        </div>
                      )}
                    </>
                  ) : orderer ? (
                    <div>
                      Ordered by <span className="font-medium">{orderer.name}</span>
                      {vendor && <span className="text-muted-foreground"> · {vendor.name}</span>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="text-xs">
                  {i.delivery_address ? (
                    <div>
                      {i.delivery_address}
                      {i.delivery_address_pending && (
                        <span className="ml-1 text-[color:var(--primary)]">(pending)</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No address</span>
                  )}
                  {i.delivery_date && (
                    <div className="num-tabular text-muted-foreground">{i.delivery_date}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
