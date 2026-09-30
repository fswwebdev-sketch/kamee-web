import type { Metadata } from "next";
import { Receipt } from "@/components/admin/orders/receipt";

export const metadata: Metadata = { title: "Struk" };

/** Halaman cetak struk 58 mm (tanpa shell admin). Dibuka di jendela kecil oleh tombol "Cetak struk". */
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <Receipt id={id} autoPrint={sp.print === "1"} />;
}
