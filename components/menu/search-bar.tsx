"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "@/lib/hooks";

/** Input pencarian dengan debounce 300 ms. */
export function SearchBar({ value, onChange, placeholder = "Cari kopi, teh, camilan…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 300);

  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (debounced !== value) onChange(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div role="search" className="relative">
      <label htmlFor="cari-menu" className="sr-only">Cari menu</label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        id="cari-menu"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-12 w-full rounded-xl border border-line bg-surface pl-12 pr-12 text-ink shadow-soft placeholder:text-muted/80 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button type="button" onClick={() => { setText(""); onChange(""); }} aria-label="Hapus pencarian" className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-cream">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
