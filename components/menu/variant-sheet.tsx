"use client";

import Image from "next/image";
import { Dialog } from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format";
import { VariantPicker } from "./variant-picker";
import { useVariantSheet } from "./variant-sheet-store";

/** Bottom sheet varian; dimuat dinamis oleh VariantSheetHost saat pertama kali dibuka. */
export default function VariantSheetContent() {
  const { product, close } = useVariantSheet();
  return (
    <Dialog open={Boolean(product)} onClose={close} title={product?.name ?? ""} description={product?.short_description ?? undefined}>
      {product && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 rounded-2xl bg-cream/60 p-3">
            {product.image_url && <Image src={product.image_url} alt="" width={64} height={64} className="size-16 rounded-xl object-cover" />}
            <div>
              <p className="text-sm text-muted">Mulai dari</p>
              <p className="text-price text-primary">{formatRupiah(product.base_price)}</p>
            </div>
          </div>
          <VariantPicker product={product} groups={product.option_groups ?? []} onAdded={close} compact />
        </div>
      )}
    </Dialog>
  );
}
