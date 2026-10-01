"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PencilLine, X } from "lucide-react";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { toast } from "@/components/ui/toast";
import { useCartActions } from "@/features/cart/hooks";
import { lineTotal, type CartLine } from "@/features/cart/pricing";
import { formatRupiah } from "@/lib/format";

export function CartItem({ line, index }: { line: CartLine; index: number }) {
  const { setQty, removeItem, restoreItem, setNote } = useCartActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line.note);

  const remove = () => {
    const removed = removeItem(line.lineId);
    if (removed) toast.info(`${line.name} dihapus`, { action: { label: "Urungkan", onClick: () => restoreItem(removed, index) } });
  };

  return (
    <li className="flex gap-3 py-5 first:pt-0 md:gap-4">
      <Link href={`/menu/${line.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-cream md:size-24" tabIndex={-1} aria-hidden="true">
        {line.image && <Image src={line.image} alt="" fill sizes="96px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-semibold text-ink">
            <Link href={`/menu/${line.slug}`} className="-my-3 inline-block py-3 hover:text-primary">{line.name}</Link>
          </h3>
          <button type="button" onClick={remove} aria-label={`Hapus ${line.name} dari keranjang`} className="-mr-2.5 -mt-1.5 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-cream hover:text-danger">
            <X className="size-4" />
          </button>
        </div>
        {line.options.length > 0 && <p className="text-caption text-muted">{line.options.map((o) => o.name).join(" · ")}</p>}
        {editing ? (
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setNote(line.lineId, draft);
              setEditing(false);
            }}
          >
            <label htmlFor={`note-${line.lineId}`} className="sr-only">Catatan untuk {line.name}</label>
            <input id={`note-${line.lineId}`} autoFocus maxLength={200} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Contoh: less ice" className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm focus:border-primary focus:outline-none" />
            <button type="submit" className="rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary">Simpan</button>
          </form>
        ) : (
          <button type="button" onClick={() => { setDraft(line.note); setEditing(true); }} className="-my-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded text-left text-caption text-primary hover:underline">
            <PencilLine className="size-3.5" aria-hidden="true" />
            {line.note ? <span className="text-ink">&ldquo;{line.note}&rdquo;</span> : "Tambah catatan"}
          </button>
        )}
        {/* Di layar sempit harga & stepper boleh turun baris agar stepper 44 px tidak keluar kartu */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
          <p className="font-heading font-semibold text-ink">{formatRupiah(lineTotal(line))}</p>
          <QuantityStepper value={line.qty} onChange={(v) => (v <= 0 ? remove() : setQty(line.lineId, v))} label={line.name} size="sm" removable />
        </div>
      </div>
    </li>
  );
}
