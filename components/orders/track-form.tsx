"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useRecentOrders } from "@/features/orders/store";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useMounted } from "@/lib/hooks";
import { trackSchema, type TrackValues } from "@/lib/schemas/forms";

export function TrackForm() {
  const router = useRouter();
  const mounted = useMounted();
  const recent = useRecentOrders((s) => s.orders);
  const { register, handleSubmit, formState: { errors } } = useForm<TrackValues>({ resolver: zodResolver(trackSchema) });

  return (
    <div className="flex flex-col gap-6">
      <form
        noValidate
        onSubmit={handleSubmit((v) => router.push(`/pesanan/${v.code}?phone=${v.phone.replace(/\D/g, "").slice(-4)}`))}
        className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 md:p-6"
      >
        <Input label="Kode pesanan" placeholder="KM260930ABCDE" autoCapitalize="characters" required error={errors.code?.message} {...register("code")} />
        <Input label="4 digit terakhir nomor WhatsApp" inputMode="numeric" placeholder="7890" maxLength={15} required error={errors.phone?.message} {...register("phone")} />
        <Button type="submit" size="lg"><Search className="size-5" aria-hidden="true" /> Lacak</Button>
      </form>

      {mounted && recent.length > 0 && (
        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="font-heading text-lg font-semibold">Pesanan di perangkat ini</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {recent.map((o) => (
              <li key={o.code}>
                <Link href={`/pesanan/${o.code}?phone=${o.phone.slice(-4)}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-primary">
                  <span>
                    <span className="block font-heading font-semibold tracking-wide text-ink">{o.code}</span>
                    <span className="text-caption text-muted">{formatDateTime(o.createdAt)} · {formatRupiah(o.total)}</span>
                  </span>
                  <ChevronRight className="size-5 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
