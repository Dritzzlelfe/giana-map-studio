import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useCurrentProfile, usePreviewRoleKey, type ModuleKey, type RightLevel, type MoneyVisibility,
} from "@/lib/useCurrentProfile";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Giana Allen Design Project Map" }] }),
  component: AdminPage,
});

const MODULES: ModuleKey[] = [
  "matrix", "room", "schedule", "item", "budget", "cashflow",
  "logistics", "library", "inventory", "lookbook", "intake",
  "ai", "scheduling", "approvals", "people_vendors", "admin",
];

const RIGHT_LEVELS: RightLevel[] = ["none", "view", "edit"];
const MONEY_LEVELS: MoneyVisibility[] = ["none", "client_price", "full"];

type Role = {
  id: string;
  key: string;
  label: string;
  is_system: boolean;
  module_rights: Record<string, RightLevel>;
  money_visibility: MoneyVisibility;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role_id: string | null;
};

function AdminPage() {
  const { data: profile, isLoading } = useCurrentProfile();
  const isAdmin = ["owner", "super_admin", "admin"].includes(profile?.role?.key ?? "");

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-6 text-sm text-muted-foreground">
          You don't have access to this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex-1 space-y-8 overflow-auto p-6">
        <PreviewAsRoleCard />
        <RolesEditor />
        <PeoplePanel />
      </div>
    </AppShell>
  );
}

/* ---------------- Preview as role ---------------- */

function PreviewAsRoleCard() {
  const { data: roles } = useQuery({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("label");
      if (error) throw error;
      return data as Role[];
    },
  });
  const [previewKey, setPreviewKey] = usePreviewRoleKey();

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Eye className="h-4 w-4 text-amber-700" />
        <h2 className="font-display text-lg font-semibold">Preview as role</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Overrides the UI navigation and permission gates for your current
        session so you can see what a given role would see. Data reads still
        happen with your real role; use a real invited account for a full
        end-to-end verification.
      </p>
      <div className="flex items-center gap-2">
        <Select value={previewKey ?? "__off"} onValueChange={(v) => setPreviewKey(v === "__off" ? null : v)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Off" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__off">Off (use my real role)</SelectItem>
            {(roles ?? []).map((r) => (
              <SelectItem key={r.id} value={r.key}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {previewKey && (
          <Button variant="ghost" size="sm" onClick={() => setPreviewKey(null)}>Exit preview</Button>
        )}
      </div>
    </section>
  );
}

/* ---------------- Roles editor ---------------- */

function RolesEditor() {
  const qc = useQueryClient();
  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("is_system", { ascending: false }).order("label");
      if (error) throw error;
      return data as Role[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (r: Partial<Role> & { id?: string }) => {
      if (r.id) {
        const { error } = await supabase.from("roles").update({
          label: r.label,
          module_rights: r.module_rights,
          money_visibility: r.money_visibility,
        }).eq("id", r.id);
        if (error) throw error;
      } else {
        if (!r.key || !r.label) throw new Error("Key and label required");
        const { error } = await supabase.from("roles").insert({
          key: r.key,
          label: r.label,
          module_rights: r.module_rights ?? {},
          money_visibility: r.money_visibility ?? "none",
          is_system: false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles-list"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles-list"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">Roles &amp; permissions</h2>
      {isLoading && <div className="text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…</div>}
      {roles && (
        <div className="space-y-3">
          {roles.map((r) => (
            <RoleRow key={r.id} role={r} onSave={(patch) => upsert.mutate({ id: r.id, ...patch })} onDelete={() => {
              if (r.is_system) return;
              if (confirm(`Delete role "${r.label}"?`)) del.mutate(r.id);
            }} />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-md border border-dashed p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Plus className="h-4 w-4" /> New custom role
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Key</Label>
            <Input value={newKey} onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} placeholder="e.g. bookkeeper" className="w-48" />
          </div>
          <div>
            <Label className="text-xs">Label</Label>
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Displayed name" className="w-56" />
          </div>
          <Button
            size="sm"
            disabled={!newKey.trim() || !newLabel.trim() || upsert.isPending}
            onClick={() => {
              upsert.mutate({ key: newKey.trim(), label: newLabel.trim(), module_rights: {}, money_visibility: "none" });
              setNewKey(""); setNewLabel("");
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </section>
  );
}

function RoleRow({ role, onSave, onDelete }: { role: Role; onSave: (patch: Partial<Role>) => void; onDelete: () => void }) {
  const [rights, setRights] = useState<Record<string, RightLevel>>(() => ({ ...role.module_rights }));
  const [money, setMoney] = useState<MoneyVisibility>(role.money_visibility);
  const [label, setLabel] = useState(role.label);

  const dirty = useMemo(() => {
    if (label !== role.label) return true;
    if (money !== role.money_visibility) return true;
    for (const m of MODULES) {
      if ((rights[m] ?? "none") !== (role.module_rights[m] ?? "none")) return true;
    }
    return false;
  }, [label, money, rights, role]);

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="w-56 font-medium" />
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{role.key}</span>
        {role.is_system && <span className="rounded bg-secondary px-2 py-0.5 text-xs">system</span>}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Money</Label>
          <Select value={money} onValueChange={(v) => setMoney(v as MoneyVisibility)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONEY_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" disabled={!dirty} onClick={() => onSave({ label, module_rights: rights, money_visibility: money })}>
            Save
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={role.is_system} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {MODULES.map((m) => (
          <div key={m} className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm">
            <span>{m}</span>
            <Select
              value={rights[m] ?? "none"}
              onValueChange={(v) => setRights((prev) => ({ ...prev, [m]: v as RightLevel }))}
            >
              <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RIGHT_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- People / role assignment ---------------- */

function PeoplePanel() {
  const qc = useQueryClient();
  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, full_name, role_id").order("email");
      if (error) throw error;
      return data as ProfileRow[];
    },
  });
  const { data: roles } = useQuery({
    queryKey: ["roles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, key, label").order("label");
      if (error) throw error;
      return data as Pick<Role, "id" | "key" | "label">[];
    },
  });

  const assign = useMutation({
    mutationFn: async ({ id, role_id }: { id: string; role_id: string | null }) => {
      const { error } = await supabase.from("profiles").update({ role_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles-list"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">People</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Assign a role to each signed-in user. New users get a profile
        automatically on their first sign-in and start with no role until you
        assign one. Send them the app URL and ask them to sign up with their
        email — they will then appear here for role assignment.
      </p>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b py-2 pr-3">Email</th>
              <th className="border-b py-2 pr-3">Name</th>
              <th className="border-b py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id}>
                <td className="border-b py-2 pr-3">{p.email ?? "—"}</td>
                <td className="border-b py-2 pr-3">{p.full_name ?? "—"}</td>
                <td className="border-b py-2">
                  <Select
                    value={p.role_id ?? "__none"}
                    onValueChange={(v) => assign.mutate({ id: p.id, role_id: v === "__none" ? null : v })}
                  >
                    <SelectTrigger className="w-56"><SelectValue placeholder="No role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No role</SelectItem>
                      {(roles ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
