import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";

export const Route = createFileRoute("/_authenticated/room/")({
  head: () => ({ meta: [{ title: "Room — Project Map" }] }),
  component: RoomPicker,
});

function RoomPicker() {
  const { data, isLoading } = useItemsData();
  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-6">
        <h2 className="mb-1 font-display text-lg font-semibold">Room view</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Pick a room to see all of its items grouped by category.
        </p>
        {isLoading && (
          <div className="text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {data && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rooms.map((r) => {
              const n = data.items.filter((i) => i.room_id === r.id).length;
              return (
                <Link
                  key={r.id}
                  to="/room/$roomId"
                  params={{ roomId: r.id }}
                  className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className={r.active ? "font-medium" : "font-medium opacity-60"}>
                    {r.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{n}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
