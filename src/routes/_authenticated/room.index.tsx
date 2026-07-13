import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, Loader2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import heroAsset from "@/assets/hero-atelier.jpg.asset.json";
import { useItemsData } from "@/lib/useItemsData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/room/")({
  head: () => ({ meta: [{ title: "Rooms — Project Map" }] }),
  component: RoomPicker,
});

function RoomPicker() {
  const { data, isLoading } = useItemsData();
  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-6 border-b border-[color:var(--rule-soft)] pb-5">
            <div className="editorial-eyebrow mb-2">Room by room</div>
            <div className="flex items-center gap-3">
              <Home className="h-6 w-6 text-[color:var(--accent-brass)]" strokeWidth={1.25} />
              <h1 className="font-display text-3xl tracking-tight">Rooms</h1>
            </div>
          </div>

          {isLoading && (
            <div className="text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {data && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.rooms.map((r) => {
                const n = data.items.filter((i) => i.room_id === r.id).length;
                return (
                  <Link
                    key={r.id}
                    to="/room/$roomId"
                    params={{ roomId: r.id }}
                    className={cn(
                      "group relative overflow-hidden rounded-md border border-[color:var(--rule-soft)] bg-card shadow-[var(--shadow-cell)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-editorial)]",
                      !r.active && "opacity-70",
                    )}
                  >
                    <div className="relative h-28 overflow-hidden">
                      <img
                        src={heroAsset.url}
                        alt=""
                        aria-hidden
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(43,36,29,0.15) 0%, rgba(43,36,29,0.75) 100%)",
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                        <span className="font-display text-lg leading-tight text-[color:var(--cream)]">
                          {r.name}
                        </span>
                        <span
                          className="serif-num text-lg"
                          style={{ color: "var(--accent-brass-soft)" }}
                        >
                          {n || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-[11px] text-muted-foreground">
                      <span>{r.active ? "Active" : "Inactive"}</span>
                      <span className="font-medium text-[color:var(--walnut)] group-hover:text-[color:var(--accent-brass)]">
                        Open →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
