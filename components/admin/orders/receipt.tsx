"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { useAdminItem } from "@/lib/admin/queries";
import type { AdminOrder } from "@/lib/admin/types";
import { CHANNEL_LABEL, FULFILLMENT_LABEL } from "@/lib/admin/types";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Struk printer thermal 58 mm atau 80 mm (pilihan disimpan per perangkat).
 * - 58 mm: area cetak efektif ±48 mm (≈ 32 karakter), huruf 11px.
 * - 80 mm: area cetak efektif ±72 mm (≈ 48 karakter), huruf 12.5px.
 * Selalu hitam-putih tebal (tidak mengikuti mode gelap) agar jelas di kertas thermal.
 */

type Paper = "58" | "80";
const PAPER_KEY = "kamee-receipt-paper";
const PAPER: Record<Paper, { width: string; pad: string; text: string; title: string; total: string }> = {
  "58": { width: "58mm", pad: "px-[4.5mm] py-[3mm]", text: "text-[11px] leading-[1.35]", title: "text-[15px]", total: "text-[14px]" },
  "80": { width: "80mm", pad: "px-[4mm] py-[4mm]", text: "text-[12.5px] leading-[1.4]", title: "text-[18px]", total: "text-[16px]" },
};

function readPaper(): Paper {
  try {
    return localStorage.getItem(PAPER_KEY) === "80" ? "80" : "58";
  } catch {
    return "58";
  }
}

const rp = (n: number) => n.toLocaleString("id-ID");
const dt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

