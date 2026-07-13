import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Loader2, ImagePlus } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import heroAsset from "@/assets/hero-atelier.jpg.asset.json";
import { useItemsData } from "@/lib/useItemsData";
import { ItemsTable } from "@/components/items/ItemsTable";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { RoomHeader } from "@/components/room/RoomHeader";
import { BudgetStrip } from "@/components/room/BudgetStrip";
import { ContractorDirections } from "@/components/room/ContractorDirections";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { useUploadRoomImage } from "@/lib/mediaApi";
import { toast } from "sonner";
import type { Item } from "@/lib/itemsApi";
import { isOption } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/room/$roomId")({
  head: () => ({ meta: [{ title: "Room — Project Map" }] }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = useParams({ from: "/_authenticated/room/$roomId" });
  const { data, isLoading, error } = useItemsData();
  const [editing, setEditing] = useState<Item | null>(null);
  const uploadRoomImage = useUploadRoomImage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const room = data?.roomById[roomId] ?? null;
  const heroUrl = room?.image_url ?? heroAsset.url;

  return (
    <AppShell>
      {isLoading && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <div className="p-6 text-destructive">{(error as Error).message}</div>}
      {data && (
        <div className="flex-1 overflow-auto">
          {room && (
            <div className="relative h-48 overflow-hidden border-b border-[color:var(--rule-soft)]">
              <img
                src={heroUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  uploadRoomImage.mutate(
                    { roomId: room.id, file },
                    {
                      onSuccess: () => toast.success("Image mise à jour"),
                      onError: (err: Error) => toast.error(err.message),
                    },
                  );
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadRoomImage.isPending}
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-sm border border-[color:var(--cream)]/30 bg-black/40 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--cream)] backdrop-blur transition-colors hover:bg-black/60 disabled:opacity-60"
              >
                {uploadRoomImage.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                Changer l'image
              </button>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(43,36,29,0.85) 0%, rgba(43,36,29,0.45) 50%, rgba(43,36,29,0.05) 100%)",
                }}
              />
              <div className="relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-6 py-6 lg:px-8">
                <div
                  className="mb-2 inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--accent-brass-soft)" }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-px w-6"
                    style={{ background: "var(--accent-brass)" }}
                  />
                  <Link to="/room" className="hover:text-[color:var(--accent-brass)]">Rooms</Link>
                  <span aria-hidden>/</span>
                  <span>{room.plan_name ?? "Pièce"}</span>
                </div>
                <h1 className="font-display text-4xl leading-none tracking-tight text-[color:var(--cream)]">
                  {room.name}
                </h1>
                {(room.ceiling_height || room.width || room.length) && (
                  <div className="mt-2 text-sm text-[color:var(--sand)]">
                    {[room.width, room.length].filter(Boolean).join(" × ")}
                    {room.ceiling_height && ` · ${room.ceiling_height} de hauteur`}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-[1600px] p-6 lg:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-1.5">
              <span className="label-micro mr-2">Naviguer</span>
              {data.rooms.map((r) => (
                <Link
                  key={r.id}
                  to="/room/$roomId"
                  params={{ roomId: r.id }}
                  className={cn(
                    "rounded-sm border px-2 py-1 text-xs transition-colors",
                    r.id === roomId
                      ? "border-[color:var(--accent-brass)] bg-[color:var(--accent-brass)]/15 font-medium text-[color:var(--walnut)]"
                      : "border-[color:var(--rule-soft)] bg-card text-muted-foreground hover:border-[color:var(--accent-brass)] hover:text-foreground",
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
                <RoomHeader room={room} data={data} />
                <BudgetStrip
                  roomId={room.id}
                  items={data.items.filter((i) => i.room_id === room.id)}
                />
                <ContractorDirections room={room} items={data.items} data={data} />

                <div className="mb-4 mt-2 flex items-baseline gap-3">
                  <div className="editorial-eyebrow">Par catégorie</div>
                  <h2 className="font-display text-2xl tracking-tight">Items</h2>
                </div>
                {data.categories.map((c) => {
                  const scoped = data.items
                    .filter((i) => i.room_id === room.id && i.category_id === c.id && !i.is_fee)
                    .sort((a, b) =>
                      (a.delivery_date ?? "9999").localeCompare(b.delivery_date ?? "9999"),
                    );
                  if (scoped.length === 0) return null;
                  const committed = scoped.filter((i) => !isOption(i.status));
                  const options = scoped.filter((i) => isOption(i.status));
                  return (
                    <div key={c.id} className="mb-6">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--walnut)]">
                        <CategoryIcon
                          categoryKey={c.key}
                          className="h-3.5 w-3.5 text-[color:var(--accent-brass)]"
                        />
                        {c.label}
                      </h3>
                      {committed.length > 0 && (
                        <ItemsTable
                          items={committed}
                          data={data}
                          onEdit={setEditing}
                          showRoom={false}
                          showCategory={false}
                        />
                      )}
                      {options.length > 0 && (
                        <div className="mt-2 rounded-md border border-dashed border-[color:var(--rule-soft)] p-1">
                          <div className="label-micro px-2 py-1 italic text-muted-foreground">
                            Options — not committed
                          </div>
                          <ItemsTable
                            items={options}
                            data={data}
                            onEdit={setEditing}
                            showRoom={false}
                            showCategory={false}
                          />
                        </div>
                      )}
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
          </div>
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
