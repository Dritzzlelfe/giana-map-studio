import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  Grid3x3,
  ListTree,
  Home as HomeIcon,
  Network,
  LayoutDashboard,
  LogOut,
  Shield,
  Eye,
  ClipboardCheck,
  Wallet,
  Banknote,
  Truck,
  Menu,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  hasRight,
  useCurrentProfile,
  usePreviewRoleKey,
  type ModuleKey,
} from "@/lib/useCurrentProfile";
import logoAsset from "@/assets/giana-allen-logo.webp.asset.json";


const NAV: {
  to: string;
  label: string;
  icon: typeof Grid3x3;
  exact: boolean;
  module: ModuleKey;
}[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false, module: "matrix" },
  { to: "/room", label: "Rooms", icon: HomeIcon, exact: false, module: "room" },
  { to: "/", label: "Matrix", icon: Grid3x3, exact: true, module: "matrix" },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck, exact: false, module: "approvals" },
  { to: "/schedule", label: "Schedule", icon: ListTree, exact: false, module: "schedule" },
  { to: "/budget", label: "Budget", icon: Wallet, exact: false, module: "budget" },
  { to: "/cashflow", label: "Cashflow", icon: Banknote, exact: false, module: "cashflow" },
  { to: "/logistics", label: "Logistics", icon: Truck, exact: false, module: "logistics" },
  { to: "/map", label: "Mind map", icon: Network, exact: false, module: "matrix" },
  { to: "/admin", label: "Admin", icon: Shield, exact: false, module: "admin" },
];


export function AppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const [previewKey, setPreviewKey] = usePreviewRoleKey();

  // Optional preview override: fetch roles and swap rights in memory when admin
  const { data: previewRole } = useQuery({
    queryKey: ["preview-role", previewKey],
    queryFn: async () => {
      if (!previewKey) return null;
      const { data, error } = await supabase
        .from("roles")
        .select("key, label, module_rights, money_visibility")
        .eq("key", previewKey)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!previewKey,
  });

  const effectiveRights = useMemo(() => {
    if (previewRole?.module_rights)
      return previewRole.module_rights as Record<string, "none" | "view" | "edit">;
    return (profile?.role?.module_rights ?? {}) as Record<string, "none" | "view" | "edit">;
  }, [previewRole, profile]);

  const isAdmin = ["owner", "super_admin", "admin"].includes(profile?.role?.key ?? "");

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    setPreviewKey(null);
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const visibleNav = NAV.filter((n) => {
    if (n.module === "admin") return isAdmin; // admin link only for real admins
    return hasRight(effectiveRights, n.module, "view");
  });

  return (
    <div className="flex h-screen flex-col bg-paper">
      <Toaster richColors position="top-right" />
      <header className="shrink-0 border-b border-[color:var(--rule-soft)] bg-paper">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-6 px-8 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Giana Allen Design"
              className="h-8 w-auto object-contain"
            />
            <span
              aria-hidden
              className="hidden h-6 w-px sm:block"
              style={{ background: "var(--accent-brass)", opacity: 0.5 }}
            />
            <span className="hidden font-display text-base italic tracking-tight text-[color:var(--walnut)] sm:inline">
              Atelier
            </span>
          </Link>

          <nav className="ml-2 flex items-center gap-1">
            {visibleNav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "label-micro relative inline-flex items-center gap-1.5 px-3 py-2 transition-colors",
                    active
                      ? "text-foreground after:absolute after:inset-x-2 after:-bottom-[13px] after:h-[2px] after:bg-[color:var(--accent-brass)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.25} />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />
          {right}
          {previewKey && (
            <div className="label-micro flex items-center gap-2 border border-[color:var(--primary)]/40 bg-[color:var(--accent-tint)] px-2 py-1 text-[color:var(--primary)]">
              <Eye className="h-3 w-3" strokeWidth={1.5} />
              Previewing as{" "}
              <strong className="font-semibold">{previewRole?.label ?? previewKey}</strong>
              <button
                className="ml-1 px-1 hover:text-foreground"
                onClick={() => setPreviewKey(null)}
                title="Exit preview"
              >
                ×
              </button>
            </div>
          )}
          {profile?.role && (
            <span className="text-[11px] text-muted-foreground">
              {profile.email} · <span className="text-foreground">{profile.role.label}</span>
            </span>
          )}
          {!profile?.role && profile && (
            <span className="text-[11px] text-[color:var(--primary)]">No role assigned</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </header>
      <main className="relative flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
