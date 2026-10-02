"use client";

import { useEffect } from "react";
import { Store } from "lucide-react";
import { useCartStore } from "@/features/cart/store";
import { useCartHydrated } from "@/features/cart/hooks";
import { formatHour } from "@/lib/format";
import { useOutlets } from "@/lib/queries/content";

export function OutletPicker({ id = "outlet" }: { id?: string }) {
  const { data: outlets = [] } = useOutlets();
  const outletId = useCartStore((s) => s.outletId);
  const setOutlet = useCartStore((s) => s.setOutlet);
  const hydrated = useCartHydrated();

  useEffect(() => {
    if (hydrated && outlets.length && !outlets.some((o) => o.id === outletId)) setOutlet(outlets[0]!.id);
  }, [hydrated, outlets, outletId, setOutlet]);

  const selected = outlets.find((o) => o.id === outletId);
  // Satu outlet: tampilkan sebagai info (tanpa dropdown).
  if (outlets.length === 1 && selected) {
    return (
      <div className="flex flex-col gap-1.5" id={id}>
        <p className="flex items-center gap-2 text-sm font-medium text-ink"><Store className="size-4 text-primary" aria-hidden="true" /> {selected.name}</p>
        <p className="text-caption text-muted">
          {selected.is_open_now ? "Buka" : "Tutup"} · {formatHour(selected.open_time)}–{formatHour(selected.close_time)} WIB · antar s.d. {selected.delivery_radius_km} km
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-ink"><Store className="size-4 text-primary" aria-hidden="true" /> Outlet</label>
      <select
        id={id}
        value={outletId ?? ""}
        onChange={(e) => setOutlet(Number(e.target.value))}
        className="h-11 rounded-lg border border-line bg-bg px-3 text-ink focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20"
      >
        {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {selected && (
        <p className="text-caption text-muted">
          {selected.is_open_now ? "Buka" : "Tutup"} · {formatHour(selected.open_time)}–{formatHour(selected.close_time)} WIB · antar s.d. {selected.delivery_radius_km} km
        </p>
      )}
    </div>
  );
}
