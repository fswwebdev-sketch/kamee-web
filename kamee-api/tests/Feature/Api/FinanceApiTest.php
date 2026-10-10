<?php

use App\Enums\CashCategory;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\StockMovementType;
use App\Models\CashEntry;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\RecipeItem;
use App\Models\StockMovement;
use App\Services\Finance\RecipeService;
use App\Services\OrderStateMachine;

/*
| Keuangan admin: bahan & stok, belanja stok, resep & HPP, buku kas, kasir (POS), ringkasan.
*/

beforeEach(function () {
    $this->outlet = outlet();
    $this->admin = actingAsAdmin(superAdmin());

    // Bahan uji: susu 23,5/ml, kopi 288/gr, cup 1.000/pcs.
    $this->susu = Ingredient::factory()->stock(10000)->create([
        'outlet_id' => $this->outlet->id, 'name' => 'Susu', 'unit' => 'ml', 'pack_label' => '1 liter', 'pack_size' => 1000, 'pack_price' => 23500,
    ]);
    $this->kopi = Ingredient::factory()->stock(1000)->create([
        'outlet_id' => $this->outlet->id, 'name' => 'Kopi', 'unit' => 'gram', 'pack_label' => '1 kg', 'pack_size' => 1000, 'pack_price' => 288000,
    ]);
    $this->cup = Ingredient::factory()->packaging()->stock(30)->create(['outlet_id' => $this->outlet->id, 'name' => 'Cup']);

    // Minuman dengan grup Ukuran (Regular / Large +5.000).
    $this->drink = drink(20000);
    $this->product = $this->drink['product'];
});

/** Resep: Regular {susu 100, kopi 20, cup 1}; Large {susu 150, kopi 30, cup 1}. */
function saveDrinkRecipe(Product $product, Ingredient $susu, Ingredient $kopi, Ingredient $cup, int $outletId): void
{
    app(RecipeService::class)->save($outletId, $product, [
        ['option_name' => 'Regular', 'items' => [
            ['ingredient_id' => $susu->id, 'qty' => 100], ['ingredient_id' => $kopi->id, 'qty' => 20], ['ingredient_id' => $cup->id, 'qty' => 1],
        ]],
        ['option_name' => 'Large', 'items' => [
            ['ingredient_id' => $susu->id, 'qty' => 150], ['ingredient_id' => $kopi->id, 'qty' => 30], ['ingredient_id' => $cup->id, 'qty' => 1],
        ]],
    ], false);
}

function stockOf(Ingredient $ingredient): float
{
    return (float) Ingredient::withoutGlobalScopes()->withTrashed()->whereKey($ingredient->id)->value('stock_qty');
}

it('CRUD bahan menghitung cost_per_unit dan mencatat stok awal', function () {
    $id = $this->postJson('/api/v1/admin/ingredients', [
        'name' => 'Sirup Gula Aren', 'kind' => 'bahan', 'unit' => 'gram', 'pack_label' => '1 liter',
        'pack_size' => 1000, 'pack_price' => 60000, 'min_stock' => 500, 'opening_stock' => 400,
    ])->assertCreated()
        ->assertJsonPath('data.cost_per_unit', 60)
        ->assertJsonPath('data.stock_qty', 400)
        ->assertJsonPath('data.low_stock', true)
        ->assertJsonPath('data.outlet_id', $this->outlet->id)
        ->json('data.id');

    expect(StockMovement::where('ingredient_id', $id)->first())
        ->type->toBe(StockMovementType::Opening)
        ->qty->toEqual(400.0);

    $this->getJson('/api/v1/admin/ingredients?kind=bahan&q=aren')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Sirup Gula Aren');
    $this->getJson('/api/v1/admin/ingredients?kind=kemasan')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Cup');

    $this->putJson("/api/v1/admin/ingredients/{$id}", ['pack_size' => 750, 'pack_price' => 45000, 'min_stock' => null])
        ->assertOk()
        ->assertJsonPath('data.cost_per_unit', 60)
        ->assertJsonPath('data.low_stock', false);

    $this->putJson("/api/v1/admin/ingredients/{$id}", ['opening_stock' => 10])->assertUnprocessable()->assertJsonValidationErrors('opening_stock');
    $this->postJson('/api/v1/admin/ingredients', ['name' => 'X', 'pack_size' => 0])->assertUnprocessable()->assertJsonValidationErrors('pack_size');

    $this->getJson("/api/v1/admin/ingredients/{$this->susu->id}")->assertJsonPath('data.cost_per_unit', 23.5);

    // Hapus: soft delete + baris resep yang memakai bahan ikut terhapus.
    saveDrinkRecipe($this->product, $this->susu, $this->kopi, $this->cup, $this->outlet->id);
    $this->deleteJson("/api/v1/admin/ingredients/{$this->susu->id}")->assertOk();

    expect(Ingredient::find($this->susu->id))->toBeNull()
        ->and(Ingredient::withTrashed()->find($this->susu->id))->not->toBeNull()
        ->and(RecipeItem::where('ingredient_id', $this->susu->id)->count())->toBe(0)
        ->and(RecipeItem::count())->toBe(4);
});

