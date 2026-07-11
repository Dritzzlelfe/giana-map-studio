import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./StatusDot";
import type { Item, LoadedData } from "@/lib/itemsApi";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export function ItemsTable({
  items,
  data,
  onEdit,
  showRoom = true,
  showCategory = false,
}: {
  items: Item[];
  data: LoadedData;
  onEdit: (item: Item) => void;
  showRoom?: boolean;
  showCategory?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        No items.
      </div>
    );
  }
  return (
    <div className="overflow-auto rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {showRoom && <th className="px-3 py-2 text-left">Room</th>}
            {showCategory && <th className="px-3 py-2 text-left">Category</th>}
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Vendor</th>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">Qty</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Lead time</th>
            <th className="px-3 py-2 text-left">Delivery</th>
            <th className="px-3 py-2 text-left">Installer</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const room = it.room_id ? data.roomById[it.room_id] : null;
            const cat = it.category_id ? data.categoryById[it.category_id] : null;
            const vendor = it.vendor_id ? data.vendorById[it.vendor_id] : null;
            const installer = it.installer ? data.personById[it.installer] : null;
            return (
              <tr key={it.id} className="border-b last:border-0 hover:bg-accent/30">
                {showRoom && (
                  <td className="px-3 py-2">
                    {room ? (
                      <Link
                        to="/room/$roomId"
                        params={{ roomId: room.id }}
                        className="hover:underline"
                      >
                        {room.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                {showCategory && (
                  <td className="px-3 py-2">
                    {cat ? (
                      <Link
                        to="/schedule/$categoryKey"
                        params={{ categoryKey: cat.key }}
                        className="hover:underline"
                      >
                        {cat.label}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td className="px-3 py-2 font-medium">
                  <button onClick={() => onEdit(it)} className="text-left hover:underline">
                    {it.title}
                  </button>
                  {it.priority === "asap" && (
                    <span className="label-micro ml-2 !text-[9px] text-[color:var(--primary)]">
                      ASAP
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{vendor?.name ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{it.sku ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {it.qty_ordered ?? 0}/{it.qty_needed ?? "?"}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={it.status} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">{it.lead_time ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{it.delivery_date ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{installer?.name ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(it)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
