import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MediaRow = {
  id: string;
  product_id: string | null;
  item_id: string | null;
  room_id: string | null;
  file_url: string;
  kind: "photo" | "reference" | "lookbook";
  lookbook_section: string | null;
  created_at: string;
};

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
      return (data ?? []) as MediaRow[];
    },
    enabled: !!productId,
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
      return (data ?? []) as MediaRow[];
    },
    enabled: !!roomId,
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
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { item_id: string | null; file_url: string }[]) {
        if (row.item_id && !map[row.item_id]) map[row.item_id] = row.file_url;
      }
      return map;
    },
    enabled: itemIds.length > 0,
  });
}

const ITEM_PHOTOS_BUCKET = "item-photos";
// 10-year signed URL — bucket is private, so we bake a long-lived signed URL
// into media.file_url so <img src> works everywhere without extra fetches.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

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
      return (data ?? []) as MediaRow[];
    },
    enabled: !!itemId,
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
      const { data: signed, error: signErr } = await supabase.storage
        .from(ITEM_PHOTOS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signErr) throw signErr;
      const { data: row, error: insErr } = await supabase
        .from("media")
        .insert({
          item_id: itemId,
          kind: "photo",
          file_url: signed.signedUrl,
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
      // Extract the storage object path from the signed URL.
      const match = fileUrl.match(/\/object\/sign\/item-photos\/([^?]+)/);
      if (match) {
        await supabase.storage.from(ITEM_PHOTOS_BUCKET).remove([decodeURIComponent(match[1])]);
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
// `rooms/{roomId}/...` path and stores a long-lived signed URL on rooms.image_url.
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
      const { data: signed, error: signErr } = await supabase.storage
        .from(ITEM_PHOTOS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signErr) throw signErr;
      const { error: updErr } = await supabase
        .from("rooms")
        .update({ image_url: signed.signedUrl })
        .eq("id", roomId);
      if (updErr) throw updErr;
      return { roomId, url: signed.signedUrl };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items-data"] });
    },
  });
}

