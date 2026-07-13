import { supabase } from "@/integrations/supabase/client";

export type ApprovalMode = "dashboard" | "verbal_logged" | "declined";

export type Approval = {
  id: string;
  item_id: string;
  decided_by: string | null; // people.id
  decided_at: string | null;
  mode: ApprovalMode;
  logged_by: string | null; // profiles.id
  note: string | null;
  created_at: string;
};

export async function fetchApprovalsForItem(itemId: string): Promise<Approval[]> {
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Approval[];
}

export async function fetchAllApprovals(): Promise<Approval[]> {
  const { data, error } = await supabase
    .from("approvals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Approval[];
}

export async function createApproval(
  patch: Omit<Approval, "id" | "created_at">,
): Promise<Approval> {
  const { data, error } = await supabase.from("approvals").insert(patch).select("*").single();
  if (error) throw error;
  return data as Approval;
}
