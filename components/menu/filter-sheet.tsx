"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/api";
import { SORT_OPTIONS } from "./sort-select";

export const DEFAULT_SORT = "-sold_count";

/**
 * Bottom sheet Filter & Urutkan (ponsel). Pilihan disimpan sebagai draf dan baru diterapkan
 * saat menekan "Terapkan", supaya daftar menu tidak berkedip setiap ketukan.
 */
export default function FilterSheet({
  open,
  onClose,
  categories,
  category,
  sort,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  category: string;
  sort: string;
  onApply: (v: { category: string; sort: string }) => void;
}) {
  const [draftCat, setDraftCat] = useState(category);
  const [draftSort, setDraftSort] = useState(sort);
  useEffect(() => {
    if (open) {
      setDraftCat(category);
      setDraftSort(sort);
    }
  }, [open, category, sort]);

  const dirty = draftCat !== category || draftSort !== sort;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Filter & urutkan"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" className="flex-1" onClick={() => { setDraftCat(""); setDraftSort(DEFAULT_SORT); }} disabled={!draftCat && draftSort === DEFAULT_SORT}>
            Reset
          </Button>
          <Button size="lg" className="flex-[2]" onClick={() => { onApply({ category: draftCat, sort: draftSort }); onClose(); }}>
            {dirty ? "Terapkan" : "Selesai"}
          </Button>
        </div>
      }
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Urutkan</legend>
        <div className="flex flex-col" role="radiogroup" aria-label="Urutkan menu">
          {SORT_OPTIONS.map((o) => {
            const on = draftSort === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDraftSort(o.value)}
                className={cn("flex min-h-12 items-center justify-between border-b border-line text-left text-[15px] text-ink last:border-0", on && "font-semibold text-primary")}
              >
                {o.label}
                {on && <Check className="size-5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-3 text-sm font-semibold text-ink">Kategori</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kategori menu">
          {[{ slug: "", name: "Semua menu" }, ...categories].map((c) => {
            const on = draftCat === c.slug;
            return (
              <button
                key={c.slug || "all"}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDraftCat(c.slug)}
                className={cn(
                  "flex min-h-12 items-center justify-center rounded-xl border px-3 text-center text-sm font-medium transition active:scale-[.98]",
                  on ? "border-primary bg-primary text-on-primary" : "border-line bg-bg text-ink",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </fieldset>
    </Dialog>
  );
}
