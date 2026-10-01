import { Skeleton } from "@/components/ui/skeleton";

export default function PromoLoading() {
  return (
    <div className="container-page pt-24 pb-16 md:pt-28" aria-busy="true" aria-label="Memuat promo">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <ul className="mt-8 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <li key={i}><Skeleton className="h-36 rounded-3xl" /></li>)}</ul>
    </div>
  );
}
