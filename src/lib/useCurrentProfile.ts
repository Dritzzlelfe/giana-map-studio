import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModuleKey =
  | "matrix" | "room" | "schedule" | "item" | "budget" | "cashflow"
  | "logistics" | "library" | "inventory" | "lookbook" | "intake"
  | "ai" | "scheduling" | "approvals" | "people_vendors" | "admin";

export type RightLevel = "none" | "view" | "edit";
export type MoneyVisibility = "full" | "client_price" | "none";

export type CurrentProfile = {
  userId: string;
  email: string | null;
  full_name: string | null;
  role: {
    id: string;
    key: string;
    label: string;
    is_system: boolean;
    module_rights: Record<string, RightLevel>;
    money_visibility: MoneyVisibility;
  } | null;
};

export const CURRENT_PROFILE_QK = ["current-profile"] as const;

async function fetchCurrentProfile(): Promise<CurrentProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role:roles(id, key, label, is_system, module_rights, money_visibility)")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  const role = (data?.role ?? null) as CurrentProfile["role"];
  return {
    userId: user.id,
    email: (data?.email ?? user.email) ?? null,
    full_name: data?.full_name ?? null,
    role,
  };
}

export function useCurrentProfile() {
  return useQuery({
    queryKey: CURRENT_PROFILE_QK,
    queryFn: fetchCurrentProfile,
    staleTime: 30_000,
  });
}

// Client-side "preview as role" override for admins.
const PREVIEW_KEY = "gad_preview_role_key";

export function usePreviewRoleKey(): [string | null, (v: string | null) => void] {
  const [key, setKey] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(PREVIEW_KEY),
  );
  useEffect(() => {
    const onChange = () => setKey(window.sessionStorage.getItem(PREVIEW_KEY));
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, []);
  const update = (v: string | null) => {
    if (typeof window === "undefined") return;
    if (v) window.sessionStorage.setItem(PREVIEW_KEY, v);
    else window.sessionStorage.removeItem(PREVIEW_KEY);
    setKey(v);
    window.dispatchEvent(new Event("storage"));
  };
  return [key, update];
}

export function hasRight(
  rights: Record<string, RightLevel> | undefined | null,
  module: ModuleKey,
  level: RightLevel,
): boolean {
  const r = rights?.[module] ?? "none";
  if (level === "none") return true;
  if (level === "view") return r === "view" || r === "edit";
  return r === "edit";
}
