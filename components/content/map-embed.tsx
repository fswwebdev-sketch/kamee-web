"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function Frame({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  return (
    <iframe
      title={title}
      src={`https://www.google.com/maps?q=${lat},${lng}&z=16&hl=id&output=embed`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="absolute inset-0 size-full border-0"
      allowFullScreen
    />
  );
}

/** Google Maps embed dimuat dinamis (tidak ikut bundle awal & tidak memblokir render). */
export const MapEmbed = dynamic(async () => Frame, {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});
