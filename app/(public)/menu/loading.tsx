import { ProductCardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function MenuLoading() {
  return (
    <div className="container-page pt-24 pb-16 md:pt-28" aria-busy="true" aria-label="Memuat menu">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-10 w-64" />
      <Skeleton className="mt-6 h-12 w-full rounded-xl" />
      <div className="mt-3 flex gap-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-24" />)}</div>
      <ul className="mt-6 grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <li key={i}><ProductCardSkeleton /></li>)}
      </ul>
    </div>
  );
}