function Line({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div className={bold ? "flex justify-between gap-2 font-bold" : "flex justify-between gap-2"}>
      <span className="min-w-0 break-words">{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  );
}

const Rule = ({ double }: { double?: boolean }) => <div className={double ? "my-1.5 border-t-2 border-double border-black" : "my-1.5 border-t border-dashed border-black"} aria-hidden="true" />;

export function Receipt({ id, autoPrint }: { id: string; autoPrint: boolean }) {
  const q = useAdminItem<AdminOrder>("orders", id);
  const printed = useRef(false);
  const [paper, setPaperState] = useState<Paper | null>(null);
  const setPaper = (p: Paper) => {
    setPaperState(p);
    try {
      localStorage.setItem(PAPER_KEY, p);
    } catch {
      /* penyimpanan diblokir — pilihan berlaku untuk sesi ini saja */
    }
  };

  useEffect(() => setPaperState(readPaper()), []);

  useEffect(() => {
    if (!autoPrint || !q.data || !paper || printed.current) return;
    printed.current = true;
    // Tunggu font & layout siap sebelum dialog cetak
    const t = setTimeout(() => window.print(), 350);
    const close = () => window.opener && window.close();
    window.addEventListener("afterprint", close);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", close);
    };
  }, [autoPrint, q.data, paper]);

  if (q.isPending || !paper) return <div className="grid min-h-svh place-items-center bg-white"><Spinner label="Menyiapkan struk…" /></div>;
  if (q.isError) return <div className="grid min-h-svh place-items-center p-6"><ErrorState title="Struk tidak dapat dimuat" description={q.error.message} onRetry={() => q.refetch()} /></div>;

  const o = q.data;
  const paid = o.payments?.find((p) => p.status === "paid") ?? o.payment ?? null;
  const itemCount = o.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
  const P = PAPER[paper];

  return (
    <div className="min-h-svh bg-neutral-200 py-6 print:bg-white print:p-0">
      <style>{`
        @page { size: ${P.width} auto; margin: 0; }
        @media print {
          html, body { background: #fff !important; width: ${P.width}; margin: 0; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex w-full max-w-[340px] flex-wrap items-center justify-center gap-2 px-3">
        <div role="radiogroup" aria-label="Ukuran kertas" className="flex rounded-lg bg-white p-0.5 shadow-sm">
          {(["58", "80"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={paper === p}
              onClick={() => setPaper(p)}
              className={cn("h-9 rounded-md px-3 text-sm font-semibold", paper === p ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100")}
            >
              {p} mm
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => window.print()}><Printer className="size-4" aria-hidden="true" /> Cetak</Button>
        <Button size="sm" variant="outline" onClick={() => (window.opener ? window.close() : history.back())}><X className="size-4" aria-hidden="true" /> Tutup</Button>
      </div>

      <article
        aria-label={`Struk pesanan ${o.code}`}
        style={{ width: P.width }}
        className={cn("mx-auto bg-white font-mono font-medium text-black shadow-lg print:shadow-none", P.pad, P.text)}
      >
        <header className="text-center">
          <p className={cn("font-bold tracking-wide", P.title)}>KAMEE COFFEE</p>
          {o.outlet && (o.outlet.name.replace(/^Kamee Coffee\s*/i, "") || null) && <p>{o.outlet.name.replace(/^Kamee Coffee\s*/i, "")}</p>}
          {o.outlet?.address && <p className="break-words">{o.outlet.address}</p>}
          {o.outlet?.phone_wa && <p>WA {formatPhone(o.outlet.phone_wa)}</p>}
        </header>

        <Rule double />
        <Line left="No" right={o.code} bold />
        <Line left="Waktu" right={dt.format(new Date(o.created_at))} />
        <Line left="Layanan" right={FULFILLMENT_LABEL[o.fulfillment]} />
        <Line left="Kanal" right={CHANNEL_LABEL[o.channel]} />
        <Line left="Pelanggan" right={o.customer_name} />
        {o.scheduled_at && <Line left="Jadwal" right={dt.format(new Date(o.scheduled_at))} />}
        {o.handled_by && <Line left="Kasir" right={o.handled_by.name} />}
        <Rule />

        <ul>
          {o.items?.map((item) => (
            <li key={item.id} className="mb-1">
              <p className="font-bold">{item.product_name}</p>
              {item.options?.map((opt, i) => (
                <p key={i} className="pl-2">- {opt.name.includes(": ") ? opt.name.split(": ").slice(1).join(": ") : opt.name}{opt.price_delta ? ` +${rp(opt.price_delta)}` : ""}</p>
              ))}
              {item.note && <p className="pl-2 italic">* {item.note}</p>}
              <Line left={`  ${item.qty} x ${rp(item.unit_price)}`} right={rp(item.subtotal)} />
            </li>
          ))}
        </ul>
        {o.note && <p className="mt-1 break-words">Catatan: {o.note}</p>}
        <Rule />

        <Line left={`Subtotal (${itemCount} item)`} right={rp(o.subtotal)} />
        {o.discount > 0 && <Line left="Diskon" right={`-${rp(o.discount)}`} />}
        {o.points_discount > 0 && <Line left={`Poin (${o.points_redeemed})`} right={`-${rp(o.points_discount)}`} />}
        {o.delivery_fee > 0 && <Line left="Ongkir" right={rp(o.delivery_fee)} />}
        {o.service_fee > 0 && <Line left="Biaya layanan" right={rp(o.service_fee)} />}
        <Rule double />
        <div className={cn("flex justify-between font-bold", P.total)}><span>TOTAL</span><span className="tabular-nums">Rp{rp(o.total)}</span></div>
        <Rule double />

        {paid ? (
          <>
            <Line left="Bayar" right={paid.method_label} />
            {paid.method === "cash" && paid.cash_received != null && paid.cash_received > o.total && (
              <>
                <Line left="Diterima" right={rp(paid.cash_received)} />
                <Line left="Kembali" right={rp(paid.change ?? paid.cash_received - o.total)} bold />
              </>
            )}
            <Line left="Status" right={paid.status === "paid" ? "LUNAS" : paid.status_label} bold={paid.status === "paid"} />
          </>
        ) : (
          <Line left="Status" right={o.status === "cancelled" ? "DIBATALKAN" : "BELUM DIBAYAR"} bold />
        )}
        {o.fulfillment === "delivery" && o.address && (
          <>
            <Rule />
            <p className="font-bold">Antar ke:</p>
            <p className="break-words">{o.address}</p>
            <p>{formatPhone(o.customer_phone)}</p>
          </>
        )}

        <Rule />
        <footer className="text-center">
          <p>Terima kasih sudah ngopi</p>
          <p>di Kamee Coffee!</p>
          <p className="mt-1">IG @kameecoffee.id</p>
          <p>kameecoffee.com</p>
        </footer>
      </article>
    </div>
  );
}
