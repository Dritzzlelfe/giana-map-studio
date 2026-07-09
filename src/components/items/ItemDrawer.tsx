import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import {
  LOGISTICS_LOCATIONS,
  PRIORITIES,
  STATUSES,
  type Item,
  type LoadedData,
} from "@/lib/itemsApi";
import { useCreatePerson, useCreateVendor, useDeleteItem, useUpdateItem } from "@/lib/useItemsData";
import { useState } from "react";

type Props = {
  item: Item | null;
  data: LoadedData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NULL_VAL = "__null__";

function nullify<T extends string>(v: T) {
  return v === NULL_VAL ? null : v;
}

export function ItemDrawer({ item, data, open, onOpenChange }: Props) {
  const update = useUpdateItem();
  const del = useDeleteItem();
  const createVendor = useCreateVendor();
  const createPerson = useCreatePerson();
  const [newVendor, setNewVendor] = useState("");
  const [newPerson, setNewPerson] = useState("");

  if (!item) return null;

  const patch = (p: Partial<Item>) => update.mutate({ id: item.id, patch: p });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            <Input
              value={item.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="text-lg font-semibold"
            />
          </SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <Field label="Room">
            <Select value={item.room_id ?? NULL_VAL} onValueChange={(v) => patch({ room_id: nullify(v) })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {data.rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Category">
            <Select value={item.category_id ?? NULL_VAL} onValueChange={(v) => patch({ category_id: nullify(v) })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {data.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Vendor" className="col-span-2">
            <div className="flex gap-2">
              <Select value={item.vendor_id ?? NULL_VAL} onValueChange={(v) => patch({ vendor_id: nullify(v) })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {data.vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}{v.account_status === "trade_account_open" ? " (trade)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="+ new vendor"
                value={newVendor}
                onChange={(e) => setNewVendor(e.target.value)}
                className="w-44"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newVendor.trim()}
                onClick={async () => {
                  const v = await createVendor.mutateAsync({ name: newVendor.trim() });
                  setNewVendor("");
                  patch({ vendor_id: v.id });
                }}
              >Add</Button>
            </div>
          </Field>

          <Field label="Status">
            <Select value={item.status ?? NULL_VAL} onValueChange={(v) => patch({ status: nullify(v) })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Priority">
            <Select value={item.priority ?? NULL_VAL} onValueChange={(v) => patch({ priority: nullify(v) })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {PRIORITIES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="SKU">
            <Input value={item.sku ?? ""} onChange={(e) => patch({ sku: e.target.value || null })} />
          </Field>
          <Field label="Lead time">
            <Input value={item.lead_time ?? ""} onChange={(e) => patch({ lead_time: e.target.value || null })} />
          </Field>

          <Field label="Qty needed">
            <Input
              type="number"
              value={item.qty_needed ?? ""}
              onChange={(e) => patch({ qty_needed: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label="Qty ordered">
            <Input
              type="number"
              value={item.qty_ordered ?? ""}
              onChange={(e) => patch({ qty_ordered: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>

          <Field label="Design placement" className="col-span-2">
            <Textarea
              value={item.design_placement ?? ""}
              onChange={(e) => patch({ design_placement: e.target.value || null })}
              rows={2}
            />
          </Field>

          <Field label="Description" className="col-span-2">
            <Textarea
              value={item.description ?? ""}
              onChange={(e) => patch({ description: e.target.value || null })}
              rows={3}
            />
          </Field>

          <Field label="Ordered by" className="col-span-2">
            <div className="flex gap-2">
              <Select value={item.ordered_by ?? NULL_VAL} onValueChange={(v) => patch({ ordered_by: nullify(v) })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {data.people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                placeholder="+ new person"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                className="w-44"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newPerson.trim()}
                onClick={async () => {
                  const p = await createPerson.mutateAsync({ name: newPerson.trim() });
                  setNewPerson("");
                  patch({ ordered_by: p.id });
                }}
              >Add</Button>
            </div>
          </Field>

          <Field label="Installer">
            <Select value={item.installer ?? NULL_VAL} onValueChange={(v) => patch({ installer: nullify(v) })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {data.people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Logistics location">
            <Select value={item.logistics_location ?? NULL_VAL} onValueChange={(v) => patch({ logistics_location: nullify(v) })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {LOGISTICS_LOCATIONS.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Option source" className="col-span-2">
            <Input
              placeholder="Store, website, or contact (for options being considered)"
              value={item.option_source ?? ""}
              onChange={(e) => patch({ option_source: e.target.value || null })}
            />
          </Field>

          <Field label="Delivery date">
            <Input
              type="date"
              value={item.delivery_date ?? ""}
              onChange={(e) => patch({ delivery_date: e.target.value || null })}
            />
          </Field>
          <Field label="Delivery address">
            <Input value={item.delivery_address ?? ""} onChange={(e) => patch({ delivery_address: e.target.value || null })} />
          </Field>

          <Field label="Storage name">
            <Input value={item.storage_name ?? ""} onChange={(e) => patch({ storage_name: e.target.value || null })} />
          </Field>
          <Field label="Storage address">
            <Input value={item.storage_address ?? ""} onChange={(e) => patch({ storage_address: e.target.value || null })} />
          </Field>

          <div className="col-span-2 mt-2 rounded-md border bg-muted/30 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Money — dated obligations
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="GAD cost">
                <Input
                  type="number"
                  value={item.gad_cost ?? ""}
                  onChange={(e) => patch({ gad_cost: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
              <Field label="Client price">
                <Input
                  type="number"
                  value={item.client_price ?? ""}
                  onChange={(e) => patch({ client_price: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
              <Field label="Balance due on delivery">
                <Input
                  type="number"
                  value={item.balance_due_on_delivery ?? ""}
                  onChange={(e) => patch({ balance_due_on_delivery: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </Field>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={item.client_paid_gad}
                    onCheckedChange={(c) => patch({ client_paid_gad: c })}
                  />
                  Client paid GAD
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={item.gad_paid_vendor}
                    onCheckedChange={(c) => patch({ gad_paid_vendor: c })}
                  />
                  GAD paid vendor
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (confirm(`Delete "${item.title}"?`)) {
                del.mutate(item.id);
                onOpenChange(false);
              }
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
