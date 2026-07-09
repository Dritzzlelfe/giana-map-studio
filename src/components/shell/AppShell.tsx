import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Grid3x3, ListTree, Home as HomeIcon, Network, LayoutDashboard, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";


const NAV = [
  { to: "/", label: "Matrix", icon: Grid3x3, exact: true },
  { to: "/schedule", label: "Schedule", icon: ListTree, exact: false },
  { to: "/room", label: "Room", icon: HomeIcon, exact: false },
  { to: "/map", label: "Mind map", icon: Network, exact: false },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false },
] as const;

export function AppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const qc = useQueryClient();
  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }
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
            {NAV.map((n) => {
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
          <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="relative flex flex-1 min-h-0 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
