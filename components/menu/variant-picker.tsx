"use client";

import { useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Textarea } from "@/components/ui/field";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { toast } from "@/components/ui/toast";
import { useCartActions } from "@/features/cart/hooks";
import { defaultSelection, toCartOptions, unitPrice, validateSelection } from "@/features/cart/pricing";
import { formatRupiah } from "@/lib/format";
import type { OptionGroup, Product } from "@/types/api";

/** Pilih varian (ukuran, gula, es, topping) + jumlah + catatan, lalu tambah ke keranjang. */
export function VariantPicker({
  product,
  groups,
  onAdded,
  compact = false,
}: {
  product: Pick<Product, "id" | "slug" | "name" | "image_url" | "base_price">;
  groups: OptionGroup[];
  onAdded?: () => void;
  compact?: boolean;
}) {
  const { addItem } = useCartActions();
  const [selection, setSelection] = useState<Record<number, number[]>>(() => defaultSelection(groups));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const selectedIds = useMemo(() => Object.values(selection).flat(), [selection]);
  const options = useMemo(() => toCartOptions(groups, selectedIds), [groups, selectedIds]);
  const price = unitPrice(product.base_price, options);
  const errors = validateSelection(groups, selection);
  const hasErrors = Object.keys(errors).length > 0;

  const choose = (group: OptionGroup, optionId: number, checked: boolean) => {
    setSelection((s) => {
      const current = s[group.id] ?? [];
      if (group.type === "single") return { ...s, [group.id]: [optionId] };
      return { ...s, [group.id]: checked ? [...current, optionId] : current.filter((x) => x !== optionId) };
    });
  };

  const submit = () => {
    setTouched(true);
    if (hasErrors) return;
    try {
      addItem({ product, options, qty, note });
      toast.success(`${product.name} masuk keranjang`, { description: `${qty} × ${formatRupiah(price)}` });
      setQty(1);
      setNote("");
      onAdded?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <fieldset key={g.id} className="flex flex-col gap-2.5" aria-describedby={touched && errors[g.id] ? `grp-${g.id}-err` : undefined}>
          <legend className="mb-2.5 flex w-full items-center justify-between text-sm font-semibold text-ink">
            <span>{g.name}</span>
            <span className="text-caption font-medium text-muted">{g.is_required ? "Wajib · pilih 1" : g.type === "multi" ? "Opsional · boleh lebih dari 1" : "Opsional"}</span>
          </legend>
          <div className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
            {g.options.map((o) => (
              <ChoiceCard
                key={o.id}
                name={`group-${product.id}-${g.id}`}
                value={String(o.id)}
                type={g.type === "single" ? "radio" : "checkbox"}
                checked={(selection[g.id] ?? []).includes(o.id)}
                onChange={(_, checked) => choose(g, o.id, checked)}
                title={o.name}
                description={o.price_delta ? `+${formatRupiah(o.price_delta)}` : "Gratis"}
                className="p-3"
              />
            ))}
          </div>
          {touched && errors[g.id] && <p id={`grp-${g.id}-err`} role="alert" className="text-caption text-danger">{errors[g.id]}</p>}
        </fieldset>
      ))}

      <Textarea label="Catatan untuk barista" placeholder="Contoh: less ice, pisahkan saus" maxLength={200} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="flex items-center gap-3">
        <QuantityStepper value={qty} onChange={(v) => setQty(Math.max(1, v))} label={product.name} />
        <Button size="lg" className="flex-1" onClick={submit} aria-describedby={`total-${product.id}`}>
          <ShoppingBag className="size-5" aria-hidden="true" />
          Tambah · <span id={`total-${product.id}`}>{formatRupiah(price * qty)}</span>
        </Button>
      </div>
    </div>
  );
}
