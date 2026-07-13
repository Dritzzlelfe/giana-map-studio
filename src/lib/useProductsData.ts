import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProduct, updateProduct, type Product } from "./productsApi";
import { ITEMS_QK } from "./useItemsData";

export const productQK = (id: string) => ["product", id] as const;

export function useProduct(id: string | null | undefined) {
  return useQuery({
    queryKey: productQK(id ?? ""),
    queryFn: () => fetchProduct(id as string),
    enabled: !!id,
  });
}

export function useUpdateProduct(id: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Product>) => updateProduct(id as string, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productQK(id ?? "") });
      qc.invalidateQueries({ queryKey: ITEMS_QK });
    },
    onError: (e: Error) => toast.error(`Couldn't update product: ${e.message}`),
  });
}
