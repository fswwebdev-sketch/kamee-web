"use client";

import { PlusSquare, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { usePwa } from "./store";

/** iOS Safari tidak punya dialog pasang otomatis — tampilkan panduan 2 langkah. */
export default function IosInstallSheet() {
  const open = usePwa((s) => s.iosSheetOpen);
  const set = usePwa((s) => s.set);
  const close = () => set({ iosSheetOpen: false });
  return (
    <Dialog open={open} onClose={close} title="Tambahkan ke layar utama" description="Buka Kamee seperti aplikasi, langsung dari layar utama iPhone." footer={<Button size="lg" className="w-full" onClick={close}>Mengerti</Button>}>
      <ol className="flex flex-col gap-4">
        <li className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-primary"><Share className="size-6" aria-hidden="true" /></span>
          <span className="text-[15px] text-ink">Ketuk tombol <b>Bagikan</b> di bilah bawah Safari.</span>
        </li>
        <li className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-primary"><PlusSquare className="size-6" aria-hidden="true" /></span>
          <span className="text-[15px] text-ink">Gulir lalu pilih <b>Tambah ke Layar Utama</b>, kemudian <b>Tambah</b>.</span>
        </li>
      </ol>
    </Dialog>
  );
}