it('stok opname mencatat selisih sebagai mutasi adjustment', function () {
    $this->postJson("/api/v1/admin/ingredients/{$this->susu->id}/adjust", ['counted_qty' => 9250.5, 'note' => 'Hitung akhir minggu'])
        ->assertOk()
        ->assertJsonPath('data.stock_qty', 9250.5);

    $this->getJson("/api/v1/admin/ingredients/{$this->susu->id}/movements")
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.type', 'adjustment')
        ->assertJsonPath('data.0.type_label', 'Stok opname')
        ->assertJsonPath('data.0.qty', -749.5)
        ->assertJsonPath('data.0.note', 'Hitung akhir minggu')
        ->assertJsonPath('data.0.created_by.id', $this->admin->id);

    $this->postJson("/api/v1/admin/ingredients/{$this->susu->id}/adjust", [])->assertUnprocessable()->assertJsonValidationErrors('counted_qty');
});

it('belanja stok menambah stok, memperbarui harga, dan mencatat pengeluaran kas; hapus membalikkan', function () {
    $res = $this->postJson('/api/v1/admin/stock-purchases', [
        'date' => '2026-09-27', 'supplier' => 'Toko A', 'method' => 'bank_transfer', 'bank' => 'BCA',
        'items' => [
            ['ingredient_id' => $this->susu->id, 'packs' => 2, 'pack_price' => 24000],
            ['ingredient_id' => $this->cup->id, 'packs' => 50, 'pack_price' => 900],
        ],
    ])->assertCreated()
        ->assertJsonPath('data.total', 93000)
        ->assertJsonPath('data.method', 'bank_transfer')
        ->assertJsonPath('data.bank', 'BCA')
        ->assertJsonPath('data.items.0.qty', 2000)
        ->assertJsonPath('data.items.1.subtotal', 45000);

    $purchaseId = $res->json('data.id');
    $entry = CashEntry::find($res->json('data.cash_entry_id'));

    expect(stockOf($this->susu))->toEqual(12000.0)
        ->and(stockOf($this->cup))->toEqual(80.0)
        ->and($this->susu->fresh()->pack_price)->toBe(24000)
        ->and($entry->amount)->toBe(93000)
        ->and($entry->category)->toBe(CashCategory::BahanBaku)
        ->and($entry->description)->toBe('Belanja: Susu ×2, Cup ×50')
        ->and($entry->source->value)->toBe('stock_purchase')
        ->and($entry->bank)->toBe('BCA');

    $movement = StockMovement::where('ingredient_id', $this->susu->id)->first();
    expect($movement->type)->toBe(StockMovementType::Purchase)
        ->and($movement->reference)->toBe("Belanja #{$purchaseId}")
        ->and($movement->unit_cost)->toEqual(24.0);

    // Hanya kemasan → kategori kemasan.
    $this->postJson('/api/v1/admin/stock-purchases', [
        'date' => '2026-09-27', 'method' => 'cash', 'items' => [['ingredient_id' => $this->cup->id, 'packs' => 10, 'pack_price' => 1000]],
    ])->assertCreated();
    expect(CashEntry::latest('id')->first()->category)->toBe(CashCategory::Kemasan);

    $this->getJson('/api/v1/admin/stock-purchases?from=2026-09-27&to=2026-09-27')->assertOk()->assertJsonPath('meta.total', 2);

    $this->deleteJson("/api/v1/admin/stock-purchases/{$purchaseId}")->assertOk();

    expect(stockOf($this->susu))->toEqual(10000.0)
        ->and(stockOf($this->cup))->toEqual(40.0)
        ->and(CashEntry::find($entry->id))->toBeNull()
        ->and(StockMovement::where('stock_purchase_id', $purchaseId)->count())->toBe(0);

    $this->postJson('/api/v1/admin/stock-purchases', ['date' => '2026-09-27', 'method' => 'cash', 'items' => [['ingredient_id' => 999999, 'packs' => 1, 'pack_price' => 1]]])
        ->assertUnprocessable()->assertJsonValidationErrors('items.0.ingredient_id');
});

