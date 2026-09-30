"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DataTable } from "@/components/admin/ui/data-table";
import { FilterSelect, SearchInput } from "@/components/admin/ui/filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { toApiQuery, useTableParams } from "@/components/admin/ui/use-table-params";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/misc";
import { useAdminList } from "@/lib/admin/queries";
import type { AdminCustomer, Paginated } from "@/lib/admin/types";
import { formatDate, formatNumber, formatPhone, formatRupiah } from "@/lib/format";
import { tierTone, useTierCatalog } from "./tiers";

export function CustomerList() {
  const router = useRouter();
  const { params, update } = useTableParams({ perPage: 20, sort: "-created_at", filterKeys: ["tier_id"] });
  const list = useAdminList<AdminCustomer>("customers", toApiQuery(params));
  const page = list.data as Paginated<AdminCustomer> | undefined;
  const rows = useMemo(() => page?.data ?? [], [page]);
  const tiers = useTierCatalog(rows.map((r) => r.tier));

  const columns = useMemo<ColumnDef<AdminCustomer, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Pelanggan",
        enableSorting: true,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={c.name} className="size-9 text-xs" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <p className="truncate text-caption text-muted">
                  <span className="tabular-nums">{formatPhone(c.phone_wa)}</span>
                  {c.email && <span className="hidden xl:inline"> · {c.email}</span>}
                </p>
                {c.email && <p className="truncate text-caption text-muted xl:hidden">{c.email}</p>}
              </div>
            </div>
          );
        },
      },
      {
        id: "tier",
        header: "Tier",
        cell: ({ row }) => (row.original.tier ? <Badge tone={tierTone(row.original.tier.name)}>{row.original.tier.name}</Badge> : <span className="text-muted">—</span>),
      },
      {
        accessorKey: "points_balance",
        header: "Poin",
        enableSorting: true,
        meta: { align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.points_balance)}</span>,
      },
      {
        accessorKey: "lifetime_spend",
        header: "Total belanja",
        enableSorting: true,
        meta: { align: "right" },
        cell: ({ row }) => <span className="font-semibold tabular-nums">{formatRupiah(row.original.lifetime_spend)}</span>,
      },
      {
        accessorKey: "orders_count",
        header: "Pesanan",
        meta: { align: "right", className: "hidden lg:table-cell" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.orders_count ?? 0)}</span>,
      },
      {
        accessorKey: "created_at",
        header: "Terdaftar",
        enableSorting: true,
        meta: { className: "hidden lg:table-cell" },
        cell: ({ row }) => <span className="whitespace-nowrap text-muted">{formatDate(row.original.created_at, { day: "numeric", month: "short", year: "numeric" })}</span>,
      },
    ],
    [],
  );

  const filtered = Boolean(params.search || params.filters.tier_id);

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description="Member terdaftar, tier loyalitas, saldo poin, dan riwayat belanja."
        breadcrumb={[{ label: "Pelanggan" }]}
      />
      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : (
        <DataTable
          caption="Daftar pelanggan"
          columns={columns}
          data={rows}
          total={page?.meta.total}
          loading={list.isPending}
          fetching={list.isFetching}
          params={params}
          onParamsChange={update}
          getRowId={(c) => String(c.id)}
          onRowClick={(c) => router.push(`/admin/pelanggan/${c.id}`)}
          toolbar={
            <>
              <SearchInput value={params.search} onChange={(v) => update({ search: v })} placeholder="Nama, nomor WA, atau email" label="Cari pelanggan" />
              <FilterSelect label="Tier" value={params.filters.tier_id ?? ""} onChange={(v) => update({ filters: { tier_id: v } })}>
                <option value="">Semua tier</option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </FilterSelect>
            </>
          }
          empty={
            filtered
              ? { title: "Tidak ada pelanggan yang cocok", description: "Coba ubah kata kunci atau filter tier." }
              : { title: "Belum ada pelanggan", description: "Pelanggan muncul di sini setelah mendaftar lewat OTP WhatsApp." }
          }
        />
      )}
    </>
  );
}
