"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Globe, MessageCircle, Store } from "lucide-react";
import { Badge, PaymentBadge, StatusBadge } from "@/components/ui/badge";
import type { AdminOrder } from "@/lib/admin/types";
import { CHANNEL_LABEL } from "@/lib/admin/types";
import { formatRupiah } from "@/lib/format";

export function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

export function dateTimeShort(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

const channelIcon = { web: Globe, whatsapp: MessageCircle, pos: Store } as const;

export function ChannelTag({ channel }: { channel: AdminOrder["channel"] }) {
  const Icon = channelIcon[channel];
  return (
    <span className="inline-flex items-center gap-1 text-caption text-muted">
      <Icon className="size-3.5" aria-hidden="true" />
      {CHANNEL_LABEL[channel]}
    </span>
  );
}

export function orderColumns({ showOutlet }: { showOutlet: boolean }): ColumnDef<AdminOrder, unknown>[] {
  return [
    {
      id: "code",
      header: "Pesanan",
      cell: ({ row: { original: o } }) => (
        <div className="flex flex-col">
          <Link href={`/admin/pesanan/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold tracking-wide text-ink hover:text-primary hover:underline">
            {o.code}
          </Link>
          <ChannelTag channel={o.channel} />
        </div>
      ),
    },
    {
      id: "customer",
      header: "Pelanggan",
      cell: ({ row: { original: o } }) => (
        <div className="flex max-w-48 flex-col">
          <span className="truncate font-medium">{o.customer_name}</span>
          <span className="text-caption text-muted">{o.fulfillment_label}</span>
        </div>
      ),
    },
    ...(showOutlet
      ? [{ id: "outlet", header: "Outlet", meta: { className: "hidden xl:table-cell" }, cell: ({ row: { original: o } }) => <span className="text-muted">{o.outlet?.name.replace("Kamee Coffee ", "")}</span> } as ColumnDef<AdminOrder, unknown>]
      : []),
    {
      id: "status",
      header: "Status",
      cell: ({ row: { original: o } }) => <StatusBadge status={o.status} label={o.status_label} />,
    },
    {
      id: "payment",
      header: "Pembayaran",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row: { original: o } }) =>
        o.payment ? (
          <div className="flex flex-col items-start gap-1">
            <span className="text-caption font-medium text-ink">{o.payment.method_label}</span>
            <PaymentBadge status={o.payment.status} label={o.payment.status_label} />
          </div>
        ) : (
          <Badge>—</Badge>
        ),
    },
    {
      id: "total",
      accessorKey: "total",
      header: "Total",
      enableSorting: true,
      meta: { align: "right" },
      cell: ({ row: { original: o } }) => <span className="font-semibold">{formatRupiah(o.total)}</span>,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Waktu",
      enableSorting: true,
      meta: { align: "right" },
      cell: ({ row: { original: o } }) => (
        <time dateTime={o.created_at} title={dateTimeShort(o.created_at)} className="whitespace-nowrap text-muted">
          {relativeTime(o.created_at)}
        </time>
      ),
    },
  ];
}
