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
  const [mobileOpen, setMobileOpen] = useState(false);

  // close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
        <div className="mx-auto grid max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:gap-6 sm:px-8 sm:py-4">
          {/* Left: logo + mobile menu */}
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-paper p-0">
                <SheetHeader className="border-b border-[color:var(--rule-soft)] px-5 py-4">
                  <SheetTitle className="font-display text-lg italic tracking-tight text-[color:var(--walnut)]">
                    Atelier
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-2">
                  {visibleNav.map((n) => {
                    const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        className={cn(
                          "label-micro inline-flex items-center gap-3 rounded-sm px-3 py-3 transition-colors",
                          active
                            ? "bg-[color:var(--accent-tint)] text-foreground"
                            : "text-muted-foreground hover:bg-[color:var(--accent-tint)]/60 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.25} />
                        <span className="truncate">{n.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <img
                src={logoAsset.url}
                alt="Giana Allen Design"
                className="h-7 w-auto shrink-0 object-contain sm:h-8"
              />
              <span
                aria-hidden
                className="hidden h-6 w-px lg:block"
                style={{ background: "var(--accent-brass)", opacity: 0.5 }}
              />
              <span className="hidden font-display text-base italic tracking-tight text-[color:var(--walnut)] lg:inline">
                Atelier
              </span>
            </Link>
          </div>

          {/* Middle: desktop nav (scrollable on tablet) */}
          <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visibleNav.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "label-micro relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2 transition-colors",
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

          {/* Right: contextual actions + identity */}
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            {right}
            {previewKey && (
              <div
                className="label-micro hidden items-center gap-2 border border-[color:var(--primary)]/40 bg-[color:var(--accent-tint)] px-2 py-1 text-[color:var(--primary)] md:flex"
                title={`Previewing as ${previewRole?.label ?? previewKey}`}
              >
                <Eye className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                <span className="truncate">
                  Previewing as{" "}
                  <strong className="font-semibold">{previewRole?.label ?? previewKey}</strong>
                </span>
                <button
                  className="ml-1 px-1 hover:text-foreground"
                  onClick={() => setPreviewKey(null)}
                  title="Exit preview"
                >
                  ×
                </button>
              </div>
            )}
            {previewKey && (
              <button
                className="label-micro flex items-center gap-1 border border-[color:var(--primary)]/40 bg-[color:var(--accent-tint)] px-2 py-1 text-[color:var(--primary)] md:hidden"
                onClick={() => setPreviewKey(null)}
                title={`Previewing as ${previewRole?.label ?? previewKey} — tap to exit`}
                aria-label="Exit preview"
              >
                <Eye className="h-3 w-3" strokeWidth={1.5} />
                <span>×</span>
              </button>
            )}
            {profile?.role && (
              <span className="hidden min-w-0 max-w-[220px] truncate text-[11px] text-muted-foreground xl:inline">
                {profile.email} · <span className="text-foreground">{profile.role.label}</span>
              </span>
            )}
            {!profile?.role && profile && (
              <span className="hidden text-[11px] text-[color:var(--primary)] sm:inline">
                No role assigned
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </header>
      <main className="relative flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
