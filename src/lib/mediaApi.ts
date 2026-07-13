import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MediaRow = {
  id: string;
  product_id: string | null;
  item_id: string | null;
  room_id: string | null;
  file_url: string; // short-lived signed URL, resolved at read time
  kind: "photo" | "reference" | "lookbook";
  lookbook_section: string | null;
  created_at: string;
};

const ITEM_PHOTOS_BUCKET = "item-photos";
// Short-lived signed URLs generated on read. We no longer bake long-lived
// tokens into the database — see extractStoragePath below for legacy rows.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
// React Query stale time: refresh signed URLs well before they expire.
const SIGNED_URL_STALE_MS = 30 * 60 * 1000; // 30 minutes

// Accepts either a raw storage object path (new rows) or a legacy signed URL
// (existing rows created before the fix) and returns the storage object path.
export function extractStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/\/object\/(?:sign|public)\/item-photos\/([^?]+)/);
  if (match) return decodeURIComponent(match[1]);
  if (/^https?:\/\//i.test(value)) return null;
  return value;
}

async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(ITEM_PHOTOS_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  }
  return map;
}

async function resolveRows<T extends { file_url: string | null }>(rows: T[]): Promise<T[]> {
  const paths: string[] = [];
  const rowPaths = rows.map((r) => {
    const p = extractStoragePath(r.file_url);
    if (p) paths.push(p);
    return p;
  });
  const urlMap = await signPaths(paths);
  return rows.map((r, i) => {
    const p = rowPaths[i];
    return { ...r, file_url: (p && urlMap[p]) || "" } as T;
  });
}

export function useMediaForProduct(productId: string | null | undefined) {
  return useQuery({
    queryKey: ["media", "product", productId ?? ""],
    queryFn: async (): Promise<MediaRow[]> => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("product_id", productId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return resolveRows((data ?? []) as MediaRow[]);
    },
    enabled: !!productId,
    staleTime: SIGNED_URL_STALE_MS,
  });
}

export function useMediaForRoom(roomId: string | null | undefined) {
  return useQuery({
    queryKey: ["media", "room", roomId ?? ""],
    queryFn: async (): Promise<MediaRow[]> => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("room_id", roomId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return resolveRows((data ?? []) as MediaRow[]);
    },
    enabled: !!roomId,
    staleTime: SIGNED_URL_STALE_MS,
  });
}

// Batch-fetch the first photo per item id — used for thumbnails on list views.
export function useItemPhotoMap(itemIds: string[]) {
  const key = [...itemIds].sort().join(",");
  return useQuery({
    queryKey: ["media", "items", key],
    queryFn: async (): Promise<Record<string, string>> => {
      if (itemIds.length === 0) return {};
      const { data, error } = await supabase
        .from("media")
        .select("item_id, file_url, created_at")
        .in("item_id", itemIds)
        .eq("kind", "photo")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const firstByItem: Record<string, string> = {}; // itemId → path
      for (const row of (data ?? []) as { item_id: string | null; file_url: string }[]) {
        if (!row.item_id || firstByItem[row.item_id]) continue;
        const p = extractStoragePath(row.file_url);
        if (p) firstByItem[row.item_id] = p;
      }
      const urlMap = await signPaths(Object.values(firstByItem));
      const out: Record<string, string> = {};
      for (const [itemId, p] of Object.entries(firstByItem)) {
        if (urlMap[p]) out[itemId] = urlMap[p];
      }
      return out;
    },
    enabled: itemIds.length > 0,
    staleTime: SIGNED_URL_STALE_MS,
  });
}

export function useMediaForItem(itemId: string | null | undefined) {
  return useQuery({
    queryKey: ["media", "item", itemId ?? ""],
    queryFn: async (): Promise<MediaRow[]> => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .eq("item_id", itemId as string)
        .eq("kind", "photo")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return resolveRows((data ?? []) as MediaRow[]);
    },
    enabled: !!itemId,
    staleTime: SIGNED_URL_STALE_MS,
  });
}

// Sign an arbitrary storage path or legacy URL (e.g. rooms.image_url).
export function useSignedItemPhotoUrl(pathOrUrl: string | null | undefined) {
  const path = extractStoragePath(pathOrUrl);
  return useQuery({
    queryKey: ["signed-url", "item-photos", path ?? ""],
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from(ITEM_PHOTOS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
    staleTime: SIGNED_URL_STALE_MS,
  });
}

export function useUploadItemPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${itemId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(ITEM_PHOTOS_BUCKET)
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (upErr) throw upErr;
      // Store the raw storage path only — signed URLs are minted on read.
      const { data: row, error: insErr } = await supabase
        .from("media")
        .insert({
          item_id: itemId,
          kind: "photo",
          file_url: path,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      return row as MediaRow;
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["media", "item", vars.itemId] });
      qc.invalidateQueries({ queryKey: ["media", "items"] });
    },
  });
}

export function useDeleteItemPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mediaId, fileUrl, itemId }: { mediaId: string; fileUrl: string; itemId: string }) => {
      const path = extractStoragePath(fileUrl);
      if (path) {
        await supabase.storage.from(ITEM_PHOTOS_BUCKET).remove([path]);
      }
      const { error } = await supabase.from("media").delete().eq("id", mediaId);
      if (error) throw error;
      return { itemId };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["media", "item", res.itemId] });
      qc.invalidateQueries({ queryKey: ["media", "items"] });
    },
  });
}

// Upload a hero image for a room. Reuses the item-photos bucket under a
// `rooms/{roomId}/...` path. Stores the raw storage path on rooms.image_url —
// signed URLs are minted on read via useSignedItemPhotoUrl.
export function useUploadRoomImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, file }: { roomId: string; file: File }) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `rooms/${roomId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(ITEM_PHOTOS_BUCKET)
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || undefined,
        });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("rooms")
        .update({ image_url: path })
        .eq("id", roomId);
      if (updErr) throw updErr;
      return { roomId, path };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items-data"] });
    },
  });
}

export function useDeleteRoomImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roomId, fileUrl }: { roomId: string; fileUrl: string | null }) => {
      const path = extractStoragePath(fileUrl);
      if (path) {
        await supabase.storage.from(ITEM_PHOTOS_BUCKET).remove([path]);
      }
      const { error } = await supabase
        .from("rooms")
        .update({ image_url: null })
        .eq("id", roomId);
      if (error) throw error;
      return { roomId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items-data"] });
    },
  });
}
