import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyCupIllustration } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <main id="konten" className="grid min-h-svh place-items-center px-4 py-16 text-center">
      <div className="flex max-w-md flex-col items-center gap-4">
        <EmptyCupIllustration />
        <p className="font-heading text-6xl font-bold text-primary">404</p>
        <h1 className="text-h2">Halaman tidak ditemukan</h1>
        <p className="text-muted">Sepertinya cangkir ini kosong. Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClasses()}>Ke Beranda</Link>
          <Link href="/menu" className={buttonClasses("outline")}>Lihat Menu</Link>
        </div>
      </div>
    </main>
  );
}
