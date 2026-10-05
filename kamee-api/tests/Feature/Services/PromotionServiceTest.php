<?php

use App\Enums\OrderStatus;
use App\Exceptions\BusinessException;
use App\Models\Order;
use App\Models\Promotion;
use App\Models\PromotionUsage;
use App\Services\OrderStateMachine;
use App\Services\Pricing\PricedLine;
use App\Services\PromotionContext;
use App\Services\PromotionService;

beforeEach(fn () => $this->promotions = app(PromotionService::class));

function ctx(int $subtotal, array $extra = []): PromotionContext
{
    return new PromotionContext(...$extra + ['subtotal' => $subtotal]);
}

it('menghitung diskon persen dengan batas maksimal', function () {
    $promo = Promotion::factory()->percent(20, 15000)->create();

    expect($this->promotions->calculate($promo, ctx(50000)))->toBe(10000)
        ->and($this->promotions->calculate($promo, ctx(200000)))->toBe(15000);
});

it('diskon nominal tidak melebihi subtotal', function () {
    $promo = Promotion::factory()->fixed(10000)->create();

    expect($this->promotions->calculate($promo, ctx(80000)))->toBe(10000)
        ->and($this->promotions->calculate($promo, ctx(6000)))->toBe(6000);
});

it('beli 1 gratis 1 menggratiskan setiap cangkir kedua pada baris yang sama', function () {
    $promo = Promotion::factory()->bogo()->create();
    $product = snack(25000);
    $lines = [new PricedLine($product, 3, 25000, [], null), new PricedLine(snack(30000), 1, 30000, [], null)];

    expect($this->promotions->calculate($promo, ctx(105000, ['lines' => $lines])))->toBe(25000);
});

it('gratis ongkir hanya memotong ongkir', function () {
    $promo = Promotion::factory()->freeDelivery()->create(['max_discount' => 10000]);

    expect($this->promotions->calculate($promo, ctx(60000, ['deliveryFee' => 8000])))->toBe(8000)
        ->and($this->promotions->calculate($promo, ctx(60000, ['deliveryFee' => 15500])))->toBe(10000)
        ->and($this->promotions->calculate($promo, ctx(60000)))->toBe(0);
});

it('menolak kode yang tidak ada, nonaktif, atau kedaluwarsa', function (string $state) {
    $promo = match ($state) {
        'tidak ada' => null,
        'nonaktif' => Promotion::factory()->create(['code' => 'X1', 'is_active' => false]),
        'kedaluwarsa' => Promotion::factory()->expired()->create(['code' => 'X1']),
        'belum mulai' => Promotion::factory()->create(['code' => 'X1', 'starts_at' => now()->addDay()]),
    };

    $this->promotions->evaluateCode('X1', ctx(100000));
})->with(['tidak ada', 'nonaktif', 'kedaluwarsa', 'belum mulai'])
    ->throws(BusinessException::class, 'Kode voucher tidak ditemukan atau sudah tidak berlaku.');

it('memvalidasi minimal belanja dan outlet', function () {
    $outlet = outlet();
    Promotion::factory()->create(['code' => 'MIN', 'min_spend' => 50000]);
    Promotion::factory()->create(['code' => 'OUTLET', 'outlet_id' => $outlet->id]);

    expect(fn () => $this->promotions->evaluateCode('MIN', ctx(49000)))->toThrow(BusinessException::class, 'Minimal belanja Rp50.000')
        ->and(fn () => $this->promotions->evaluateCode('OUTLET', ctx(10000, ['outletId' => outlet()->id])))->toThrow(BusinessException::class, 'tidak berlaku di outlet')
        ->and($this->promotions->evaluateCode('OUTLET', ctx(10000, ['outletId' => $outlet->id]))->discount)->toBe(1000);
});

it('menolak voucher saat kuota habis', function () {
    $promo = Promotion::factory()->create(['code' => 'KUOTA', 'quota' => 1]);
    PromotionUsage::create(['promotion_id' => $promo->id, 'order_id' => Order::factory()->create()->id, 'discount_amount' => 1000]);

    $this->promotions->evaluateCode('KUOTA', ctx(50000));
})->throws(BusinessException::class, 'Kuota voucher sudah habis.');

