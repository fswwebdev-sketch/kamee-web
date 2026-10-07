import type { Metadata } from "next";
import Image from "next/image";
import { OutletMap } from "@/components/home/outlet-map";
import { Breadcrumb, JsonLd } from "@/components/ui/misc";
import { getOutlets } from "@/lib/data";
import { OPEN_DAYS, formatHour } from "@/lib/format";
import { buildMetadata, cafeJsonLd } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Outlet",
  description: "Lokasi & jam buka Kamee Coffee: Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Tangerang. Buka Senin–Sabtu 10.00–17.00 WIB, Minggu tutup.",
  path: "/outlet",
});

export default async function OutletPage() {
  const outlets = await getOutlets();
  return (
    <>
      <JsonLd data={cafeJsonLd(outlets)} />
      <div className="container-page pt-24 md:pt-28">
        <Breadcrumb items={[{ label: "Beranda", href: "/" }, { label: "Outlet" }]} />
        <ul className={`mt-6 grid gap-5 ${outlets.length > 1 ? "md:grid-cols-2" : "max-w-3xl"}`}>
          {outlets.map((o, i) => (
            <li key={o.id} id={o.slug} className="grid overflow-hidden rounded-3xl border border-line bg-surface sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="relative aspect-[2/3] bg-[#FFFBE2]">
                <Image
                  src="/images/outlets/kamee-open.avif"
                  alt={`Poster ${o.name}: Yes, We Are Open — Senin–Sabtu 10.00–17.00`}
                  fill
                  priority={i === 0}
                  sizes="(min-width:768px) 320px, 100vw"
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col justify-center p-5 md:p-8">
                <h2 className="font-heading text-xl font-semibold">{o.name}</h2>
                <p className="mt-1 text-sm text-muted">{o.address}</p>
                <p className="mt-2 text-sm text-ink">{o.open_days ?? OPEN_DAYS} {formatHour(o.open_time)}–{formatHour(o.close_time)} WIB · Minggu tutup · antar s.d. {o.delivery_radius_km} km</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <OutletMap outlets={outlets} />
    </>
  );
}