it('resep: PUT mengganti resep, GET menghitung HPP, margin, dan porsi dari stok', function () {
    $body = ['variants' => [
        ['option_name' => 'Regular', 'items' => [
            ['ingredient_id' => $this->susu->id, 'qty' => 120], ['ingredient_id' => $this->kopi->id, 'qty' => 20], ['ingredient_id' => $this->cup->id, 'qty' => 1],
        ]],
        ['option_name' => 'Large', 'items' => [['ingredient_id' => $this->kopi->id, 'qty' => 30]]],
    ], 'note' => 'Shake lalu tuang espresso'];

    $this->putJson("/api/v1/admin/recipes/{$this->product->id}", $body)
        ->assertOk()
        ->assertJsonPath('data.product_id', $this->product->id)
        ->assertJsonPath('data.is_sample', false)
        ->assertJsonPath('data.note', 'Shake lalu tuang espresso')
        ->assertJsonPath('data.variants.0.option_name', 'Regular')
        ->assertJsonPath('data.variants.0.price', 20000)
        // 120 × 23,5 + 20 × 288 + 1.000 = 2.820 + 5.760 + 1.000
        ->assertJsonPath('data.variants.0.hpp', 9580)
        ->assertJsonPath('data.variants.0.margin', 10420)
        ->assertJsonPath('data.variants.0.margin_pct', 52.1)
        ->assertJsonPath('data.variants.0.items.0.cost', 2820)
        // susu 10.000/120 = 83, kopi 1.000/20 = 50, cup 30 → 30
        ->assertJsonPath('data.variants.0.cups_possible', 30)
        ->assertJsonPath('data.variants.0.limiting_ingredient', 'Cup')
        ->assertJsonPath('data.variants.1.option_name', 'Large')
        ->assertJsonPath('data.variants.1.price', 25000)
        ->assertJsonPath('data.variants.1.cups_possible', 33)
        ->assertJsonPath('data.variants.1.limiting_ingredient', 'Kopi');

    $other = snack(15000);
    $list = $this->getJson('/api/v1/admin/recipes')->assertOk()->json('data');
    $drink = collect($list)->firstWhere('product_id', $this->product->id);
    $snack = collect($list)->firstWhere('product_id', $other->id);

    expect($drink['variants'])->toHaveCount(2)
        ->and($snack['variants'])->toHaveCount(1)
        ->and($snack['variants'][0])->toMatchArray(['option_name' => null, 'price' => 15000, 'items' => [], 'hpp' => 0, 'cups_possible' => null, 'limiting_ingredient' => null]);

    // Stok habis → 0 porsi.
    $this->postJson("/api/v1/admin/ingredients/{$this->cup->id}/adjust", ['counted_qty' => 0]);
    $this->getJson("/api/v1/admin/recipes/{$this->product->id}")->assertJsonPath('data.variants.0.cups_possible', 0);

    $this->putJson("/api/v1/admin/recipes/{$this->product->id}", ['variants' => [['option_name' => 'Jumbo', 'items' => []]]])
        ->assertUnprocessable()->assertJsonValidationErrors('variants.0.option_name');
    $this->putJson("/api/v1/admin/recipes/{$other->id}", ['is_sample' => true, 'variants' => [['option_name' => null, 'items' => [['ingredient_id' => $this->kopi->id, 'qty' => 10]]]]])
        ->assertOk()->assertJsonPath('data.is_sample', true)->assertJsonPath('data.variants.0.hpp', 2880);
});

