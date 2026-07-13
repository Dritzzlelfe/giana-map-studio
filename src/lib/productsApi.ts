import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  width_in: number | null;
  length_in: number | null;
  height_in: number | null;
  depth_in: number | null;
  finish: string | null;
  material: string | null;
  sku: string | null;
  default_vendor_id: string | null;
};

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Product) ?? null;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Product;
}
