import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { rollupStatus, type Category, type Item, type Room } from "@/lib/itemsApi";
import { StatusDot } from "@/components/items/StatusDot";
import { CellPanel } from "@/components/items/CellPanel";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Matrix — Giana Allen Design Project Map" },
      { name: "description", content: "Rooms × categories matrix view over the project items." },
    ],
  }),
  component: MatrixPage,
});

function MatrixPage() {
  const { data, isLoading, error } = useItemsData();
  const [cell, setCell] = useState<{ room: Room; category: Category } | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    if (!data) return m;
    for (const it of data.items) {
      if (!it.room_id || !it.category_id) continue;
      const k = `${it.room_id}::${it.category_id}`;
      const arr = m.get(k) ?? [];
      arr.push(it);
      m.set(k, arr);
    }
    return m;
  }, [data]);

  return (
    <AppShell>
      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <div className="p-6 text-destructive">{(error as Error).message}</div>}
      {data && (
        <div className="flex-1 overflow-auto p-5">
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <Legend />
          </div>
          <div className="rounded-md border bg-card">
            <div className="overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr>
                    <th className="sticky left-0 z-20 border-b border-r bg-card px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      Room
                    </th>
                    {data.categories.map((c) => (
                      <th
                        key={c.id}
                        className="border-b px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground"
                      >
                        <Link
                          to="/schedule/$categoryKey"
                          params={{ categoryKey: c.key }}
                          className="hover:underline"
                        >
                          {c.label}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rooms
                    .filter((r) => r.active)
                    .map((room) => (
                      <tr key={room.id}>
                        <th className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 text-left font-medium">
                          <Link to="/room/$roomId" params={{ roomId: room.id }} className="hover:underline">
                            {room.name}
                          </Link>
                        </th>
                        {data.categories.map((c) => {
                          const items = grouped.get(`${room.id}::${c.id}`) ?? [];
                          const roll = rollupStatus(items);
                          const asap = items.some((i) => i.priority === "asap");
                          return (
                            <td key={c.id} className="border-b p-1">
                              <button
                                onClick={() => setCell({ room, category: c })}
                                className={cn(
                                  "group flex h-full w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left transition-colors",
                                  items.length > 0
                                    ? "hover:bg-accent/60"
                                    : "text-muted-foreground hover:bg-accent/40",
                                )}
                              >
                                <span className="flex items-center gap-1.5">
                                  <StatusDot roll={roll} />
                                  <span className="text-sm">{items.length || "+"}</span>
                                </span>
                                {asap && (
                                  <span className="rounded bg-rose-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-rose-800">
                                    ASAP
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {data && (
        <>
          <CellPanel
            open={!!cell}
            onOpenChange={(o) => !o && setCell(null)}
            room={cell?.room ?? null}
            category={cell?.category ?? null}
            items={
              cell
                ? data.items.filter((i) => i.room_id === cell.room.id && i.category_id === cell.category.id)
                : []
            }
            data={data}
            onEdit={(it) => setEditing(it)}
          />
          <ItemDrawer
            item={editing}
            data={data}
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
          />
        </>
      )}
    </AppShell>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-1.5"><StatusDot roll="all_delivered" /> All delivered</span>
      <span className="flex items-center gap-1.5"><StatusDot roll="in_motion" /> Ordered</span>
      <span className="flex items-center gap-1.5"><StatusDot roll="needs_action" /> To spec / order / hold</span>
      <span className="flex items-center gap-1.5"><StatusDot roll="empty" /> Empty</span>
    </div>
  );
}
