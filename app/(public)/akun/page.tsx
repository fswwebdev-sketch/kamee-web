"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { InstallAppButton } from "@/components/layout/install-app";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ChevronRight } from "lucide-react";
import { PointsCard } from "@/components/account/points-card";
import { TierProgress } from "@/components/account/tier-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/features/auth/store";
import { isApiError } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { usePoints, useUpdateProfile } from "@/lib/queries/account";
import { profileSchema, type ProfileValues } from "@/lib/schemas/forms";

export default function AccountPage() {
  const customer = useAuthStore((s) => s.customer)!;
  const { data: points } = usePoints();
  const update = useUpdateProfile();
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    reset({ name: customer.name, email: customer.email ?? "", birth_date: customer.birth_date ?? "" });
  }, [customer, reset]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2">Halo, {customer.name.split(" ")[0]}! 👋</h1>
      {points ? (
        <div className="grid gap-4 md:grid-cols-2">
          <PointsCard summary={points.summary} />
          <TierProgress summary={points.summary} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[["/akun/pesanan", "Riwayat pesanan"], ["/akun/voucher", "Voucher saya"], ["/akun/alamat", "Alamat tersimpan"], ["/pesanan", "Lacak pesanan dengan kode"]].map(([href, label]) => (
          <Link key={href} href={href!} className="flex min-h-14 items-center justify-between rounded-2xl border border-line bg-surface p-4 text-sm font-semibold text-ink hover:border-primary active:scale-[.99]">
            {label} <ChevronRight className="size-4 text-muted" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <InstallAppButton />
      <section aria-labelledby="profil-title" className="rounded-3xl border border-line bg-surface p-5 md:p-6">
        <h2 id="profil-title" className="font-heading text-lg font-semibold">Profil</h2>
        <form
          noValidate
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit((v) =>
            update.mutate(
              { name: v.name, email: v.email || null, birth_date: v.birth_date || null },
              { onSuccess: (r) => toast.success(r.message), onError: (e) => toast.error(isApiError(e) ? e.message : "Gagal menyimpan profil.") },
            ),
          )}
        >
          <Input label="Nama" autoComplete="name" error={errors.name?.message} {...register("name")} />
          <Input label="Nomor WhatsApp" value={formatPhone(customer.phone_wa)} readOnly disabled hint="Nomor login tidak dapat diubah." />
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <Input label="Tanggal lahir" type="date" hint="Dapatkan voucher ulang tahun 🎂" {...register("birth_date")} />
          <div className="sm:col-span-2"><Button type="submit" loading={update.isPending} disabled={!isDirty}>Simpan Profil</Button></div>
        </form>
        <p className="mt-4 text-caption text-muted">Kode referral: <b className="font-heading tracking-wider text-ink">{customer.referral_code}</b></p>
      </section>
    </div>
  );
}
