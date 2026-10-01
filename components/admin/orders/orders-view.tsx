"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Columns3, ExternalLink, Rows3 } from "lucide-react";
import { DataTable } from "@/components/admin/ui/data-table";
import { FilterSelect, SearchInput, ymd } from "@/components/admin/ui/filters";
import { OutletFilter } from "@/components/admin/ui/outlet-filter";
import { PageHeader } from "@/components/admin/ui/page-header";
import { toApiQuery, useTableParams } from "@/components/admin/ui/use-table-params";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/misc";
import { useAdminList, useAdminSession, useEffectiveOutlet } from "@/lib/admin/queries";
import { useAdminUi } from "@/lib/admin/store";
import type { AdminOrder, Paginated } from "@/lib/admin/types";
import { CHANNEL_LABEL, FULFILLMENT_LABEL, ORDER_STATUS_LABEL } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/features/admin/realtime-store";
import { KanbanBoard } from "./kanban-board";
import { orderColumns } from "./order-columns";
import { OrderDetail } from "./order-detail";

function ViewToggle() {
  const view = useAdminUi((s) => s.ordersView);
  const setView = useAdminUi((s) => s.setOrdersView);
  const items = [
    { value: "kanban" as const, label: "Kanban", icon: Columns3 },
    { value: "table" as const, label: "Tabel", icon: Rows3 },
  ];
  return (
    <div role="radiogroup" aria-label="Tampilan pesanan" className="inline-flex rounded-xl border border-line bg-surface p-0.5">
      {items.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          onClick={() => setView(value)}
          className={cn("inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold transition", view === value ? "bg-primary text-on-primary shadow-soft" : "text-muted hover:text-ink")}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function OrdersView() {
  const { data: user } = useAdminSession();
  const outletId = useEffectiveOutlet(user);
  const view = useAdminUi((s) => s.ordersView);
  const markSeen = useRealtime((s) => s.markSeen);
  const unseen = useRealtime((s) => s.unseen);
  const [openId, setOpenId] = useState<number | null>(null);
  const { params, update, pending } = useTableParams({ perPage: 20, sort: "-created_at", filterKeys: ["status", "fulfillment", "channel", "dari", "sampai"] });

  useEffect(() => {
    if (unseen) markSeen();
  }, [unseen, markSeen]);

  const common = {
    "filter[outlet_id]": outletId ?? undefined,
    "filter[search]": params.search || undefined,
    "filter[fulfillment]": params.filters.fulfillment,
    "filter[channel]": params.filters.channel,
  };

  // Kanban: semua pesanan aktif + yang selesai/batal hari ini
  const today = ymd(new Date());
  const active = useAdminList<AdminOrder>("orders", { ...common, "filter[status]": "pending,paid,processing,shipped", per_page: 50, sort: "-created_at" }, { enabled: view === "kanban" });
  const done = useAdminList<AdminOrder>("orders", { ...common, "filter[status]": "completed,cancelled", "filter[from]": today, per_page: 50, sort: "-created_at" }, { enabled: view === "kanban" });
  const board = useMemo(() => [...((active.data as Paginated<AdminOrder> | undefined)?.data ?? []), ...((done.data as Paginated<AdminOrder> | undefined)?.data ?? [])], [active.data, done.data]);

  // Tabel: paginasi server
  const tableQuery = { ...toApiQuery(params, { dari: "filter[from]", sampai: "filter[to]" }), "filter[outlet_id]": outletId ?? undefined };
  const table = useAdminList<AdminOrder>("orders", tableQuery, { enabled: view === "table" });
  const tableData = table.data as Paginated<AdminOrder> | undefined;
  const columns = useMemo(() => orderColumns({ showOutlet: !outletId }), [outletId]);

  const filters = (
    <>
      <SearchInput value={params.search} onChange={(v) => update({ search: v })} placeholder="Kode, nama, atau nomor WA" label="Cari pesanan" />
      {user && <OutletFilter user={user} />}
      {view === "table" && (
        <FilterSelect label="Status" value={params.filters.status ?? ""} onChange={(v) => update({ filters: { status: v } })}>
          <option value="">Semua status</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </FilterSelect>
      )}
      <FilterSelect label="Layanan" value={params.filters.fulfillment ?? ""} onChange={(v) => update({ filters: { fulfillment: v } })}>
        <option value="">Semua layanan</option>
        {Object.entries(FULFILLMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </FilterSelect>
      <FilterSelect label="Kanal" value={params.filters.channel ?? ""} onChange={(v) => update({ filters: { channel: v } })} className="hidden lg:flex">
        <option value="">Semua kanal</option>
        {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </FilterSelect>
      {view === "table" && (
        <fieldset className="flex items-end gap-2">
          <legend className="sr-only">Rentang tanggal</legend>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Dari
            <input type="date" value={params.filters.dari ?? ""} max={params.filters.sampai || today} onChange={(e) => update({ filters: { dari: e.target.value } })} className="h-10 rounded-lg border border-line bg-bg px-3 text-sm font-normal normal-case tracking-normal text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Sampai
            <input type="date" value={params.filters.sampai ?? ""} min={params.filters.dari} max={today} onChange={(e) => update({ filters: { sampai: e.target.value } })} className="h-10 rounded-lg border border-line bg-bg px-3 text-sm font-normal normal-case tracking-normal text-ink" />
          </label>
        </fieldset>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title="Pesanan"
        description={view === "kanban" ? "Pesanan aktif dan yang selesai hari ini. Seret kartu atau pakai tombol aksi untuk mengubah status." : "Semua pesanan dengan filter dan paginasi."}
        actions={<ViewToggle />}
      />

      {view === "kanban" ? (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft md:p-4" role="group" aria-label="Filter pesanan">
            {filters}
          </div>
          {active.isError ? (
            <ErrorState onRetry={() => active.refetch()} />
          ) : (
            <>
              {((active.data as Paginated<AdminOrder> | undefined)?.meta?.total ?? 0) > 50 && (
                <p role="status" className="mb-3 rounded-xl bg-warning/12 px-4 py-2.5 text-sm text-ink">
                  Ada {(active.data as Paginated<AdminOrder>).meta.total} pesanan aktif; papan menampilkan 50 terbaru. Gunakan pencarian atau tampilan Tabel untuk melihat semuanya.
                </p>
              )}
              <KanbanBoard orders={board} loading={active.isPending || done.isPending} onOpen={(o) => setOpenId(o.id)} />
            </>
          )}
        </>
      ) : (
        <DataTable
          caption="Daftar pesanan"
          columns={columns}
          data={tableData?.data ?? []}
          total={tableData?.meta.total}
          loading={table.isPending}
          fetching={table.isFetching || pending}
          params={params}
          onParamsChange={update}
          onRowClick={(o) => setOpenId(o.id)}
          toolbar={filters}
          empty={{ title: "Tidak ada pesanan", description: "Coba ubah filter atau rentang tanggal." }}
        />
      )}

      <Dialog
        open={openId !== null}
        onClose={() => setOpenId(null)}
        size="2xl"
        title="Detail pesanan"
        description={
          openId ? (
            <Link href={`/admin/pesanan/${openId}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Buka di halaman penuh <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          ) : undefined
        }
      >
        {openId !== null && <OrderDetail id={openId} />}
      </Dialog>
    </>
  );
}

