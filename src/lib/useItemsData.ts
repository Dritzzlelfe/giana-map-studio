import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createItem,
  createPerson,
  createVendor,
  deleteItem,
  loadAll,
  updateItem,
  updateVendor,
  type Item,
  type Person,
  type Vendor,
} from "./itemsApi";

export const ITEMS_QK = ["items-data"] as const;

export function useItemsData() {
  return useQuery({ queryKey: ITEMS_QK, queryFn: loadAll });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Item> & { title: string }) => createItem(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_QK }),
    onError: (e: Error) => toast.error(`Couldn't create item: ${e.message}`),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Item> }) => updateItem(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_QK }),
    onError: (e: Error) => toast.error(`Couldn't update item: ${e.message}`),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_QK }),
    onError: (e: Error) => toast.error(`Couldn't delete item: ${e.message}`),
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Vendor> & { name: string }) => createVendor(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_QK }),
    onError: (e: Error) => toast.error(`Couldn't create vendor: ${e.message}`),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Vendor> }) => updateVendor(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_QK }),
    onError: (e: Error) => toast.error(`Couldn't update vendor: ${e.message}`),
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Person> & { name: string }) => createPerson(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_QK }),
    onError: (e: Error) => toast.error(`Couldn't create person: ${e.message}`),
  });
}
