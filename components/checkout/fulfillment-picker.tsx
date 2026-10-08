"use client";

import { Bike, Store, UtensilsCrossed } from "lucide-react";
import { ChoiceCard } from "@/components/ui/choice-card";
import { env } from "@/lib/env";
import type { Fulfillment } from "@/types/api";

const OPTIONS: { value: Fulfillment; title: string; description: string; icon: typeof Store }[] = [
  { value: "pickup", title: "Ambil di outlet", description: "Tanpa antre, siap ±10 menit", icon: Store },
  env.deliveryMode === "ojol"
    ? { value: "delivery", title: "Kirim via ojol", description: "Pesan GoSend / GrabExpress sendiri", icon: Bike }
    : { value: "delivery", title: "Diantar", description: "Ongkir sesuai jarak", icon: Bike },
  { value: "dine_in", title: "Makan di tempat", description: "Disajikan di meja", icon: UtensilsCrossed },
];

export function FulfillmentPicker({ value, onChange }: { value: Fulfillment; onChange: (v: Fulfillment) => void }) {
  return (
    <fieldset>
      <legend className="sr-only">Jenis layanan</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map(({ value: v, title, description, icon: Icon }) => (
          <ChoiceCard key={v} name="fulfillment" value={v} checked={value === v} onChange={() => onChange(v)} title={title} description={description} icon={<Icon className="size-5" aria-hidden="true" />} />
        ))}
      </div>
    </fieldset>
  );
}
