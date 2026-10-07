<?php

namespace Database\Seeders;

use App\Enums\FulfillmentType;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Exceptions\BusinessException;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\User;
use App\Services\CreateOrderData;
use App\Services\OrderService;
use App\Services\OrderStateMachine;
use App\Services\PaymentService;
use App\Services\Pricing\CartItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;

/**
 * 100 pesanan acak 60 hari terakhir di outlet Taman Cibodas (jam buka 10:00–17:00), dibuat melalui
 * service yang sama dengan API (harga, promo, poin, log status, pembayaran) agar datanya konsisten.
 * Pembayaran: QRIS statis yang dikonfirmasi admin, atau tunai. Tidak membuat ulasan produk.
 */
class DemoOrderSeeder extends Seeder
{
    private const TOTAL = 100;

    private Carbon $realNow;

    public function __construct(
        private readonly OrderService $orders,
        private readonly OrderStateMachine $stateMachine,
        private readonly PaymentService $payments,
    ) {}

    private ?User $admin = null;

    public function run(): void
    {
        if (Order::withoutGlobalScopes()->count() >= self::TOTAL) {
            return;
        }

        mt_srand(2026);
        Event::fake([OrderCreated::class, OrderStatusUpdated::class]);
        Bus::fake([SendWhatsAppMessage::class]);

        $outlets = Outlet::all();
        $products = Product::with('optionGroups.options')->where('is_active', true)->get();
        $customers = Customer::all();
        $this->admin = User::where('email', 'admin.cibodas@kamee.id')->first() ?? User::where('email', config('kamee.admin_email'))->first();

        // Urutkan waktu agar poin & tier terakumulasi secara kronologis.
        $this->realNow = now()->copy();
        $times = collect(range(1, self::TOTAL))
            // Demo hanya mulai 1 Okt 2026: periode 20–29 Sep berisi data asli buku catatan (BookkeepingSeeder).
            ->map(fn () => now()->subDays(mt_rand(0, $this->demoDays()))->setTime(mt_rand(10, 15), mt_rand(0, 59)))
            ->map(fn (Carbon $t) => $t->greaterThan($this->realNow->copy()->subHour()) ? $t->subDay() : $t)
            // Outlet tutup di hari libur mingguan (default Minggu) → geser ke hari sebelumnya.
            ->map(fn (Carbon $t) => in_array($t->dayOfWeek, config('kamee.closed_days', []), true) ? $t->subDay() : $t)
            ->sort()->values();

        // Pelanggan setia (3 pertama) mendapat porsi pesanan lebih besar agar ada tier Silver.
        $loyal = $customers->take(3);

        foreach ($times as $i => $time) {
            Carbon::setTestNow($time);

            $outlet = $outlets[$i % $outlets->count()];
            $member = mt_rand(1, 100) <= 70 ? (mt_rand(1, 100) <= 45 ? $loyal->random() : $customers->random()) : null;
            $fulfillment = [FulfillmentType::Pickup, FulfillmentType::Delivery, FulfillmentType::DineIn][mt_rand(0, 2)];
            $promo = mt_rand(1, 100) <= 25 ? ['KAMEEHEMAT', 'GRATISONGKIR', 'BELI1GRATIS1', 'NGOPI10K'][mt_rand(0, 3)] : null;

            $order = $this->createOrder($outlet, $products, $member, $fulfillment, $promo);
            if ($order === null) {
                continue;
            }

            $this->progress($order, $time);
        }

        Carbon::setTestNow();

        // Angka terjual di katalog dibiarkan 0 (belum ada data penjualan nyata); laporan tetap memakai data pesanan demo.
        Product::query()->update(['sold_count' => 0]);
    }

