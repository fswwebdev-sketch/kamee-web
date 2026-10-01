import { Skeleton } from "@/components/ui/skeleton";

export default function OutletLoading() {
  return (
    <div className="container-page pt-24 pb-16 md:pt-28" aria-busy="true" aria-label="Memuat outlet">
      <Skeleton className="h-10 w-56" />
      <ul className="mt-6 grid gap-5 md:grid-cols-2">{Array.from({ length: 2 }, (_, i) => <li key={i}><Skeleton className="h-96 rounded-3xl" /></li>)}</ul>
    </div>
  );
}
