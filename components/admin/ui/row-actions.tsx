"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const iconBtn = "grid size-9 place-items-center rounded-lg text-muted transition hover:bg-cream hover:text-ink focus-visible:outline-2 disabled:opacity-40";

/** Tombol ikon Ubah/Hapus di ujung baris tabel (klik tidak memicu onRowClick). */
export function RowActions({ label, onEdit, editHref, onDelete, children }: { label: string; onEdit?: () => void; editHref?: string; onDelete?: () => void; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      {children}
      {editHref ? (
        <Link href={editHref} className={iconBtn} aria-label={`Ubah ${label}`} title="Ubah"><Pencil className="size-4" /></Link>
      ) : onEdit ? (
        <button type="button" onClick={onEdit} className={iconBtn} aria-label={`Ubah ${label}`} title="Ubah"><Pencil className="size-4" /></button>
      ) : null}
      {onDelete && (
        <button type="button" onClick={onDelete} className={cn(iconBtn, "hover:bg-danger/10 hover:text-danger")} aria-label={`Hapus ${label}`} title="Hapus"><Trash2 className="size-4" /></button>
      )}
    </div>
  );
}

/** Pil status aktif/nonaktif yang konsisten di semua tabel. */
export function ActivePill({ active, activeLabel = "Aktif", inactiveLabel = "Nonaktif" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", active ? "bg-success/12 text-success" : "bg-line/60 text-muted")}>
      <span className={cn("size-1.5 rounded-full", active ? "bg-success" : "bg-muted")} aria-hidden="true" />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
