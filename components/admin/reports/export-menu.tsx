"use client";

import { useState } from "react";
import { ChevronDown, FileSpreadsheet, ListTree, Rows3 } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/admin/ui/dropdown";
import { buttonClasses } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { adminDownload } from "@/lib/admin/api";
import { errorMessage } from "@/lib/admin/queries";
import type { ReportTab } from "./report-types";

type Kind = "summary" | "all";

/** Ekspor Excel: ringkasan tab aktif (group_by) atau semua transaksi (baris per pesanan). */
export function ExportMenu({ tab, outletId, from, to }: { tab: ReportTab; outletId: number | null; from: string; to: string }) {
  const [busy, setBusy] = useState<Kind | null>(null);

  const run = async (kind: Kind) => {
    if (busy) return;
    setBusy(kind);
    const range = `${from.replaceAll("-", "")}_${to.replaceAll("-", "")}`;
    const query = { outlet_id: outletId, from, to, group_by: kind === "summary" ? tab.group : undefined };
    const fallback = kind === "summary" ? `laporan-${tab.slug}-${range}.xlsx` : `laporan-penjualan-${range}.xlsx`;
    try {
      await adminDownload("reports/sales.xlsx", query, fallback);
      toast.success("Laporan berhasil diunduh", { description: kind === "summary" ? `Ringkasan ${tab.label.toLowerCase()}` : "Semua transaksi pada periode ini" });
    } catch (e) {
      toast.error("Gagal mengunduh laporan", { description: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dropdown
      buttonClassName={buttonClasses("primary", "sm")}
      label={
        <>
          {busy ? <Spinner className="size-4" /> : <FileSpreadsheet className="size-4" aria-hidden="true" />}
          {busy ? "Menyiapkan…" : "Ekspor Excel"}
          <ChevronDown className="size-4" aria-hidden="true" />
        </>
      }
      menuClassName="w-72"
    >
      {(close) => (
        <>
          <DropdownItem icon={<ListTree />} disabled={busy !== null} onSelect={() => { close(); void run("summary"); }}>
            <span className="block">Ringkasan (tab ini)</span>
            <span className="block text-caption font-normal text-muted">{tab.label} · total per {tab.noun}</span>
          </DropdownItem>
          <DropdownItem icon={<Rows3 />} disabled={busy !== null} onSelect={() => { close(); void run("all"); }}>
            <span className="block">Semua transaksi</span>
            <span className="block text-caption font-normal text-muted">Satu baris per pesanan, semua status</span>
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
