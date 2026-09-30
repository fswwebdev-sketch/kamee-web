"use client";

import { PromoCard } from "@/components/content/promo-card";
import { EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { useVouchers } from "@/lib/queries/account";

export default function VouchersPage() {
  const { data, isLoading } = useVouchers();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h2">Voucher Saya</h1>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : !data?.length ? (
        <EmptyState title="Belum ada voucher" description="Voucher baru akan muncul di sini. Cek juga halaman Promo." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">{data.map((v) => <li key={v.id}><PromoCard promo={v} /></li>)}</ul>
      )}
    </div>
  );
}
