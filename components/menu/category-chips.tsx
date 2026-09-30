"use client";

import { Chip } from "@/components/ui/chip";
import type { Category } from "@/types/api";

export function CategoryChips({ categories, value, onChange }: { categories: Category[]; value: string; onChange: (slug: string) => void }) {
  return (
    <div role="group" aria-label="Filter kategori" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      <Chip selected={!value} onClick={() => onChange("")}>Semua</Chip>
      {categories.map((c) => (
        <Chip key={c.id} selected={value === c.slug} onClick={() => onChange(value === c.slug ? "" : c.slug)}>
          {c.name}
        </Chip>
      ))}
    </div>
  );
}
