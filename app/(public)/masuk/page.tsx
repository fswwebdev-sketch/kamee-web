import type { Metadata } from "next";
import { Suspense } from "react";
import { Coins, Heart, Receipt } from "lucide-react";
import { OtpLogin } from "@/components/account/otp-login";
import { LogoMark } from "@/components/layout/logo";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Masuk", description: "Masuk ke akun Kamee Coffee dengan kode OTP WhatsApp.", path: "/masuk", noIndex: true });

export default function LoginPage() {
  return (
    <div className="container-page grid max-w-5xl items-center gap-10 pt-24 pb-16 md:pt-32 lg:grid-cols-2">
      <div className="hidden lg:block">
        <LogoMark className="size-14" />
        <h1 className="mt-6 text-h1">Masuk & kumpulkan poin di setiap cangkir</h1>
        <ul className="mt-8 flex flex-col gap-4 text-ink">
          <li className="flex gap-3"><Coins className="size-6 text-primary" aria-hidden="true" />1 poin setiap belanja Rp10.000, tukar jadi potongan harga.</li>
          <li className="flex gap-3"><Receipt className="size-6 text-primary" aria-hidden="true" />Riwayat pesanan & pesan ulang sekali ketuk.</li>
          <li className="flex gap-3"><Heart className="size-6 text-primary" aria-hidden="true" />Simpan menu favorit dan alamat pengantaran.</li>
        </ul>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft md:p-8">
        <h1 className="text-h2 lg:hidden">Masuk ke Kamee</h1>
        <h2 className="hidden text-h2 lg:block">Masuk ke Kamee</h2>
        <p className="mt-2 mb-6 text-muted">Tanpa kata sandi — cukup nomor WhatsApp.</p>
        <Suspense>
          <OtpLogin />
        </Suspense>
      </div>
    </div>
  );
}
