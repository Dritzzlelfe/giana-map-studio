import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { useItemsData } from "@/lib/useItemsData";
import { useAllApprovals, useRecordApproval } from "@/lib/useApprovals";
import { useCurrentProfile } from "@/lib/useCurrentProfile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { LoadedData } from "@/lib/itemsApi";
import type { Approval, ApprovalMode } from "@/lib/approvalsApi";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — Project Map" }] }),
  component: ApprovalsPage,
});

const NULL_VAL = "__null__";

function ApprovalsPage() {
  const { data: items, isLoading: itemsLoading } = useItemsData();
  const { data: approvals = [], isLoading: apprLoading } = useAllApprovals();

  const latestByItem = useMemo(() => {
    const m = new Map<string, Approval>();
    for (const a of approvals) if (!m.has(a.item_id)) m.set(a.item_id, a);
    return m;
  }, [approvals]);

  const outstanding = useMemo(() => {
    if (!items) return [];
    return items.items.filter((i) => {
      const last = latestByItem.get(i.id);
      if (!last) return i.status === "option" || i.status === "approved";
      return last.mode === "declined";
    });
  }, [items, latestByItem]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);

  return (
    <AppShell>
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <ClipboardCheck className="h-5 w-5 text-[color:var(--primary)]" strokeWidth={1.5} />
          <h2 className="font-display text-lg font-semibold">Approvals</h2>
        </div>
        {(itemsLoading || apprLoading) && (
          <div className="text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {items && (
          <Tabs defaultValue="outstanding">
            <TabsList>
              <TabsTrigger value="outstanding">
                Outstanding
                <Badge variant="outline" className="ml-2">
                  {outstanding.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="history">
                History
                <Badge variant="outline" className="ml-2">
                  {approvals.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outstanding" className="mt-4">
              {outstanding.length === 0 ? (
                <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
                  Nothing waiting on a decision.
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selected.size} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selected.size === 0}
                      onClick={() => setBatchOpen(true)}
                    >
                      Approve selected (verbal)
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={selected.size === 0}
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-md border bg-card">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="w-10 px-3 py-2"></th>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-left">Room</th>
                          <th className="px-3 py-2 text-left">Category</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Added</th>
                          <th className="px-3 py-2 text-right">Record</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstanding.map((i) => (
                          <OutstandingRow
                            key={i.id}
                            item={i}
                            data={items}
                            selected={selected.has(i.id)}
                            onToggle={(on) => {
                              setSelected((prev) => {
                                const n = new Set(prev);
                                if (on) n.add(i.id);
                                else n.delete(i.id);
                                return n;
                              });
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <HistoryList approvals={approvals} data={items} />
            </TabsContent>
          </Tabs>
        )}
        <BatchApproveDialog
          open={batchOpen}
          onClose={() => setBatchOpen(false)}
          itemIds={[...selected]}
          data={items}
          onDone={() => {
            setSelected(new Set());
            setBatchOpen(false);
          }}
        />
      </div>
    </AppShell>
  );
}

function OutstandingRow({
  item,
  data,
  selected,
  onToggle,
}: {
  item: LoadedData["items"][number];
  data: LoadedData;
  selected: boolean;
  onToggle: (on: boolean) => void;
}) {
  const [mode, setMode] = useState<null | ApprovalMode>(null);
  const room = item.room_id ? data.roomById[item.room_id] : null;
  const cat = item.category_id ? data.categoryById[item.category_id] : null;
  return (
    <>
      <tr className="border-b last:border-0 hover:bg-accent/30">
        <td className="px-3 py-2">
          <Checkbox checked={selected} onCheckedChange={(v) => onToggle(v === true)} />
        </td>
        <td className="px-3 py-2 font-medium">{item.title}</td>
        <td className="px-3 py-2 text-muted-foreground">{room?.name ?? "—"}</td>
        <td className="px-3 py-2 text-muted-foreground">{cat?.label ?? "—"}</td>
        <td className="px-3 py-2">
          <Badge variant="outline">{item.status ?? "—"}</Badge>
        </td>
        <td className="px-3 py-2 num-tabular text-muted-foreground">
          {new Date(item.created_at).toLocaleDateString()}
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setMode("dashboard")}>
              Dashboard
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode("verbal_logged")}>
              Verbal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("declined")}>
              Decline
            </Button>
          </div>
        </td>
      </tr>
      <SingleApprovalDialog
        mode={mode}
        onClose={() => setMode(null)}
        itemId={item.id}
        data={data}
      />
    </>
  );
}

function HistoryList({ approvals, data }: { approvals: Approval[]; data: LoadedData }) {
  if (approvals.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        No decisions recorded yet.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Item</th>
            <th className="px-3 py-2 text-left">Mode</th>
            <th className="px-3 py-2 text-left">Decided</th>
            <th className="px-3 py-2 text-left">Note</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((a) => {
            const item = data.items.find((i) => i.id === a.item_id);
            const by = a.decided_by ? data.personById[a.decided_by] : null;
            return (
              <tr key={a.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{item?.title ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={a.mode === "declined" ? "destructive" : "outline"}>
                    {a.mode === "verbal_logged" ? "Verbal (logged)" : a.mode}
                  </Badge>
                </td>
                <td className="px-3 py-2 num-tabular text-muted-foreground">
                  {(a.decided_at ?? a.created_at) &&
                    new Date(a.decided_at ?? a.created_at).toLocaleDateString()}
                  {by && <span className="ml-2">· {by.name}</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{a.note ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SingleApprovalDialog({
  mode,
  onClose,
  itemId,
  data,
}: {
  mode: null | ApprovalMode;
  onClose: () => void;
  itemId: string;
  data: LoadedData;
}) {
  const record = useRecordApproval();
  const { data: profile } = useCurrentProfile();
  const [decidedBy, setDecidedBy] = useState(NULL_VAL);
  const [note, setNote] = useState("");
  if (!mode) return null;
  const needsNote = mode === "declined" || mode === "verbal_logged";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "dashboard"
              ? "Record dashboard approval"
              : mode === "verbal_logged"
                ? "Log verbal approval"
                : "Record decline"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="label-micro mb-1.5 block">Client</Label>
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
          </div>
          <div>
            <Label className="label-micro mb-1.5 block">
              Note {needsNote && "(required)"}
            </Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={needsNote && !note.trim()}
            onClick={async () => {
              await record.mutateAsync({
                itemId,
                mode,
                decidedBy: decidedBy === NULL_VAL ? null : decidedBy,
                loggedBy: mode === "verbal_logged" ? (profile?.userId ?? null) : null,
                note: note || null,
                advanceTo: mode === "declined" ? undefined : "approved",
              });
              toast.success("Approval recorded.");
              onClose();
              setNote("");
            }}
          >
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BatchApproveDialog({
  open,
  onClose,
  itemIds,
  data,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  itemIds: string[];
  data: LoadedData | undefined;
  onDone: () => void;
}) {
  const record = useRecordApproval();
  const { data: profile } = useCurrentProfile();
  const [decidedBy, setDecidedBy] = useState(NULL_VAL);
  const [note, setNote] = useState("");
  if (!data) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log verbal approval on client's behalf</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Applies to <strong>{itemIds.length}</strong> item{itemIds.length > 1 ? "s" : ""}. Each
            gets its own approval record.
          </p>
          <div>
            <Label className="label-micro mb-1.5 block">Client</Label>
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
          </div>
          <div>
            <Label className="label-micro mb-1.5 block">Note (required)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!note.trim()}
            onClick={async () => {
              for (const id of itemIds) {
                await record.mutateAsync({
                  itemId: id,
                  mode: "verbal_logged",
                  decidedBy: decidedBy === NULL_VAL ? null : decidedBy,
                  loggedBy: profile?.userId ?? null,
                  note,
                  advanceTo: "approved",
                });
              }
              toast.success(`Recorded ${itemIds.length} approval${itemIds.length > 1 ? "s" : ""}.`);
              setNote("");
              onDone();
            }}
          >
            Record all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
