import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyCupIllustration, EmptyState } from "@/components/ui/misc";

export default function ProductNotFound() {
  return (
    <div className="container-page pt-28 pb-16">
      <EmptyState illustration={<EmptyCupIllustration />} title="Menu tidak ditemukan" description="Menu ini mungkin sudah tidak tersedia. Yuk lihat menu lainnya." action={<Link href="/menu" className={buttonClasses()}>Jelajahi Menu</Link>} />
    </div>
  );
}
