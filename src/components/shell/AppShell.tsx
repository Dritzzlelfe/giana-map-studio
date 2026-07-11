import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Grid3x3, ListTree, Home as HomeIcon, Network, LayoutDashboard, LogOut, Shield, Eye } from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  hasRight,
  useCurrentProfile,
  usePreviewRoleKey,
  type ModuleKey,
} from "@/lib/useCurrentProfile";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

const NAV: { to: string; label: string; icon: typeof Grid3x3; exact: boolean; module: ModuleKey }[] = [
  { to: "/", label: "Matrix", icon: Grid3x3, exact: true, module: "matrix" },
  { to: "/schedule", label: "Schedule", icon: ListTree, exact: false, module: "schedule" },
  { to: "/room", label: "Room", icon: HomeIcon, exact: false, module: "room" },
  { to: "/map", label: "Mind map", icon: Network, exact: false, module: "matrix" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false, module: "matrix" },
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
    if (previewRole?.module_rights) return previewRole.module_rights as Record<string, "none" | "view" | "edit">;
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
    <div className="flex h-screen flex-col bg-background">
      <Toaster richColors position="top-right" />
      <header className="shrink-0 border-b bg-card/60 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4 px-5 py-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Giana Allen Design <span className="text-muted-foreground">— Project Map</span>
            </h1>
          </div>
          <nav className="ml-4 flex items-center gap-1 rounded-md border bg-card p-1">
            {visibleNav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          {right}
          {previewKey && (
            <div className="flex items-center gap-2 rounded-md border border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-900">
              <Eye className="h-3.5 w-3.5" />
              Previewing as <strong>{previewRole?.label ?? previewKey}</strong>
              <button
                className="ml-1 rounded px-1 text-amber-900 hover:bg-amber-100"
                onClick={() => setPreviewKey(null)}
                title="Exit preview"
              >
                ×
              </button>
            </div>
          )}
          {profile?.role && (
            <span className="text-xs text-muted-foreground">
              {profile.email} · {profile.role.label}
            </span>
          )}
          {!profile?.role && profile && (
            <span className="text-xs text-amber-700">No role assigned</span>
          )}
          <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="relative flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
