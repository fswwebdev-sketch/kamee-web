"use client";

import { can } from "@/lib/admin/permissions";
import { useOutletsRef } from "@/lib/admin/queries";
import { useAdminUi } from "@/lib/admin/store";
import type { AdminUser } from "@/lib/admin/types";
import { FilterSelect } from "./filters";

/** Filter outlet halaman (tersinkron dengan pemilih outlet di topbar). Admin Outlet: tidak ditampilkan. */
export function OutletFilter({ user }: { user: AdminUser }) {
  const outletId = useAdminUi((s) => s.outletId);
  const setOutletId = useAdminUi((s) => s.setOutletId);
  const outlets = useOutletsRef(can(user, "outlets.switch"));
  // Hanya satu outlet → filter tidak berguna
  if (!can(user, "outlets.switch") || (outlets.data?.length ?? 0) <= 1) return null;
  return (
    <FilterSelect label="Outlet" value={outletId ? String(outletId) : ""} onChange={(v) => setOutletId(v ? Number(v) : null)}>
      <option value="">Semua outlet</option>
      {(outlets.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </FilterSelect>
  );
}
