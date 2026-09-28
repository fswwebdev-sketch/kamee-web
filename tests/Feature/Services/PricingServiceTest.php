<?php

use App\Enums\FulfillmentType;
use App\Exceptions\BusinessException;
use App\Models\Promotion;
use App\Services\Pricing\CartItem;
use App\Services\Pricing\PricingRequest;
use App\Services\Pricing\PricingResult;
use App\Services\Pricing\PricingService;
use App\Services\SettingService;

beforeEach(function () {
    $this->outlet = outlet();
    $this->drink = drink(22000);
    $this->pricing = app(PricingService::class);
});

function price(array $items, array $args = []): PricingResult
{
    return app(PricingService::class)->price(new PricingRequest(...$args + [
        'outletId' => test()->outlet->id,
        'items' => $items,
    ]));
}

it('menghitung harga dasar + opsi di server', function () {
    $d = $this->drink;

    $result = price([new CartItem($d['product']->id, 2, [$d['large'], $d['less'], $d['shot'], $d['boba']])]);

    // (22.000 + 5.000 + 6.000 + 5.000) × 2
    expect($result->lines[0]->unitPrice)->toBe(38000)
        ->and($result->subtotal)->toBe(76000)
        ->and($result->total)->toBe(76000)
        ->and($result->deliveryFee)->toBe(0);
});

it('menjumlahkan beberapa item', function () {
    $snack = snack(20000);

    $result = price([
        new CartItem($this->drink['product']->id, 1, [$this->drink['regular']]),
        new CartItem($snack->id, 3),
    ]);

    expect($result->subtotal)->toBe(82000)->and(count($result->lines))->toBe(2);
});

it('menolak opsi wajib yang tidak dipilih', function () {
    price([new CartItem($this->drink['product']->id, 1, [])]);
})->throws(BusinessException::class, 'Beberapa item di keranjang tidak valid.');

it('menolak lebih dari satu opsi pada grup single', function () {
    try {
        price([new CartItem($this->drink['product']->id, 1, [$this->drink['regular'], $this->drink['large']])]);
        $this->fail('Seharusnya gagal');
    } catch (BusinessException $e) {
        expect($e->errors()['items.0.option_ids'])->toContain('Pilih hanya satu opsi Ukuran.');
    }
});

it('menolak opsi yang bukan milik produk', function () {
    $other = drink(30000);

    try {
        price([new CartItem($this->drink['product']->id, 1, [$this->drink['regular'], $other['shot']])]);
        $this->fail('Seharusnya gagal');
    } catch (BusinessException $e) {
        expect($e->errors()['items.0.option_ids'][0])->toContain('tidak tersedia');
    }
});

it('menolak produk nonaktif, tidak dikenal, dan habis di outlet', function () {
    $inactive = snack();
    $inactive->update(['is_active' => false]);
    $soldOut = snack();
    $this->outlet->products()->attach($soldOut->id, ['is_available' => false]);

    try {
        price([new CartItem($inactive->id, 1), new CartItem(99999, 1), new CartItem($soldOut->id, 1)]);
        $this->fail('Seharusnya gagal');
    } catch (BusinessException $e) {
        expect($e->errors())->toHaveKeys(['items.0.product_id', 'items.1.product_id', 'items.2.product_id'])
            ->and($e->errors()['items.2.product_id'][0])->toContain('sedang habis');
    }
});

it('menolak jumlah di luar batas', function () {
    price([new CartItem(snack()->id, 51)]);
})->throws(BusinessException::class);

it('menolak keranjang kosong dan outlet tidak dikenal', function () {
    expect(fn () => price([]))->toThrow(BusinessException::class, 'Keranjang masih kosong.')
        ->and(fn () => app(PricingService::class)->price(new PricingRequest(outletId: 999, items: [new CartItem(snack()->id, 1)])))
        ->toThrow(BusinessException::class, 'Outlet tidak ditemukan.');
});

it('menambahkan ongkir untuk pesanan antar', function () {
    $result = price([new CartItem(snack(20000)->id, 2)], [
        'fulfillment' => FulfillmentType::Delivery, 'lat' => -6.2100, 'lng' => 106.6400,
    ]);

    expect($result->deliveryFee)->toBe(8000)
        ->and($result->deliveryDistanceKm)->toBeGreaterThan(0)
        ->and($result->total)->toBe(48000);
});

it('mewajibkan titik lokasi untuk pesanan antar', function () {
    price([new CartItem(snack()->id, 1)], ['fulfillment' => FulfillmentType::Delivery]);
})->throws(BusinessException::class, 'Titik lokasi pengantaran wajib diisi.');

it('menambahkan biaya layanan dari pengaturan', function () {
    app(SettingService::class)->update(['service_fee' => 2000]);

    expect(price([new CartItem(snack(20000)->id, 1)])->total)->toBe(22000);
});

it('menerapkan voucher dan mengabaikan harga dari klien', function () {
    Promotion::factory()->percent(20, 15000)->create(['code' => 'KAMEEHEMAT', 'min_spend' => 40000]);

    $result = price([new CartItem(snack(25000)->id, 4)], ['promoCode' => 'kameehemat']);

    // 20% × 100.000 = 20.000 → dibatasi maks 15.000
    expect($result->discount)->toBe(15000)
        ->and($result->promotion->code)->toBe('KAMEEHEMAT')
        ->and($result->total)->toBe(85000);
});

it('menerapkan promo otomatis terbaik bila tidak ada kode', function () {
    Promotion::factory()->fixed(3000)->create(['code' => null]);
    Promotion::factory()->percent(10)->create(['code' => null]);

    $result = price([new CartItem(snack(25000)->id, 2)]);

    expect($result->discount)->toBe(5000);
});

it('menukar poin hanya untuk member dengan batas persentase', function () {
    $customer = customer();
    $customer->forceFill(['points_balance' => 500])->save();

    expect(fn () => price([new CartItem(snack(20000)->id, 1)], ['redeemPoints' => 50]))
        ->toThrow(BusinessException::class, 'Masuk sebagai member');

    // subtotal 40.000 → maks 50% = 20.000 = 200 poin
    $result = price([new CartItem(snack(20000)->id, 2)], ['redeemPoints' => 150, 'customer' => $customer]);
    expect($result->pointsRedeemed)->toBe(150)->and($result->pointsValue)->toBe(15000)->and($result->total)->toBe(25000);

    expect(fn () => price([new CartItem(snack(20000)->id, 2)], ['redeemPoints' => 250, 'customer' => $customer]))
        ->toThrow(BusinessException::class, 'Maksimal 200 poin');
});

it('menyajikan hasil sebagai array', function () {
    $array = price([new CartItem($this->drink['product']->id, 1, [$this->drink['large']])])->toArray();

    expect($array)->toHaveKeys(['items', 'subtotal', 'discount', 'promotion', 'points_value', 'delivery_fee', 'total'])
        ->and($array['items'][0]['options'][0])->toMatchArray(['name' => 'Large', 'group' => 'Ukuran', 'price_delta' => 5000]);
});
