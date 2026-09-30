import type { TopProduct } from "@/lib/admin/types";
import { formatNumber, formatRupiah } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

/** Top produk sebagai daftar berperingkat dengan bar tipis (satu seri, label teks bertinta netral). */
export function TopProducts({ data, loading }: { data: TopProduct[] | undefined; loading?: boolean }) {
  if (loading) return <div className="flex flex-col gap-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (!data?.length) return <p className="py-10 text-center text-sm text-muted">Belum ada penjualan pada periode ini.</p>;
  const max = Math.max(...data.map((d) => d.qty), 1);
  return (
    <ol className="flex flex-col gap-4">
      {data.map((p, i) => (
        <li key={p.product_id} className="flex items-center gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream font-heading text-xs font-semibold text-ink">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium text-ink">{p.product_name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatNumber(p.qty)} <span className="font-normal text-muted">terjual</span></span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(p.qty / max) * 100}%` }} />
              </div>
              <span className="shrink-0 text-caption tabular-nums text-muted">{formatRupiah(p.revenue)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
