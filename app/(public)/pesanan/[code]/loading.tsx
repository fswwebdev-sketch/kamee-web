import { Skeleton } from "@/components/ui/skeleton";

export default function OrderLoading() {
  return (
    <div className="container-page max-w-3xl pt-24 pb-16 md:pt-28" aria-busy="true" aria-label="Memuat pesanan">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-6 h-40 rounded-3xl" />
      <Skeleton className="mt-4 h-60 rounded-3xl" />
    </div>
  );
}
