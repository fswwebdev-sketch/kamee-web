import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="container-page pt-24 pb-16 md:pt-28" aria-busy="true" aria-label="Memuat produk">
      <Skeleton className="h-4 w-48" />
      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-3xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
