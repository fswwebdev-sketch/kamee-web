"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MapInner = dynamic(() => import("./address-map-inner"), { ssr: false, loading: () => <Skeleton className="absolute inset-0 rounded-none" /> });

/** Pemilih titik pengantaran (Leaflet, dimuat dinamis). Ketuk peta atau geser pin. */
export function AddressMap({
  value,
  onChange,
  outlet,
  error,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  outlet?: { lat: number; lng: number; radiusKm: number; name: string } | null;
  error?: string;
}) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const locate = () => {
    if (!navigator.geolocation) return setGeoError("Perangkat tidak mendukung lokasi.");
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setGeoError("Izin lokasi ditolak. Ketuk peta untuk memilih titik.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink"><MapPin className="size-4 text-primary" aria-hidden="true" />Titik pengantaran</p>
        <Button type="button" variant="ghost" size="sm" onClick={locate} loading={locating}>
          {!locating && <LocateFixed className="size-4" aria-hidden="true" />} Lokasi saya
        </Button>
      </div>
      <div className="relative h-64 overflow-hidden rounded-2xl border border-line bg-cream md:h-72" aria-describedby="map-help">
        <MapInner value={value} onChange={onChange} outlet={outlet} />
        {!value && (
          <p className="glass pointer-events-none absolute inset-x-3 top-3 z-[400] rounded-xl border px-3 py-2 text-center text-caption text-ink">Ketuk peta untuk menandai lokasi pengantaran</p>
        )}
      </div>
      <p id="map-help" className="text-caption text-muted">
        {value ? `Titik: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} · geser pin untuk menyesuaikan.` : "Area berwarna menunjukkan jangkauan pengantaran outlet."}
      </p>
      {(error || geoError) && <p role="alert" className="text-caption text-danger">{error ?? geoError}</p>}
    </div>
  );
}
