import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { ItemsTable } from "@/components/items/ItemsTable";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import type { Item } from "@/lib/itemsApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/room/$roomId")({
  head: () => ({ meta: [{ title: "Room — Project Map" }] }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = useParams({ from: "/_authenticated/room/$roomId" });
  const { data, isLoading, error } = useItemsData();
  const [editing, setEditing] = useState<Item | null>(null);

  const room = data?.roomById[roomId] ?? null;

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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Room:</span>
            {data.rooms.map((r) => (
              <Link
                key={r.id}
                to="/room/$roomId"
                params={{ roomId: r.id }}
                className={cn(
                  "rounded border px-2 py-1 text-sm transition-colors",
                  r.id === roomId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-accent",
                  !r.active && "opacity-60",
                )}
              >
                {r.name}
              </Link>
            ))}
          </div>
          {!room ? (
            <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
              Room not found.
            </div>
          ) : (
            <>
              <h2 className="mb-3 font-display text-lg font-semibold">{room.name} — all categories</h2>
              {data.categories.map((c) => {
                const items = data.items
                  .filter((i) => i.room_id === room.id && i.category_id === c.id)
                  .sort((a, b) => (a.delivery_date ?? "9999").localeCompare(b.delivery_date ?? "9999"));
                if (items.length === 0) return null;
                return (
                  <div key={c.id} className="mb-6">
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {c.label}
                    </h3>
                    <ItemsTable items={items} data={data} onEdit={setEditing} showRoom={false} showCategory={false} />
                  </div>
                );
              })}
              {data.items.filter((i) => i.room_id === room.id).length === 0 && (
                <div className="rounded-md border border-dashed p-10 text-center text-muted-foreground">
                  No items in this room yet.
                </div>
              )}
            </>
          )}
          <ItemDrawer
            item={editing}
            data={data}
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
          />
        </div>
      )}
    </AppShell>
  );
}
