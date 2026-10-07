import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

const STORES = [
  { key: "gofood", label: "GoFood", href: env.gofoodUrl },
  { key: "grabfood", label: "GrabFood", href: env.grabfoodUrl },
  { key: "shopeefood", label: "ShopeeFood", href: env.shopeefoodUrl },
].filter((s) => s.href);

/** Tombol ke toko Kamee di aplikasi ojek online. Tidak tampil sampai link diisi (NEXT_PUBLIC_GOFOOD_URL, dst.). */
export function OjolLinks({ className }: { className?: string }) {
  if (STORES.length === 0) return null;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm font-semibold text-ink">Pesan juga di</p>
      <div className="flex flex-wrap gap-2">
        {STORES.map((s) => (
          <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}
