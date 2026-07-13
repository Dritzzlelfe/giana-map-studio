import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Check, AlertTriangle, ArrowRight, Upload, ImagePlus, Loader2, X } from "lucide-react";
import {
  LOGISTICS_LOCATIONS,
  PRIORITIES,
  type Item,
  type LoadedData,
} from "@/lib/itemsApi";
import {
  useCreatePerson,
  useCreateVendor,
  useDeleteItem,
  useUpdateItem,
} from "@/lib/useItemsData";
import { useProduct, useUpdateProduct } from "@/lib/useProductsData";
import type { Product } from "@/lib/productsApi";

import { useApprovalsForItem, useRecordApproval } from "@/lib/useApprovals";
import {
  useCreatePayment,
  useDeletePayment,
  usePaymentsForItem,
  derivePaymentTotals,
} from "@/lib/usePayments";
import { useMediaForProduct, useMediaForItem, useUploadItemPhoto, useDeleteItemPhoto } from "@/lib/mediaApi";
import { useCurrentProfile } from "@/lib/useCurrentProfile";
import { LIFECYCLE_STAGES, checkTransition, isOption, type LifecycleStage } from "@/lib/lifecycle";
import { useState } from "react";
import { toast } from "sonner";
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
  const canEditMoney = money === "full";

  const [newVendor, setNewVendor] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState<null | "dashboard" | "verbal_logged" | "declined">(null);

  if (!item) return null;

  const patch = (p: Partial<Item>) => update.mutate({ id: item.id, patch: p });
  const option = isOption(item.status);

  const tryAdvance = (next: LifecycleStage) => {
    const err = checkTransition(item, next);
    if (err) {
      toast.error(err);
      return;
    }
    patch({ status: next });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-l border-[color:var(--rule-soft)] bg-paper shadow-[var(--shadow-drawer)] sm:max-w-2xl">
        <SheetHeader className="border-b border-[color:var(--rule-soft)] pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="label-micro">
                {item.vendor_id ? (data.vendorById[item.vendor_id]?.name ?? "Vendor") : "Item"}
                {item.sku && (
                  <span className="ml-2 num-tabular normal-case tracking-normal">· {item.sku}</span>
                )}
              </div>
              <SheetTitle>
                <Input
                  value={item.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  className={cn(
                    "h-auto border-0 bg-transparent p-0 text-2xl font-light tracking-tight shadow-none focus-visible:ring-0",
                    option && "italic text-muted-foreground",
                  )}
                />
              </SheetTitle>
            </div>
            {option && (
              <Button
                size="sm"
                onClick={() => setConvertOpen(true)}
                className="shrink-0"
              >
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                Convert to committed
              </Button>
            )}
          </div>
        </SheetHeader>

        <ProductIdentityBlock productId={item.product_id} />

        <Section label="Lifecycle">
          <Lifecycle status={item.status} onJump={tryAdvance} />
          <div className="mt-3 flex items-center gap-2">
            <span className="label-micro">Now:</span>
            <StageBadge status={item.status} />
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => tryAdvance("on_hold")}
              disabled={item.status === "on_hold"}
            >
              Put on hold
            </Button>
          </div>
        </Section>

        <Section label="Context">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room">
              <Select
                value={item.room_id ?? NULL_VAL}
                onValueChange={(v) => patch({ room_id: nullify(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {data.rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select
                value={item.category_id ?? NULL_VAL}
                onValueChange={(v) => patch({ category_id: nullify(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {data.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vendor" className="col-span-2">
              <div className="flex gap-2">
                <Select
                  value={item.vendor_id ?? NULL_VAL}
                  onValueChange={(v) => patch({ vendor_id: nullify(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NULL_VAL}>—</SelectItem>
                    {data.vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                        {v.account_status === "trade_account_open" ? " (trade)" : ""}
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
                >
                  Add
                </Button>
              </div>
            </Field>
            <Field label="Priority">
              <Select
                value={item.priority ?? NULL_VAL}
                onValueChange={(v) => patch({ priority: nullify(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {PRIORITIES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Qty needed / ordered">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={item.qty_needed ?? ""}
                  onChange={(e) =>
                    patch({ qty_needed: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="num-tabular"
                />
                <Input
                  type="number"
                  value={item.qty_ordered ?? ""}
                  onChange={(e) =>
                    patch({ qty_ordered: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="num-tabular"
                />
              </div>
            </Field>
          </div>
        </Section>

        {(option || item.option_source) && (
          <Section label={option ? "Option source" : "Origin (kept as history)"}>
            <Input
              placeholder="Store, website, or contact"
              value={item.option_source ?? ""}
              onChange={(e) => patch({ option_source: e.target.value || null })}
              disabled={!option}
              className={cn(!option && "text-muted-foreground")}
            />
          </Section>
        )}

        <MoneyBlock
          item={item}
          showGadCost={showGadCost}
          showClientPrice={showClientPrice}
          canEditMoney={canEditMoney}
          patch={patch}
        />

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
            <Field label="Lead time">
              <Input
                value={item.lead_time ?? ""}
                onChange={(e) => patch({ lead_time: e.target.value || null })}
                className="num-tabular"
              />
            </Field>
            <Field label="Delivery address" className="col-span-2">
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    value={item.delivery_address ?? ""}
                    onChange={(e) => patch({ delivery_address: e.target.value || null })}
                    className={cn(item.delivery_address_pending && "border-[color:var(--primary)]")}
                  />
                  {item.delivery_address_pending ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => patch({ delivery_address_pending: false })}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Confirm
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ delivery_address_pending: true })}
                      title="Mark pending"
                    >
                      Mark pending
                    </Button>
                  )}
                </div>
                {item.delivery_address_pending && (
                  <div className="label-micro flex items-center gap-1.5 text-[color:var(--primary)]">
                    <AlertTriangle className="h-3 w-3" strokeWidth={1.5} /> Address pending
                    confirmation
                  </div>
                )}
              </div>
            </Field>
            <Field label="Location">
              <Select
                value={item.logistics_location ?? NULL_VAL}
                onValueChange={(v) => patch({ logistics_location: nullify(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {LOGISTICS_LOCATIONS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Storage name">
              <Input
                value={item.storage_name ?? ""}
                onChange={(e) => patch({ storage_name: e.target.value || null })}
              />
            </Field>
            <Field label="Storage address" className="col-span-2">
              <Input
                value={item.storage_address ?? ""}
                onChange={(e) => patch({ storage_address: e.target.value || null })}
              />
            </Field>
          </div>
        </Section>

        <ApprovalSummaryBlock itemId={item.id} onRecord={setApprovalOpen} />

        <Section label="People">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ordered by" className="col-span-2">
              <div className="flex gap-2">
                <Select
                  value={item.ordered_by ?? NULL_VAL}
                  onValueChange={(v) => patch({ ordered_by: nullify(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NULL_VAL}>—</SelectItem>
                    {data.people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
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
                >
                  Add
                </Button>
              </div>
            </Field>
            <Field label="Installer">
              <Select
                value={item.installer ?? NULL_VAL}
                onValueChange={(v) => patch({ installer: nullify(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NULL_VAL}>—</SelectItem>
                  {data.people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Section>

        <Section label="Notes & media">
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
            <MediaStrip productId={item.product_id} />
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>

        <ConvertOptionDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          item={item}
          data={data}
        />
        <RecordApprovalDialog
          mode={approvalOpen}
          onClose={() => setApprovalOpen(null)}
          item={item}
          data={data}
        />
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- Blocks -------------------------------- */

function ProductIdentityBlock({ productId }: { productId: string | null }) {
  const { data: product } = useProduct(productId);
  const update = useUpdateProduct(productId);

  if (!productId) return null;

  const patch = (p: Partial<Product>) => update.mutate(p);


  return (
    <Section
      label="Product identity"
      hint="Shared across projects — editing here changes it everywhere"
    >
      {!product ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" className="col-span-2">
            <Input
              value={product.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          <Field label="Brand">
            <Input
              value={product.brand ?? ""}
              onChange={(e) => patch({ brand: e.target.value || null })}
            />
          </Field>
          <Field label="SKU">
            <Input
              value={product.sku ?? ""}
              onChange={(e) => patch({ sku: e.target.value || null })}
              className="num-tabular"
            />
          </Field>
          <Field label="Finish">
            <Input
              value={product.finish ?? ""}
              onChange={(e) => patch({ finish: e.target.value || null })}
            />
          </Field>
          <Field label="Material">
            <Input
              value={product.material ?? ""}
              onChange={(e) => patch({ material: e.target.value || null })}
            />
          </Field>
          <Field label="W × L × H × D (in)" className="col-span-2">
            <div className="grid grid-cols-4 gap-2">
              {(["width_in", "length_in", "height_in", "depth_in"] as const).map((k) => (
                <Input
                  key={k}
                  type="number"
                  placeholder={k.replace("_in", "")}
                  value={product[k] ?? ""}
                  onChange={(e) =>
                    patch({ [k]: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="num-tabular"
                />
              ))}
            </div>
          </Field>
        </div>
      )}
    </Section>
  );
}

function MoneyBlock({
  item,
  showGadCost,
  showClientPrice,
  canEditMoney,
  patch,
}: {
  item: Item;
  showGadCost: boolean;
  showClientPrice: boolean;
  canEditMoney: boolean;
  patch: (p: Partial<Item>) => void;
}) {
  const { data: payments = [] } = usePaymentsForItem(item.id);
  const createPayment = useCreatePayment(item.id);
  const deletePayment = useDeletePayment(item.id);
  const derived = derivePaymentTotals(payments, item.delivery_date);

  const markup =
    item.client_price != null && item.gad_cost != null
      ? Number(item.client_price) - Number(item.gad_cost)
      : null;

  const [amt, setAmt] = useState("");
  const [dir, setDir] = useState<"client_to_gad" | "gad_to_vendor">("client_to_gad");
  const [st, setSt] = useState<"paid" | "due" | "reserved">("due");
  const [due, setDue] = useState("");

  return (
    <Section label="Money">
      <div className="grid grid-cols-3 gap-4">
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
        <MoneyDisplay label="Markup" value={markup} visible={showGadCost && showClientPrice} />
      </div>

      <div className="mt-4 border-t border-[color:var(--rule-soft)] pt-3">
        <div className="label-micro mb-2 flex items-center justify-between">
          <span>Payments</span>
          {derived.hasMasked && (
            <span className="text-muted-foreground italic">some hidden for this role</span>
          )}
        </div>
        {payments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No payments recorded.</div>
        ) : (
          <div className="divide-y divide-[color:var(--rule-soft)]">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-28 shrink-0 num-tabular">
                  {p.amount == null ? (
                    <span className="italic text-muted-foreground">Hidden</span>
                  ) : (
                    `$${Number(p.amount).toLocaleString()}`
                  )}
                </span>
                <span className="w-28 shrink-0 text-muted-foreground">
                  {p.direction === "client_to_gad" ? "Client → GAD" : "GAD → Vendor"}
                </span>
                <Badge variant="outline" className="capitalize">
                  {p.state}
                </Badge>
                <span className="ml-auto num-tabular text-muted-foreground">{p.due_date ?? "—"}</span>
                {canEditMoney && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePayment.mutate(p.id)}
                    className="h-7 w-7 p-0 text-muted-foreground"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {canEditMoney && (
          <div className="mt-3 grid grid-cols-[100px_1fr_1fr_1fr_auto] gap-2">
            <Input
              type="number"
              placeholder="Amount"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              className="num-tabular"
            />
            <Select value={dir} onValueChange={(v) => setDir(v as typeof dir)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_to_gad">Client → GAD</SelectItem>
                <SelectItem value="gad_to_vendor">GAD → Vendor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={st} onValueChange={(v) => setSt(v as typeof st)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due">Due</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="num-tabular"
            />
            <Button
              size="sm"
              disabled={!amt}
              onClick={async () => {
                await createPayment.mutateAsync({
                  item_id: item.id,
                  amount: Number(amt),
                  direction: dir,
                  state: st,
                  due_date: due || null,
                  phase_id: null,
                  notes: null,
                });
                setAmt("");
                setDue("");
              }}
            >
              Add
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-[color:var(--rule-soft)] pt-3">
        <MoneyDisplay
          label="Client due on delivery"
          value={derived.clientDueOnDelivery}
          visible={showClientPrice}
          computed
        />
        <MoneyDisplay
          label="GAD owes vendor"
          value={derived.gadOwesVendor}
          visible={showGadCost}
          computed
        />
        <MoneyDisplay
          label="Invoiced to client"
          value={derived.invoicedToClient}
          visible={showClientPrice}
          computed
        />
      </div>

      {canEditMoney && (
        <div className="mt-4 flex flex-wrap gap-4 border-t border-[color:var(--rule-soft)] pt-3">
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

      {!canEditMoney && (
        <div className="mt-2 text-[11px] text-muted-foreground">Read only for this role.</div>
      )}
    </Section>
  );
}

function ApprovalSummaryBlock({
  itemId,
  onRecord,
}: {
  itemId: string;
  onRecord: (mode: "dashboard" | "verbal_logged" | "declined") => void;
}) {
  const { data: approvals = [] } = useApprovalsForItem(itemId);
  const latest = approvals[0];
  return (
    <Section label="Approval">
      {latest ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={latest.mode === "declined" ? "destructive" : "outline"}>
            {latest.mode === "verbal_logged"
              ? "Verbal (logged)"
              : latest.mode === "dashboard"
                ? "Dashboard"
                : "Declined"}
          </Badge>
          <span className="text-muted-foreground num-tabular">
            {latest.decided_at
              ? new Date(latest.decided_at).toLocaleDateString()
              : new Date(latest.created_at).toLocaleDateString()}
          </span>
          {latest.note && <span className="text-muted-foreground">— {latest.note}</span>}
          <span className="label-micro ml-auto text-muted-foreground">
            {approvals.length} record{approvals.length > 1 ? "s" : ""}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">No approval recorded.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onRecord("dashboard")}>
              Dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={() => onRecord("verbal_logged")}>
              Verbal
            </Button>
            <Button size="sm" variant="outline" onClick={() => onRecord("declined")}>
              Decline
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function MediaStrip({ productId }: { productId: string | null }) {
  const { data: media = [] } = useMediaForProduct(productId);
  if (!productId) return null;
  return (
    <div>
      <div className="label-micro mb-1.5">Photos</div>
      {media.length === 0 ? (
        <div className="text-xs text-muted-foreground">No photos yet.</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto">
          {media.map((m) => (
            <a
              key={m.id}
              href={m.file_url}
              target="_blank"
              rel="noreferrer"
              className="block h-20 w-20 shrink-0 overflow-hidden rounded border border-[color:var(--rule-soft)]"
            >
              <img src={m.file_url} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Dialogs ------------------------------- */

function ConvertOptionDialog({
  open,
  onOpenChange,
  item,
  data,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Item;
  data: LoadedData;
}) {
  const record = useRecordApproval();
  const { data: profile } = useCurrentProfile();
  const [decidedBy, setDecidedBy] = useState<string>(NULL_VAL);
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert option to committed</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This advances the item to <strong>committed</strong> and records a verbal approval
            logged on the client's behalf.
          </p>
          <Field label="Client">
            <Select value={decidedBy} onValueChange={setDecidedBy}>
              <SelectTrigger>
                <SelectValue placeholder="Who approved?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {data.people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Note">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await record.mutateAsync({
                itemId: item.id,
                mode: "verbal_logged",
                decidedBy: nullify(decidedBy),
                loggedBy: profile?.userId ?? null,
                note: note || null,
                advanceTo: "committed",
              });
              onOpenChange(false);
              setNote("");
              toast.success("Converted — approval recorded.");
            }}
          >
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordApprovalDialog({
  mode,
  onClose,
  item,
  data,
}: {
  mode: null | "dashboard" | "verbal_logged" | "declined";
  onClose: () => void;
  item: Item;
  data: LoadedData;
}) {
  const record = useRecordApproval();
  const { data: profile } = useCurrentProfile();
  const [decidedBy, setDecidedBy] = useState<string>(NULL_VAL);
  const [note, setNote] = useState("");

  if (!mode) return null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "dashboard"
              ? "Record dashboard approval"
              : mode === "verbal_logged"
                ? "Log verbal approval on client's behalf"
                : "Record decline"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Client">
            <Select value={decidedBy} onValueChange={setDecidedBy}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NULL_VAL}>—</SelectItem>
                {data.people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={mode === "declined" || mode === "verbal_logged" ? "Note (required)" : "Note"}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={(mode === "declined" || mode === "verbal_logged") && !note.trim()}
            onClick={async () => {
              await record.mutateAsync({
                itemId: item.id,
                mode,
                decidedBy: nullify(decidedBy),
                loggedBy: mode === "verbal_logged" ? (profile?.userId ?? null) : null,
                note: note || null,
                advanceTo: mode === "declined" ? undefined : "approved",
              });
              onClose();
              setNote("");
              toast.success("Approval recorded.");
            }}
          >
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- Primitives ---------------------------- */

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[color:var(--rule-soft)] py-5 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="label-micro">{label}</div>
        {hint && <div className="text-[10px] italic text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({
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
      ) : canEdit ? (
        <Input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className="num-tabular"
          placeholder="—"
        />
      ) : value == null ? (
        <div className="flex h-9 items-center px-1 text-sm text-muted-foreground">—</div>
      ) : (
        <div className="flex h-9 items-center px-1 text-sm num-tabular">
          ${value.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function MoneyDisplay({
  label,
  value,
  visible = true,
  computed = false,
}: {
  label: string;
  value: number | null;
  visible?: boolean;
  computed?: boolean;
}) {
  return (
    <div>
      <Label className="label-micro mb-1.5 block">
        {label}
        {computed && <span className="ml-1 text-muted-foreground/60">·computed</span>}
      </Label>
      {!visible ? (
        <div className="flex h-9 items-center px-1 text-sm italic text-muted-foreground">
          Hidden
        </div>
      ) : value == null ? (
        <div className="flex h-9 items-center px-1 text-sm text-muted-foreground">—</div>
      ) : (
        <div className="flex h-9 items-center px-1 text-sm num-tabular">
          ${value.toLocaleString()}
        </div>
      )}
    </div>
  );
}

function StageBadge({ status }: { status: string | null }) {
  const s = LIFECYCLE_STAGES.find((x) => x.id === status);
  const label =
    s?.label ?? (status === "on_hold" ? "On hold" : (status ?? "Unset"));
  return <Badge variant="outline">{label}</Badge>;
}

function Lifecycle({
  status,
  onJump,
}: {
  status: string | null;
  onJump: (next: LifecycleStage) => void;
}) {
  const idx = LIFECYCLE_STAGES.findIndex((s) => s.id === status);
  return (
    <div className="flex items-center gap-1">
      {LIFECYCLE_STAGES.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const active = idx === i;
        return (
          <div key={s.id} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => onJump(s.id)}
              className={cn(
                "flex items-center gap-1.5 text-left",
                "hover:text-foreground",
              )}
              title={`Advance to ${s.label}`}
            >
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
                  active
                    ? "text-foreground"
                    : done
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60",
                )}
              >
                {s.label}
              </span>
            </button>
            {i < LIFECYCLE_STAGES.length - 1 && (
              <div className="h-px flex-1 bg-[color:var(--rule-soft)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