it('kasir (POS) membuat pesanan selesai, menghitung kembalian, dan memotong stok', function () {
    saveDrinkRecipe($this->product, $this->susu, $this->kopi, $this->cup, $this->outlet->id);

    $res = $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [
            ['product_id' => $this->product->id, 'qty' => 2, 'option_ids' => [$this->drink['large']]],
            ['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]],
        ],
        'payment_method' => 'cash',
        'cash_received' => 100000,
    ])->assertCreated()
        ->assertJsonPath('message', 'Pesanan kasir tersimpan.')
        ->assertJsonPath('change', 30000)
        ->assertJsonPath('data.total', 70000)
        ->assertJsonPath('data.status', 'completed')
        ->assertJsonPath('data.channel', 'pos')
        ->assertJsonPath('data.fulfillment', 'dine_in')
        ->assertJsonPath('data.customer_name', 'Pembeli langsung')
        ->assertJsonPath('data.payment.method', 'cash')
        ->assertJsonPath('data.payment.provider', 'pos')
        ->assertJsonPath('data.payment.status', 'paid');

    expect(collect($res->json('data.status_logs'))->map(fn ($l) => [$l['to_status'], $l['note']])->all())->toBe([
        ['pending', 'Pesanan dibuat via Kasir (POS)'],
        ['paid', 'Dibayar di kasir (Tunai)'],
        ['completed', 'Pesanan kasir selesai'],
    ]);

    $order = Order::find($res->json('data.id'));
    expect($order->paid_at)->not->toBeNull()
        ->and($order->completed_at)->not->toBeNull()
        ->and($order->stock_deducted_at)->not->toBeNull()
        // 2 Large (150) + 1 Regular (100) = 400 ml; kopi 2×30 + 20 = 80; cup 3
        ->and(stockOf($this->susu))->toEqual(9600.0)
        ->and(stockOf($this->kopi))->toEqual(920.0)
        ->and(stockOf($this->cup))->toEqual(27.0)
        ->and(StockMovement::where('order_id', $order->id)->where('type', 'sale')->pluck('reference')->unique()->all())->toBe([$order->code]);

    // Non-tunai: kembalian 0, bank tersimpan.
    $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]]],
        'payment_method' => 'bank_transfer', 'bank' => 'BJB', 'customer_name' => 'Rani', 'fulfillment' => 'pickup',
    ])->assertCreated()
        ->assertJsonPath('change', 0)
        ->assertJsonPath('data.customer_name', 'Rani')
        ->assertJsonPath('data.payment.method', 'bank_transfer')
        ->assertJsonPath('data.payment.bank', 'BJB')
        ->assertJsonPath('data.payment.method_label', 'Transfer BJB')
        ->assertJsonPath('data.status_logs.1.note', 'Dibayar di kasir (Transfer BJB)');

    // Uang kurang → 422, tidak ada pesanan baru.
    $count = Order::count();
    $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]]],
        'payment_method' => 'cash', 'cash_received' => 19000,
    ])->assertUnprocessable()->assertJsonValidationErrors('cash_received');
    expect(Order::count())->toBe($count);

    // Opsi wajib (Ukuran) tetap divalidasi seperti pesanan online.
    $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => []]], 'payment_method' => 'qris',
    ])->assertUnprocessable();
});

it('kasir bisa mencatat penjualan susulan dengan tanggal lampau', function () {
    saveDrinkRecipe($this->product, $this->susu, $this->kopi, $this->cup, $this->outlet->id);
    $this->travelTo(now()->setDate(2026, 10, 10)->setTime(22, 0));

    $res = $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]]],
        'payment_method' => 'qris', 'customer_name' => 'Bu Ani', 'sold_at' => '2026-10-09 14:30',
    ])->assertCreated()->assertJsonPath('data.status', 'completed');

    $order = Order::find($res->json('data.id'));
    expect($order->created_at->format('Y-m-d H:i'))->toBe('2026-10-09 14:30')
        ->and($order->paid_at->format('Y-m-d H:i'))->toBe('2026-10-09 14:30')
        ->and($order->completed_at->format('Y-m-d H:i'))->toBe('2026-10-09 14:30')
        ->and($order->code)->toStartWith('KM261009')
        ->and($order->payments()->first()->paid_at->format('Y-m-d H:i'))->toBe('2026-10-09 14:30')
        ->and(StockMovement::where('order_id', $order->id)->get()->every(fn ($m) => $m->created_at->format('Y-m-d') === '2026-10-09'))->toBeTrue()
        ->and(stockOf($this->cup))->toEqual(29.0)
        ->and($res->json('data.status_logs.0.note'))->toBe('Pesanan dibuat via Kasir (POS) (dicatat susulan 10/10/2026 22:00)');

    // Tanpa sold_at → waktu sekarang; tanggal masa depan ditolak.
    $now = $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]]], 'payment_method' => 'cash',
    ])->assertCreated();
    expect(Order::find($now->json('data.id'))->created_at->format('Y-m-d H:i'))->toBe('2026-10-10 22:00');

    $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]]],
        'payment_method' => 'cash', 'sold_at' => '2026-10-11 09:00',
    ])->assertUnprocessable()->assertJsonValidationErrors('sold_at');
});

