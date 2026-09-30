"use client";

import { useState } from "react";
import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { MapEmbed } from "@/components/content/map-embed";
import { Badge } from "@/components/ui/badge";
import { formatHour, formatPhone } from "@/lib/format";
import type { Outlet } from "@/types/api";
import { cn } from "@/lib/utils";

/** Lokasi outlet + Google Maps. */
export function OutletMap({ outlets, headingLevel = "h2" }: { outlets: Outlet[]; headingLevel?: "h2" | "h1" }) {
  const [activeId, setActiveId] = useState(outlets[0]?.id);
  const active = outlets.find((o) => o.id === activeId) ?? outlets[0];
  const Heading = headingLevel;
  if (!active) return null;
  return (
    <section className="section-y" aria-labelledby="lokasi-title">
      <div className="container-page">
        <p className="text-caption font-semibold tracking-[.14em] text-primary uppercase">Lokasi</p>
        <Heading id="lokasi-title" className={cn("mt-2", headingLevel === "h1" ? "text-h1" : "text-h2")}>Mampir ke outlet terdekat</Heading>
        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <ul className="flex flex-col gap-3" aria-label="Daftar outlet">
            {outlets.map((o) => {
              const selected = o.id === active.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(o.id)}
                    aria-pressed={selected}
                    className={cn("w-full rounded-2xl border p-5 text-left transition", selected ? "border-primary bg-cream/60 shadow-soft" : "border-line bg-surface hover:border-primary/50")}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-heading font-semibold text-ink">{o.name}</span>
                      <Badge tone={o.is_open_now ? "success" : "danger"}>{o.is_open_now ? "Buka" : "Tutup"}</Badge>
                    </span>
                    <span className="mt-3 flex gap-2 text-sm text-muted"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{o.address}</span>
                    <span className="mt-2 flex gap-2 text-sm text-muted"><Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{formatHour(o.open_time)}–{formatHour(o.close_time)} WIB · antar s.d. {o.delivery_radius_km} km</span>
                  </button>
                </li>
              );
            })}
            <li className="flex gap-2">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${active.lat},${active.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary hover:bg-primary-hover">
                <Navigation className="size-4" aria-hidden="true" /> Petunjuk arah
              </a>
              <a href={`https://wa.me/${active.phone_wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-primary">
                <Phone className="size-4" aria-hidden="true" /> {formatPhone(active.phone_wa)}
              </a>
            </li>
          </ul>
          <div className="relative min-h-80 overflow-hidden rounded-3xl border border-line bg-cream lg:min-h-[420px]">
            <MapEmbed key={active.id} lat={active.lat} lng={active.lng} title={`Peta lokasi ${active.name}`} />
          </div>
        </div>
      </div>
    </section>
  );
}
