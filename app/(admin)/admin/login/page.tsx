import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { LogoMark } from "@/components/layout/logo";
import { AdminLoginForm } from "@/components/admin/layout/login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function AdminLoginPage() {
  return (
    <main id="konten" className="grid min-h-svh bg-bg lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Image src="/hero/aren-kame.avif" alt="" fill priority sizes="55vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1020]/85 via-[#0A1020]/35 to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <p className="font-heading text-3xl font-bold leading-tight">Setiap cangkir,<br />tercatat rapi.</p>
          <p className="mt-3 max-w-md text-white/85">Pantau pesanan masuk secara realtime, kelola menu dan promo, dan konfirmasi pembayaran QRIS, dan lihat performa penjualan dari satu tempat.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-heading text-lg font-bold text-ink">Kamee<span className="text-primary"> Admin</span></span>
          </div>
          <h1 className="mt-8 text-h2">Masuk ke dashboard</h1>
          <p className="mt-2 text-sm text-muted">Gunakan akun yang diberikan pemilik usaha.</p>
          <Suspense>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