it('stok boleh minus dan pemotongan idempoten; dibalik sekali saat batal', function () {
    saveDrinkRecipe($this->product, $this->susu, $this->kopi, $this->cup, $this->outlet->id);
    $this->cup->forceFill(['stock_qty' => 1])->save();

    $order = Order::factory()->create(['outlet_id' => $this->outlet->id]);
    $item = $order->items()->create(['product_id' => $this->product->id, 'product_name' => 'Kopi', 'unit_price' => 25000, 'qty' => 2, 'subtotal' => 50000]);
    $item->options()->create(['option_name' => 'Ukuran: Large', 'price_delta' => 5000]);
    $order->payments()->create(['method' => PaymentMethod::Cash, 'provider' => 'cash', 'amount' => 50000, 'status' => PaymentStatus::Pending]);

    $sm = app(OrderStateMachine::class);
    $sm->transition($order, OrderStatus::Processing, $this->admin); // tunai: pending → processing memotong stok
    $sm->transition($order, OrderStatus::Completed, $this->admin);

    expect(stockOf($this->cup))->toEqual(-1.0)
        ->and(stockOf($this->susu))->toEqual(9700.0)
        ->and(StockMovement::where('order_id', $order->id)->count())->toBe(3);

    // Pesanan lain dibatalkan setelah dibayar (tunai, sedang diproses) → sale_reversal sekali.
    $other = Order::factory()->create(['outlet_id' => $this->outlet->id]);
    $other->items()->create(['product_id' => $this->product->id, 'product_name' => 'Kopi', 'unit_price' => 20000, 'qty' => 1, 'subtotal' => 20000])
        ->options()->create(['option_name' => 'Ukuran: Regular', 'price_delta' => 0]);
    $other->payments()->create(['method' => PaymentMethod::Cash, 'provider' => 'cash', 'amount' => 20000, 'status' => PaymentStatus::Pending]);

    $sm->transition($other, OrderStatus::Processing, $this->admin);
    expect(stockOf($this->susu))->toEqual(9600.0);

    $this->patchJson("/api/v1/admin/orders/{$other->id}/status", ['status' => 'cancelled', 'note' => 'Batal'])->assertOk();

    expect(stockOf($this->susu))->toEqual(9700.0)
        ->and(StockMovement::where('order_id', $other->id)->where('type', 'sale_reversal')->count())->toBe(3)
        ->and($other->fresh()->stock_reversed_at)->not->toBeNull();
});

it('konfirmasi pembayaran Transfer BCA memotong stok; refund mengembalikannya', function () {
    saveDrinkRecipe($this->product, $this->susu, $this->kopi, $this->cup, $this->outlet->id);

    $order = Order::factory()->create(['outlet_id' => $this->outlet->id, 'total' => 20000, 'subtotal' => 20000]);
    $order->items()->create(['product_id' => $this->product->id, 'product_name' => 'Kopi', 'unit_price' => 20000, 'qty' => 1, 'subtotal' => 20000])
        ->options()->create(['option_name' => 'Ukuran: Regular', 'price_delta' => 0]);

    $this->postJson("/api/v1/admin/orders/{$order->id}/confirm-payment", ['method' => 'bank_transfer', 'bank' => 'BCA', 'note' => 'Mutasi 10:05'])
        ->assertOk()
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonPath('data.payment.method', 'bank_transfer')
        ->assertJsonPath('data.payment.bank', 'BCA')
        ->assertJsonPath('data.payment.method_label', 'Transfer BCA');

    $payment = Payment::where('order_id', $order->id)->first();
    expect($payment->method)->toBe(PaymentMethod::BankTransfer)
        ->and($payment->raw_payload['bank'])->toBe('BCA')
        ->and($order->statusLogs()->latest('id')->value('note'))->toBe("Pembayaran Transfer BCA dikonfirmasi oleh {$this->admin->name}")
        ->and(stockOf($this->susu))->toEqual(9900.0);

    // Default tetap QRIS.
    $qris = Order::factory()->create(['outlet_id' => $this->outlet->id]);
    $this->postJson("/api/v1/admin/orders/{$qris->id}/confirm-payment")->assertOk()->assertJsonPath('data.payment.method', 'qris');
    expect($qris->statusLogs()->latest('id')->value('note'))->toBe("Pembayaran QRIS dikonfirmasi oleh {$this->admin->name}");

    $this->postJson("/api/v1/admin/orders/{$order->id}/confirm-payment", ['method' => 'ewallet'])->assertUnprocessable();

    $this->postJson("/api/v1/admin/orders/{$order->id}/refund", ['reason' => 'Salah pesan'])->assertOk();
    expect(stockOf($this->susu))->toEqual(10000.0)
        ->and(StockMovement::where('order_id', $order->id)->where('type', 'sale_reversal')->sum('qty'))->toEqual(121.0);
});

