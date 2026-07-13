import { useState } from "react";
import type { LoadedData, Room } from "@/lib/itemsApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateRoom } from "@/lib/roomsApi";

export function RoomHeader({ room }: { room: Room; data: LoadedData }) {
  const update = useUpdateRoom();
  const patch = (p: Parameters<typeof update.mutate>[0]["patch"]) =>
    update.mutate({ id: room.id, patch: p });
  const [local, setLocal] = useState({
    name: room.name,
    plan_name: room.plan_name ?? "",
    ceiling_height: room.ceiling_height ?? "",
    width: room.width ?? "",
    length: room.length ?? "",
    notes: room.notes ?? "",
  });

  return (
    <div className="mb-6 rounded-md border border-[color:var(--rule-soft)] bg-card p-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Cell label="Name">
          <Input
            value={local.name}
            onChange={(e) => setLocal((s) => ({ ...s, name: e.target.value }))}
            onBlur={() => local.name !== room.name && patch({ name: local.name })}
          />
        </Cell>
        <Cell label="Plan name (architectural)">
          <Input
            value={local.plan_name}
            placeholder="e.g. Primary Suite / Room 204"
            onChange={(e) => setLocal((s) => ({ ...s, plan_name: e.target.value }))}
            onBlur={() =>
              local.plan_name !== (room.plan_name ?? "") &&
              patch({ plan_name: local.plan_name || null })
            }
          />
        </Cell>
        <Cell label="Ceiling height">
          <Input
            value={local.ceiling_height}
            placeholder='e.g. 9\' 6"'
            onChange={(e) => setLocal((s) => ({ ...s, ceiling_height: e.target.value }))}
            onBlur={() =>
              local.ceiling_height !== (room.ceiling_height ?? "") &&
              patch({ ceiling_height: local.ceiling_height || null })
            }
            className="num-tabular"
          />
        </Cell>
        <Cell label="Width">
          <Input
            value={local.width}
            onChange={(e) => setLocal((s) => ({ ...s, width: e.target.value }))}
            onBlur={() =>
              local.width !== (room.width ?? "") && patch({ width: local.width || null })
            }
            className="num-tabular"
          />
        </Cell>
        <Cell label="Length">
          <Input
            value={local.length}
            onChange={(e) => setLocal((s) => ({ ...s, length: e.target.value }))}
            onBlur={() =>
              local.length !== (room.length ?? "") && patch({ length: local.length || null })
            }
            className="num-tabular"
          />
        </Cell>
        <Cell label="Notes" className="md:col-span-3">
          <Textarea
            rows={2}
            value={local.notes}
            onChange={(e) => setLocal((s) => ({ ...s, notes: e.target.value }))}
            onBlur={() =>
              local.notes !== (room.notes ?? "") && patch({ notes: local.notes || null })
            }
          />
        </Cell>
      </div>
    </div>
  );
}

function Cell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="label-micro mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
