"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, PackageX, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/lib/admin/api";
import { adminKeys, errorMessage, useOutletsRef } from "@/lib/admin/queries";
import type { AdminProduct, AdminUser, Outlet, Paginated } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

/*
 * Stok per outlet: produk ditandai "habis" per outlet lewat
 * PATCH admin/outlets/{outlet}/products/{product} { is_available }.
 * Super Admin mengelola semua outlet; Admin Outlet hanya outletnya sendiri.
 */

interface AvailabilityVars {
  outletId: number;
  product: Pick<AdminProduct, "id" | "name">;
  available: boolean;
}

function patchProduct(p: AdminProduct, v: AvailabilityVars): AdminProduct {
  if (p.id !== v.product.id) return p;
  const rest = p.unavailable_outlet_ids.filter((id) => id !== v.outletId);
  return { ...p, unavailable_outlet_ids: v.available ? rest : [...rest, v.outletId] };
}

/** Toggle tersedia/habis dengan pembaruan optimistis pada cache daftar & detail produk. */
export function useSetAvailability() {
  const qc = useQueryClient();
  const key = adminKeys.resource("products");
  return useMutation({
    mutationFn: (v: AvailabilityVars) =>
      adminApi<{ message: string }>(`outlets/${v.outletId}/products/${v.product.id}`, { method: "PATCH", body: { is_available: v.available } }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueriesData({ queryKey: key });
      qc.setQueriesData<Paginated<AdminProduct> | AdminProduct>({ queryKey: key }, (old) => {
        if (!old) return old;
        if ("data" in old && Array.isArray(old.data)) return { ...old, data: old.data.map((p) => patchProduct(p, v)) };
        if ("unavailable_outlet_ids" in old) return patchProduct(old, v);
        return old;
      });
      return { snapshot };
    },
    onError: (e, _v, ctx) => {
      ctx?.snapshot.forEach(([k, data]) => qc.setQueryData(k, data));
      toast.error("Gagal mengubah stok", { description: errorMessage(e) });
    },
    onSuccess: (res) => toast.success(res.message),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Outlet yang boleh dilihat/diatur pengguna ini. */
export function useManagedOutlets(user: AdminUser | undefined) {
  const outlets = useOutletsRef(Boolean(user));
  const data = (outlets.data ?? []).filter((o) => user?.role !== "outlet_admin" || o.id === user.outlet_id);
  return { ...outlets, data };
}

/** Daftar toggle tersedia/habis per outlet. */
export function OutletStockList({ product, outlets, loading, className }: { product: AdminProduct; outlets: Outlet[]; loading?: boolean; className?: string }) {
  const setAvailability = useSetAvailability();
  const trashed = Boolean(product.deleted_at);

  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (outlets.length === 0) return <p className="text-sm text-muted">Belum ada outlet.</p>;

  return (
    <ul className={cn("flex flex-col divide-y divide-line rounded-xl border border-line", className)}>
      {outlets.map((o) => {
        const available = !product.unavailable_outlet_ids.includes(o.id);
        const busy = setAvailability.isPending && setAvailability.variables?.outletId === o.id && setAvailability.variables.product.id === product.id;
        return (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", available ? "bg-success/12 text-success" : "bg-danger/12 text-danger")}>
                {available ? <PackageCheck className="size-4" aria-hidden="true" /> : <PackageX className="size-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{o.name}</p>
                <p className={available ? "text-caption text-muted" : "text-caption text-danger"}>{available ? "Tersedia untuk dipesan" : "Ditandai habis"}</p>
              </div>
            </div>
            <Switch
              label={available ? "Tersedia" : "Habis"}
              checked={available}
              disabled={busy || trashed}
              onChange={(v) => setAvailability.mutate({ outletId: o.id, product, available: v })}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Ringkasan di sel tabel: outlet mana yang habis. */
export function StockSummary({ product, outlets }: { product: AdminProduct; outlets: Outlet[] }) {
  const soldOut = outlets.filter((o) => product.unavailable_outlet_ids.includes(o.id));
  if (outlets.length === 0) return <span className="text-caption text-muted">—</span>;
  if (soldOut.length === 0) return <Badge tone="success" className="whitespace-nowrap">{outlets.length === 1 ? "Tersedia" : "Tersedia semua"}</Badge>;
  return (
    <div className="flex flex-wrap gap-1">
      {soldOut.map((o) => (
        <Badge key={o.id} tone="danger" className="whitespace-nowrap">Habis · {o.name.replace(/^Kamee Coffee\s+/i, "")}</Badge>
      ))}
    </div>
  );
}

export function StockDialog({ product, outlets, loading, onClose }: { product: AdminProduct | null; outlets: Outlet[]; loading?: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={product !== null}
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <Store className="size-5 text-primary" aria-hidden="true" /> Stok outlet
        </span>
      }
      description={product ? `Tandai ${product.name} habis di outlet yang kehabisan bahan. Pelanggan tidak bisa memesannya di outlet tersebut.` : undefined}
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Selesai</Button>
        </div>
      }
    >
      {product && <OutletStockList product={product} outlets={outlets} loading={loading} />}
    </Dialog>
  );
}