    private function createOrder(Outlet $outlet, $products, ?Customer $member, FulfillmentType $fulfillment, ?string $promo): ?Order
    {
        $items = [];
        foreach ($products->random(mt_rand(1, 3)) as $product) {
            $optionIds = [];
            foreach ($product->optionGroups as $group) {
                if ($group->is_required || mt_rand(0, 3) === 0) {
                    $optionIds[] = $group->options->random()->id;
                }
            }
            $items[] = new CartItem($product->id, mt_rand(1, 3), $optionIds, mt_rand(0, 5) === 0 ? 'Less ice ya kak' : null);
        }

        $data = new CreateOrderData(
            outletId: $outlet->id,
            customerName: $member?->name ?? fake('id_ID')->name(),
            customerPhone: $member?->phone_wa ?? '628'.mt_rand(1100000000, 1399999999),
            fulfillment: $fulfillment,
            items: $items,
            address: $fulfillment === FulfillmentType::Delivery ? fake('id_ID')->streetAddress().', Tangerang' : null,
            lat: $fulfillment === FulfillmentType::Delivery ? $outlet->lat + mt_rand(-150, 150) / 10000 : null,
            lng: $fulfillment === FulfillmentType::Delivery ? $outlet->lng + mt_rand(-150, 150) / 10000 : null,
            promoCode: $promo,
            redeemPoints: $member && $member->fresh()->points_balance >= 30 && mt_rand(0, 3) === 0 ? 20 : 0,
            channel: mt_rand(1, 100) <= 15 ? OrderChannel::WhatsApp : OrderChannel::Web,
        );

        try {
            return $this->orders->create($data, $member?->fresh());
        } catch (BusinessException) {
            // Promo/poin tidak memenuhi syarat → ulangi tanpa promo & poin.
            try {
                return $this->orders->create(new CreateOrderData(...[...get_object_vars($data), 'promoCode' => null, 'redeemPoints' => 0]), $member?->fresh());
            } catch (BusinessException) {
                return null;
            }
        }
    }

    private function progress(Order $order, Carbon $time): void
    {
        $roll = mt_rand(1, 100);
        $isRecent = $time->greaterThan($this->realNow->copy()->subDays(2));
        $timeout = (int) config('kamee.settings.payment_timeout_minutes', 60);

        if ($roll <= 12) {
            Carbon::setTestNow($time->copy()->addMinutes($timeout + 1));
            $this->stateMachine->transition($order, OrderStatus::Cancelled, null, "Dibatalkan otomatis: pembayaran melewati batas {$timeout} menit.");

            return;
        }

        $method = [PaymentMethod::Qris, PaymentMethod::Qris, PaymentMethod::Qris, PaymentMethod::Cash][mt_rand(0, 3)];

        Carbon::setTestNow($time->copy()->addMinutes(2));
        if ($method === PaymentMethod::Cash) {
            $this->payments->pay($order, PaymentMethod::Cash);
        } else {
            $order->payments()->create([
                'method' => PaymentMethod::Qris,
                'provider' => 'manual',
                'provider_ref' => "{$order->code}-1",
                'amount' => $order->total,
                'status' => PaymentStatus::Pending,
                'expires_at' => $time->copy()->addMinutes($timeout),
                'raw_payload' => [
                    'manual' => true,
                    'merchant_name' => config('kamee.manual_qris.merchant_name'),
                    'nmid' => config('kamee.manual_qris.nmid'),
                    'qris_image_url' => config('kamee.manual_qris.image_url'),
                ],
            ]);
            Carbon::setTestNow($time->copy()->addMinutes(5));
            $this->payments->confirmManual($order, $this->admin, 'Cek mutasi GoPay Merchant');
            Carbon::setTestNow($time->copy()->addMinutes(7));
            $this->stateMachine->transition($order->refresh(), OrderStatus::Processing, $this->admin, 'Pesanan mulai disiapkan');
        }

        // Pesanan hari terakhir sebagian dibiarkan berjalan (untuk demo dashboard realtime).
        if ($isRecent && $roll > 85) {
            return;
        }

        if ($order->fulfillment === FulfillmentType::Delivery) {
            Carbon::setTestNow($time->copy()->addMinutes(20));
            $this->stateMachine->transition($order->refresh(), OrderStatus::Shipped, null, 'Kurir berangkat');
        }

        Carbon::setTestNow($time->copy()->addMinutes(45));
        $this->stateMachine->transition($order->refresh(), OrderStatus::Completed, null, 'Pesanan selesai');
    }

    /** Rentang hari pesanan demo: maks 59 hari, tidak sebelum 1 Okt 2026. */
    private function demoDays(): int
    {
        $start = Carbon::parse('2026-10-01', config('app.timezone'))->startOfDay();

        return (int) max(0, min(59, $start->diffInDays(now()->startOfDay(), false)));
    }
}
