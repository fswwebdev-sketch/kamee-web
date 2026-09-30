"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, RefreshCw, TimerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api";
import { env } from "@/lib/env";
import { formatCountdown, formatRupiah } from "@/lib/format";
import { useCountdown } from "@/lib/hooks";
import { usePaymentStatus, usePayOrder } from "@/lib/queries/orders";
import type { PaymentMethod } from "@/types/api";
import { PaymentMethodPicker } from "./payment-method-picker";
import { QrisDisplay } from "./qris-display";

/**
 * Halaman bayar: QRIS (countdown 15:00 + polling 3 detik), e-wallet (deeplink), VA.
 * Saat lunas otomatis diarahkan ke halaman lacak pesanan.
 */
export function PaymentView({ code, phone }: { code: string; phone: string }) {
  const router = useRouter();
  const started = useRef(Date.now());
  const { data, isLoading, isError, refetch, isFetching } = usePaymentStatus(code, started.current);
  const pay = usePayOrder();
  const [method, setMethod] = useState<PaymentMethod>("qris");
  const [channel, setChannel] = useState<string | undefined>();

  const payment = data?.payment?.status === "pending" ? data.payment : null;
  const deadline = payment?.expires_at ?? data?.payment_deadline ?? null;
  const seconds = useCountdown(deadline);
  const phone4 = phone || "";
  const trackUrl = `/pesanan/${code}${phone4 ? `?phone=${phone4}` : ""}`;

  useEffect(() => {
    if (data && data.order_status !== "pending" && data.order_status !== "cancelled") {
      const t = setTimeout(() => router.replace(trackUrl), 2200);
      return () => clearTimeout(t);
    }
  }, [data, router, trackUrl]);

  if (isLoading) return <div className="flex flex-col items-center gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="size-80 rounded-3xl" /></div>;
  if (isError || !data) return <ErrorState title="Pesanan tidak ditemukan" description="Periksa kembali kode pesanan Anda." onRetry={() => refetch()} />;

  const paid = data.order_status !== "pending" && data.order_status !== "cancelled";
  const expired = data.order_status === "cancelled" || (seconds === 0 && !paid);

  if (paid) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center" role="status">
        <CheckCircle2 className="size-16 text-success" aria-hidden="true" />
        <h1 className="text-h2">Pembayaran berhasil!</h1>
        <p className="text-muted">Pesanan <b className="text-ink">{code}</b> sedang disiapkan barista. Mengarahkan ke halaman lacak pesanan…</p>
        <Link href={trackUrl} className={buttonClasses()}>Lacak Pesanan</Link>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-surface p-8 text-center" role="alert">
        <TimerOff className="size-14 text-danger" aria-hidden="true" />
        <h1 className="text-h2">Waktu pembayaran habis</h1>
        <p className="text-muted">Pesanan {code} dibatalkan otomatis karena belum dibayar dalam 15 menit.</p>
        <Link href="/menu" className={buttonClasses()}>Pesan Ulang</Link>
      </div>
    );
  }

  const createPayment = () =>
    pay.mutate(
      { code, method, channel, idempotencyKey: `pay-${code}-${method}-${channel ?? ""}` },
      {
        onSuccess: (res) => {
          if (res.data.method === "cash") router.replace(trackUrl);
          else refetch();
        },
        onError: (e) => toast.error(isApiError(e) ? e.message : "Gagal membuat pembayaran."),
      },
    );

  const copy = async (text: string, label: string) => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    toast.success(`${label} disalin`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-caption text-muted">Kode pesanan</p>
        <h1 className="font-heading text-2xl font-bold tracking-wide text-ink">{code}</h1>
        <p className="mt-3 text-sm text-muted">Total pembayaran</p>
        <p className="font-heading text-3xl font-bold text-primary">{formatRupiah(data.total)}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2" role="timer" aria-live="off">
          <span className="text-sm text-ink">Bayar dalam</span>
          <span className="font-heading text-lg font-bold tabular-nums text-ink" aria-label={`Sisa waktu ${Math.floor(seconds / 60)} menit ${seconds % 60} detik`}>{formatCountdown(seconds)}</span>
        </div>
      </div>

      {!payment ? (
        <section className="rounded-3xl border border-line bg-surface p-5 md:p-6" aria-labelledby="pilih-metode">
          <h2 id="pilih-metode" className="mb-4 font-heading text-lg font-semibold">Pilih metode pembayaran</h2>
          <PaymentMethodPicker method={method} channel={channel} onMethod={(m) => { setMethod(m); setChannel(m === "ewallet" ? "gopay" : m === "bank_transfer" ? "bca" : undefined); }} onChannel={setChannel} />
          <Button size="lg" className="mt-5 w-full" loading={pay.isPending} onClick={createPayment}>Lanjutkan Pembayaran</Button>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-surface p-5 text-center md:p-8" aria-label={`Pembayaran ${payment.method_label}`}>
          <Badge tone="warning">{payment.status_label} · {payment.method_label}{payment.bank ? ` ${payment.bank.toUpperCase()}` : ""}</Badge>

          {payment.method === "qris" && payment.qr_string && (
            <>
              <QrisDisplay value={payment.qr_string} fileName={`QRIS-${code}`} />
              <ol className="max-w-sm list-decimal pl-5 text-left text-sm text-muted">
                <li>Buka aplikasi e-wallet atau m-banking yang mendukung QRIS.</li>
                <li>Scan kode QR di atas (atau simpan lalu unggah dari galeri).</li>
                <li>Pastikan nominal {formatRupiah(payment.amount)} lalu konfirmasi.</li>
              </ol>
            </>
          )}

          {payment.method === "ewallet" && payment.deeplink && (
            <a href={payment.deeplink} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "lg", "w-full max-w-sm")}>
              Buka aplikasi e-wallet <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}

          {payment.method === "bank_transfer" && payment.va_number && (
            <div className="w-full max-w-sm rounded-2xl bg-cream/60 p-5">
              <p className="text-sm text-muted">Nomor Virtual Account {payment.bank?.toUpperCase()}</p>
              <p className="mt-1 font-heading text-2xl font-bold tracking-wider text-ink">{payment.va_number.replace(/(\d{4})(?=\d)/g, "$1 ")}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => copy(payment.va_number!, "Nomor VA")}><Copy className="size-4" aria-hidden="true" /> Salin nomor VA</Button>
            </div>
          )}

          <div className="flex w-full max-w-sm flex-col gap-2">
            <Button variant="secondary" size="lg" onClick={() => refetch()} loading={isFetching}>
              {!isFetching && <RefreshCw className="size-4" aria-hidden="true" />} Saya sudah bayar
            </Button>
            <p className="text-caption text-muted" aria-live="polite">Status diperbarui otomatis setiap 3 detik.</p>
            {env.mocking && <p className="text-caption text-muted">Mode demo: pembayaran dianggap lunas ±6 detik setelah transaksi dibuat.</p>}
          </div>
        </section>
      )}

      <p className="text-center text-sm text-muted">
        Butuh bantuan? <Link href={trackUrl} className="font-semibold text-primary hover:underline">Lihat detail pesanan</Link>
      </p>
    </div>
  );
}
