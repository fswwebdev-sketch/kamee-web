import { OrderHistory } from "@/components/account/order-history";

export default function MyOrdersPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h2">Riwayat Pesanan</h1>
      <OrderHistory />
    </div>
  );
}
