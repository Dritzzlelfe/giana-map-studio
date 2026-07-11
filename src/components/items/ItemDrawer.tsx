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
import { useCurrentProfile } from "@/lib/useCurrentProfile";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const { data: profile } = useCurrentProfile();
  const money = profile?.role?.money_visibility ?? "none";
  const showGadCost = money === "full";
  const showClientPrice = money === "full" || money === "client_price";
  const showBalance = money === "full";
  const canEditMoney = money === "full";
  const [newVendor, setNewVendor] = useState("");
  const [newPerson, setNewPerson] = useState("");

  if (!item) return null;

  const patch = (p: Partial<Item>) => update.mutate({ id: item.id, patch: p });

  const isOption = item.status === "option";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-l border-[color:var(--rule-soft)] bg-paper shadow-[var(--shadow-drawer)] sm:max-w-xl">
        <SheetHeader className="border-b border-[color:var(--rule-soft)] pb-4">
          <div className="label-micro">
            {item.vendor_id ? data.vendorById[item.vendor_id]?.name ?? "Vendor" : "Item"}
            {item.sku && <span className="ml-2 num-tabular normal-case tracking-normal">· {item.sku}</span>}
          </div>
          <SheetTitle>
            <Input
              value={item.title}
              onChange={(e) => patch({ title: e.target.value })}
              className={cn(
                "h-auto border-0 bg-transparent p-0 text-2xl font-light tracking-tight shadow-none focus-visible:ring-0",
                isOption && "italic text-muted-foreground",
              )}
            />
          </SheetTitle>
        </SheetHeader>

        <Section label="Identity">
          <div className="grid grid-cols-2 gap-4">
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
            <Field label="SKU">
              <Input value={item.sku ?? ""} onChange={(e) => patch({ sku: e.target.value || null })} className="num-tabular" />
            </Field>
            <Field label="Lead time">
              <Input value={item.lead_time ?? ""} onChange={(e) => patch({ lead_time: e.target.value || null })} className="num-tabular" />
            </Field>
          </div>
        </Section>

        <Section label="Lifecycle">
          <Lifecycle status={item.status} />
          <div className="mt-3 grid grid-cols-2 gap-4">
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
            <Field label="Qty needed">
              <Input
                type="number"
                value={item.qty_needed ?? ""}
                onChange={(e) => patch({ qty_needed: e.target.value === "" ? null : Number(e.target.value) })}
                className="num-tabular"
              />
            </Field>
            <Field label="Qty ordered">
              <Input
                type="number"
                value={item.qty_ordered ?? ""}
                onChange={(e) => patch({ qty_ordered: e.target.value === "" ? null : Number(e.target.value) })}
                className="num-tabular"
              />
            </Field>
          </div>
        </Section>

        <Section label="Money — dated obligations">
          <div className="grid grid-cols-2 gap-4">
            <MoneyField
              label="GAD cost"
              value={item.gad_cost}
              visible={showGadCost}
              canEdit={canEditMoney}
              onChange={(v) => patch({ gad_cost: v })}
            />
            <MoneyField
              label="Client price"
              value={item.client_price}
              visible={showClientPrice}
              canEdit={canEditMoney}
              onChange={(v) => patch({ client_price: v })}
            />
            <MoneyField
              label="Balance on delivery"
              value={item.balance_due_on_delivery}
              visible={showBalance}
              canEdit={canEditMoney}
              onChange={(v) => patch({ balance_due_on_delivery: v })}
            />
            {canEditMoney && (
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
            )}
          </div>
          {!canEditMoney && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Read only for this role.
            </div>
          )}
        </Section>

        <Section label="Logistics">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Delivery date">
              <Input
                type="date"
                value={item.delivery_date ?? ""}
                onChange={(e) => patch({ delivery_date: e.target.value || null })}
                className="num-tabular"
              />
            </Field>
            <Field label="Delivery address">
              <Input value={item.delivery_address ?? ""} onChange={(e) => patch({ delivery_address: e.target.value || null })} />
            </Field>
            <Field label="Location">
              <Select value={item.logistics_location ?? NULL_VAL} onValueChange={(v) => patch({ logistics_location: nullify(v) })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {LOGISTICS_LOCATIONS.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Storage name">
              <Input value={item.storage_name ?? ""} onChange={(e) => patch({ storage_name: e.target.value || null })} />
            </Field>
            <Field label="Storage address" className="col-span-2">
              <Input value={item.storage_address ?? ""} onChange={(e) => patch({ storage_address: e.target.value || null })} />
            </Field>
          </div>
        </Section>

        <Section label="People">
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </Section>

        <Section label="Notes">
          <div className="grid gap-4">
            <Field label="Design placement">
              <Textarea
                value={item.design_placement ?? ""}
                onChange={(e) => patch({ design_placement: e.target.value || null })}
                rows={2}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={item.description ?? ""}
                onChange={(e) => patch({ description: e.target.value || null })}
                rows={3}
              />
            </Field>
            <Field label="Option source">
              <Input
                placeholder="Store, website, or contact (for options being considered)"
                value={item.option_source ?? ""}
                onChange={(e) => patch({ option_source: e.target.value || null })}
              />
            </Field>
          </div>
        </Section>

        <div className="mt-6 flex justify-between border-t border-[color:var(--rule-soft)] pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-[color:var(--primary)]"
            onClick={() => {
              if (confirm(`Delete "${item.title}"?`)) {
                del.mutate(item.id);
                onOpenChange(false);
              }
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[color:var(--rule-soft)] py-5 last:border-b-0">
      <div className="label-micro mb-3">{label}</div>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="label-micro mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function MoneyField({
  label,
  value,
  visible,
  canEdit,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  visible: boolean;
  canEdit: boolean;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <Label className="label-micro mb-1.5 block">{label}</Label>
      {!visible ? (
        <div className="flex h-9 items-center px-1 text-sm italic text-muted-foreground">
          Hidden
        </div>
      ) : value == null ? (
        canEdit ? (
          <Input
            type="number"
            value=""
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            className="num-tabular"
            placeholder="—"
          />
        ) : (
          <div className="flex h-9 items-center px-1 text-sm text-muted-foreground">—</div>
        )
      ) : canEdit ? (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="num-tabular"
        />
      ) : (
        <div className="flex h-9 items-center px-1 text-sm num-tabular">
          ${value.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function Lifecycle({ status }: { status: string | null }) {
  const steps = [
    { id: "option", label: "Option" },
    { id: "to_spec", label: "To spec" },
    { id: "to_order", label: "To order" },
    { id: "ordered", label: "Ordered" },
    { id: "delivered", label: "Delivered" },
    { id: "installed", label: "Installed" },
  ];
  const idx = steps.findIndex((s) => s.id === status);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const active = idx === i;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                active
                  ? "bg-[color:var(--primary)]"
                  : done
                    ? "bg-muted-foreground"
                    : "border border-[color:var(--rule-soft)] bg-transparent",
              )}
            />
            <span
              className={cn(
                "label-micro whitespace-nowrap",
                active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="h-px flex-1 bg-[color:var(--rule-soft)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