it('buku kas: CRUD, ringkasan sesuai filter, dan entri belanja stok terkunci', function () {
    $this->postJson('/api/v1/admin/cash-entries', [
        'date' => '2026-09-21', 'type' => 'income', 'category' => 'penjualan', 'description' => 'Penjualan — Nur',
        'amount' => 91000, 'method' => 'bank_transfer', 'bank' => 'BCA', 'counterparty' => 'Nur',
    ])->assertCreated()
        ->assertJsonPath('data.category_label', 'Penjualan di luar sistem')
        ->assertJsonPath('data.method_label', 'Transfer')
        ->assertJsonPath('data.source', 'manual')
        ->assertJsonPath('data.created_by.id', $this->admin->id);

    $this->postJson('/api/v1/admin/cash-entries', [
        'date' => '2026-09-21', 'type' => 'income', 'category' => 'ongkir', 'description' => 'x', 'amount' => 1000, 'method' => 'cash',
    ])->assertUnprocessable()->assertJsonValidationErrors('category');

    CashEntry::factory()->create(['outlet_id' => $this->outlet->id, 'date' => '2026-09-22', 'amount' => 30000, 'category' => CashCategory::Ongkir, 'description' => 'Ongkir Sukma']);
    CashEntry::factory()->income(CashCategory::Modal)->create(['outlet_id' => $this->outlet->id, 'date' => '2026-09-10', 'amount' => 500000]);
    for ($i = 0; $i < 3; $i++) {
        CashEntry::factory()->create(['outlet_id' => $this->outlet->id, 'date' => '2026-09-23', 'amount' => 1000]);
    }

    $this->getJson('/api/v1/admin/cash-entries?from=2026-09-20&to=2026-09-30&per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 5)
        ->assertJsonPath('summary', ['income' => 91000, 'expense' => 33000, 'balance' => 58000]);

    $this->getJson('/api/v1/admin/cash-entries?type=expense&q=sukma')->assertJsonPath('meta.total', 1)
        ->assertJsonPath('summary.expense', 30000);
    $this->getJson('/api/v1/admin/cash-entries?method=bank_transfer')->assertJsonPath('meta.total', 1);
    $this->getJson('/api/v1/admin/cash-entries?category=modal')->assertJsonPath('summary.income', 500000);

    $manual = CashEntry::where('description', 'Penjualan — Nur')->first();
    $this->putJson("/api/v1/admin/cash-entries/{$manual->id}", ['amount' => 95000, 'method' => 'cash'])
        ->assertOk()->assertJsonPath('data.amount', 95000)->assertJsonPath('data.bank', null);
    $this->deleteJson("/api/v1/admin/cash-entries/{$manual->id}")->assertOk();

    $purchaseEntry = $this->postJson('/api/v1/admin/stock-purchases', [
        'date' => '2026-09-27', 'method' => 'cash', 'items' => [['ingredient_id' => $this->cup->id, 'packs' => 1, 'pack_price' => 1000]],
    ])->json('data.cash_entry_id');

    $this->putJson("/api/v1/admin/cash-entries/{$purchaseEntry}", ['amount' => 5])->assertUnprocessable()->assertJsonPath('message', 'Ubah lewat menu Belanja stok.');
    $this->deleteJson("/api/v1/admin/cash-entries/{$purchaseEntry}")->assertUnprocessable()->assertJsonPath('message', 'Ubah lewat menu Belanja stok.');
    expect(CashEntry::find($purchaseEntry)->amount)->toBe(1000);
});

it('ringkasan keuangan menggabungkan penjualan, HPP, buku kas, dan menu terlaris', function () {
    saveDrinkRecipe($this->product, $this->susu, $this->kopi, $this->cup, $this->outlet->id);
    $snack = snack(15000); // tanpa resep

    $pos = fn (array $items, string $method, array $extra = []) => $this->postJson('/api/v1/admin/orders/pos', ['items' => $items, 'payment_method' => $method] + $extra)->assertCreated();

    // 2 Large (25.000) tunai; 1 Regular + 1 snack QRIS.
    $pos([['product_id' => $this->product->id, 'qty' => 2, 'option_ids' => [$this->drink['large']]]], 'cash');
    $pos([
        ['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]],
        ['product_id' => $snack->id, 'qty' => 1],
    ], 'qris');

    // Pesanan online terbayar transfer kemarin, dan satu pesanan batal (tidak dihitung).
    Order::factory()->status(OrderStatus::Paid)->create(['outlet_id' => $this->outlet->id, 'total' => 40000, 'paid_at' => now()->subDay(), 'channel' => OrderChannel::WhatsApp])
        ->payments()->create(['method' => PaymentMethod::BankTransfer, 'provider' => 'manual', 'amount' => 40000, 'status' => PaymentStatus::Paid]);
    Order::factory()->status(OrderStatus::Cancelled)->create(['outlet_id' => $this->outlet->id, 'total' => 99000, 'paid_at' => now()]);
    // Outlet lain tidak ikut bila difilter.
    Order::factory()->status(OrderStatus::Completed)->create(['outlet_id' => outlet()->id, 'total' => 12345]);

    CashEntry::factory()->income(CashCategory::Penjualan)->create(['outlet_id' => $this->outlet->id, 'date' => '2026-09-21', 'amount' => 91000, 'method' => PaymentMethod::BankTransfer]);
    CashEntry::factory()->income(CashCategory::Modal)->create(['outlet_id' => $this->outlet->id, 'date' => '2026-09-22', 'amount' => 500000]);
    CashEntry::factory()->expense(CashCategory::BahanBaku)->create(['outlet_id' => $this->outlet->id, 'date' => '2026-09-20', 'amount' => 200000]);
    CashEntry::factory()->expense(CashCategory::Ongkir)->create(['outlet_id' => $this->outlet->id, 'date' => '2026-09-20', 'amount' => 22000]);
    CashEntry::factory()->expense(CashCategory::Gaji)->create(['outlet_id' => $this->outlet->id, 'date' => '2026-10-01', 'amount' => 777]); // di luar periode

    $data = $this->getJson("/api/v1/admin/finance/summary?from=2026-09-20&to=2026-09-29&outlet_id={$this->outlet->id}")->assertOk()->json('data');

    // Penjualan: 50.000 (tunai) + 35.000 (QRIS) + 40.000 (transfer).
    $methods = collect($data['sales']['by_method'])->keyBy('method');
    expect($data['period'])->toBe(['from' => '2026-09-20', 'to' => '2026-09-29'])
        ->and($data['sales']['total'])->toBe(125000)
        ->and($data['sales']['orders_count'])->toBe(3)
        ->and($methods['cash'])->toMatchArray(['label' => 'Tunai', 'amount' => 50000, 'count' => 1])
        ->and($methods['qris'])->toMatchArray(['amount' => 35000, 'count' => 1])
        ->and($methods['bank_transfer'])->toMatchArray(['label' => 'Transfer', 'amount' => 40000, 'count' => 1])
        ->and(collect($data['sales']['by_channel'])->firstWhere('channel', 'pos'))->toMatchArray(['amount' => 85000, 'count' => 2])
        ->and($data['other_income']['total'])->toBe(591000)
        ->and($data['income_total'])->toBe(716000)
        ->and(collect($data['income_by_method'])->firstWhere('method', 'bank_transfer')['amount'])->toBe(131000);

    // HPP: Large = 150×23,5 + 30×288 + 1.000 = 13.165 (×2); Regular = 2.350 + 5.760 + 1.000 = 9.110; snack 0.
    expect($data['hpp_total'])->toBe(13165 * 2 + 9110)
        ->and($data['gross_profit'])->toBe(125000 - 35440)
        ->and($data['expenses']['total'])->toBe(222000)
        ->and($data['stock_purchases_total'])->toBe(200000)
        ->and($data['operating_expenses'])->toBe(22000)
        ->and($data['net_profit_estimate'])->toBe(125000 - 35440 + 91000 - 22000)
        ->and($data['cash_flow'])->toBe(716000 - 222000)
        ->and($data['missing_recipes'])->toBe([$snack->name])
        ->and($data['daily'])->toHaveCount(10)
        ->and(collect($data['daily'])->firstWhere('date', '2026-09-28'))->toBe(['date' => '2026-09-28', 'sales' => 85000, 'other_income' => 0, 'expense' => 0])
        ->and(collect($data['daily'])->firstWhere('date', '2026-09-20')['expense'])->toBe(222000);

    // Menu terlaris: produk minuman (3) di atas snack (1); varian per ukuran.
    expect($data['products'][0])->toMatchArray(['product_id' => $this->product->id, 'qty' => 3, 'revenue' => 70000, 'hpp' => 35440, 'profit' => 34560])
        ->and($data['products'][0]['variants'])->toBe([
            ['option_name' => 'Large', 'qty' => 2, 'revenue' => 50000],
            ['option_name' => 'Regular', 'qty' => 1, 'revenue' => 20000],
        ])
        ->and($data['products'][1])->toMatchArray(['product_id' => $snack->id, 'qty' => 1, 'hpp' => 0]);

    // Default: bulan berjalan.
    $this->getJson('/api/v1/admin/finance/summary')->assertOk()
        ->assertJsonPath('data.period', ['from' => '2026-09-01', 'to' => '2026-09-30']);
});

it('Admin Outlet hanya melihat dan mengelola data keuangan outletnya', function () {
    $outletB = outlet();
    $adminB = outletAdmin($outletB);
    $kopiB = Ingredient::factory()->create(['outlet_id' => $outletB->id, 'name' => 'Kopi B']);
    CashEntry::factory()->create(['outlet_id' => $outletB->id, 'amount' => 7000]);
    CashEntry::factory()->create(['outlet_id' => $this->outlet->id, 'amount' => 9000]);

    actingAsAdmin($adminB);

    $this->getJson("/api/v1/admin/ingredients?outlet_id={$this->outlet->id}")
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Kopi B');
    $this->getJson("/api/v1/admin/ingredients/{$this->susu->id}")->assertNotFound();
    $this->putJson("/api/v1/admin/ingredients/{$this->susu->id}", ['name' => 'X'])->assertNotFound();
    $this->postJson("/api/v1/admin/ingredients/{$this->susu->id}/adjust", ['counted_qty' => 1])->assertNotFound();
    $this->getJson('/api/v1/admin/cash-entries')->assertJsonPath('meta.total', 1)->assertJsonPath('summary.expense', 7000);

    // Data baru selalu masuk outlet admin; bahan outlet lain ditolak.
    $this->postJson('/api/v1/admin/ingredients', ['name' => 'Gula', 'outlet_id' => $this->outlet->id])
        ->assertCreated()->assertJsonPath('data.outlet_id', $outletB->id);
    $this->postJson('/api/v1/admin/stock-purchases', ['date' => '2026-09-27', 'method' => 'cash', 'items' => [['ingredient_id' => $this->susu->id, 'packs' => 1, 'pack_price' => 1]]])
        ->assertUnprocessable()->assertJsonValidationErrors('items.0.ingredient_id');
    $this->putJson("/api/v1/admin/recipes/{$this->product->id}", ['variants' => [['option_name' => 'Regular', 'items' => [['ingredient_id' => $this->susu->id, 'qty' => 1]]]]])
        ->assertUnprocessable();
    $this->putJson("/api/v1/admin/recipes/{$this->product->id}", ['variants' => [['option_name' => 'Regular', 'items' => [['ingredient_id' => $kopiB->id, 'qty' => 1]]]]])
        ->assertOk();

    $res = $this->postJson('/api/v1/admin/orders/pos', [
        'items' => [['product_id' => $this->product->id, 'qty' => 1, 'option_ids' => [$this->drink['regular']]]], 'payment_method' => 'qris',
    ])->assertCreated();
    expect(Order::withoutGlobalScopes()->find($res->json('data.id'))->outlet_id)->toBe($outletB->id)
        ->and(stockOf($kopiB))->toEqual(-1.0)
        ->and(stockOf($this->susu))->toEqual(10000.0);

    // Resep outlet A tidak terpengaruh / tidak terlihat.
    actingAsAdmin($this->admin);
    $this->getJson("/api/v1/admin/recipes/{$this->product->id}?outlet_id={$this->outlet->id}")->assertJsonPath('data.variants.0.items', []);
});

it('endpoint keuangan membutuhkan login admin', function () {
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/v1/admin/finance/summary')->assertUnauthorized();
    $this->getJson('/api/v1/admin/ingredients')->assertUnauthorized();

    actingAsCustomer();
    $this->getJson('/api/v1/admin/cash-entries')->assertForbidden();
});