it('membatasi pemakaian per pelanggan (member maupun nomor WA tamu)', function () {
    $promo = Promotion::factory()->create(['code' => 'SEKALI', 'per_customer_limit' => 1]);
    $member = customer();
    $guestOrder = Order::factory()->create(['customer_phone' => '6281200001111']);
    PromotionUsage::create(['promotion_id' => $promo->id, 'order_id' => Order::factory()->create(['customer_id' => $member->id])->id, 'customer_id' => $member->id, 'discount_amount' => 1]);
    PromotionUsage::create(['promotion_id' => $promo->id, 'order_id' => $guestOrder->id, 'discount_amount' => 1]);

    expect(fn () => $this->promotions->evaluateCode('SEKALI', ctx(50000, ['customer' => $member])))->toThrow(BusinessException::class, 'batas pemakaian')
        ->and(fn () => $this->promotions->evaluateCode('SEKALI', ctx(50000, ['customerPhone' => '081200001111'])))->toThrow(BusinessException::class, 'batas pemakaian')
        ->and($this->promotions->evaluateCode('SEKALI', ctx(50000, ['customer' => customer()]))->discount)->toBe(5000);
});

it('memberi pesan yang sesuai jenis promo', function () {
    Promotion::factory()->bogo()->create(['code' => 'BOGO']);
    Promotion::factory()->freeDelivery()->create(['code' => 'ONGKIR']);

    expect($this->promotions->evaluateCode('BOGO', ctx(50000))->message)->toContain('dihitung saat checkout')
        ->and($this->promotions->evaluateCode('ONGKIR', ctx(50000))->message)->toContain('Gratis ongkir');
});

it('mengembalikan kuota saat pesanan dibatalkan', function () {
    $promo = Promotion::factory()->create(['code' => 'KUOTA', 'quota' => 1]);
    $order = Order::factory()->create();
    $this->promotions->recordUsage($promo, $order, 1000, ctx(50000));

    expect(fn () => $this->promotions->evaluateCode('KUOTA', ctx(50000)))->toThrow(BusinessException::class);

    app(OrderStateMachine::class)->transition($order, OrderStatus::Cancelled, null, 'Batal');

    expect($this->promotions->evaluateCode('KUOTA', ctx(50000))->discount)->toBe(5000);
});

it('recordUsage memeriksa ulang kuota di dalam kunci', function () {
    $promo = Promotion::factory()->create(['quota' => 1]);
    $this->promotions->recordUsage($promo, Order::factory()->create(), 1000, ctx(50000));

    $this->promotions->recordUsage($promo, Order::factory()->create(), 1000, ctx(50000));
})->throws(BusinessException::class, 'Kuota voucher sudah habis.');

it('menampilkan voucher yang masih bisa dipakai pelanggan', function () {
    $member = customer();
    $used = Promotion::factory()->create(['code' => 'USED', 'per_customer_limit' => 1]);
    Promotion::factory()->create(['code' => 'OPEN', 'per_customer_limit' => 3]);
    Promotion::factory()->create(['code' => 'FULL', 'quota' => 1]);
    Promotion::factory()->create(['code' => null]);
    PromotionUsage::create(['promotion_id' => $used->id, 'order_id' => Order::factory()->create()->id, 'customer_id' => $member->id, 'discount_amount' => 1]);
    PromotionUsage::create(['promotion_id' => Promotion::where('code', 'FULL')->value('id'), 'order_id' => Order::factory()->create()->id, 'discount_amount' => 1]);

    $vouchers = $this->promotions->vouchersFor($member);

    expect($vouchers->pluck('promotion.code')->all())->toBe(['OPEN'])
        ->and($vouchers->first()['remaining'])->toBe(3);
});

it('bestAutomatic mengabaikan promo yang tidak memenuhi syarat', function () {
    Promotion::factory()->fixed(50000)->create(['code' => null, 'min_spend' => 500000]);

    expect($this->promotions->bestAutomatic(ctx(30000)))->toBeNull();
});
