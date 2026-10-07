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
            <li key={o.id} id={o.slug} className="overflow-hidden rounded-3xl border border-line bg-surface">
              <div className="relative aspect-[16/9]">
                <Image src={`/images/outlets/outlet-${(i % 2) + 1}.avif`} alt={`Ilustrasi ${o.name}`} fill priority={i === 0} sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="p-5">
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
