"use client";

import { Banknote, Landmark, QrCode, Wallet } from "lucide-react";
import { ChoiceCard } from "@/components/ui/choice-card";
import { PAYMENT_CHANNELS } from "@/lib/schemas/checkout";
import type { PaymentMethod } from "@/types/api";
import { cn } from "@/lib/utils";

const METHODS: { value: PaymentMethod; title: string; description: string; icon: typeof QrCode }[] = [
  { value: "qris", title: "QRIS", description: "Scan dari semua e-wallet & m-banking", icon: QrCode },
  { value: "ewallet", title: "E-Wallet", description: "GoPay, ShopeePay", icon: Wallet },
  { value: "bank_transfer", title: "Transfer Bank (VA)", description: "BCA, BNI, BRI, Permata", icon: Landmark },
  { value: "cash", title: "Tunai", description: "Bayar di kasir / ke kurir", icon: Banknote },
];

export function PaymentMethodPicker({
  method,
  channel,
  onMethod,
  onChannel,
  channelError,
  allowCash = true,
}: {
  method: PaymentMethod;
  channel?: string;
  onMethod: (m: PaymentMethod) => void;
  onChannel: (c: string) => void;
  channelError?: string;
  allowCash?: boolean;
}) {
  const channels = method === "ewallet" || method === "bank_transfer" ? PAYMENT_CHANNELS[method] : null;
  return (
    <div className="flex flex-col gap-3">
      <fieldset>
        <legend className="sr-only">Metode pembayaran</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {METHODS.filter((m) => allowCash || m.value !== "cash").map(({ value, title, description, icon: Icon }) => (
            <ChoiceCard key={value} name="payment-method" value={value} checked={method === value} onChange={() => onMethod(value)} title={title} description={description} icon={<Icon className="size-5" aria-hidden="true" />} />
          ))}
        </div>
      </fieldset>
      {channels && (
        <fieldset className="rounded-2xl bg-cream/50 p-3">
          <legend className="mb-2 px-1 text-sm font-medium text-ink">{method === "ewallet" ? "Pilih e-wallet" : "Pilih bank"}</legend>
          <div className={cn("grid gap-2", channels.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}>
            {channels.map((c) => (
              <ChoiceCard key={c.value} name="payment-channel" value={c.value} checked={channel === c.value} onChange={() => onChannel(c.value)} title={c.label} className="p-3" />
            ))}
          </div>
          {channelError && <p role="alert" className="mt-2 text-caption text-danger">{channelError}</p>}
        </fieldset>
      )}
    </div>
  );
}
