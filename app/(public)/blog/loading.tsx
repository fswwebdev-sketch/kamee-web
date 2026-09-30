import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <div className="container-page pt-24 pb-16 md:pt-28" aria-busy="true" aria-label="Memuat blog">
      <Skeleton className="h-10 w-56" />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <li key={i}><Skeleton className="h-80 rounded-2xl" /></li>)}</ul>
    </div>
  );
}
