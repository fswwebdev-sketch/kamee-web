<?php

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OtpCode;
use App\Models\Promotion;
use App\Models\Review;
use App\Services\LoyaltyService;
use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function otpFromWhatsApp(string $phone): string
{
    preg_match('/\*(\d{6})\*/', whatsapp()->lastTo($phone), $m);

    return $m[1];
}

it('login pelanggan dengan OTP WhatsApp dan mendaftarkan pelanggan baru', function () {
    $this->postJson('/api/v1/auth/otp/request', ['phone' => '0812-3456-7890'])
        ->assertOk()->assertJsonPath('message', 'Kode OTP sudah dikirim ke WhatsApp Anda.')->assertJsonPath('data.expires_in', 300);

    $code = otpFromWhatsApp('6281234567890');

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '081234567890', 'code' => '000000'])
        ->assertUnprocessable()->assertJsonPath('errors.code.0', 'Kode OTP salah.');

    $response = $this->postJson('/api/v1/auth/otp/verify', ['phone' => '081234567890', 'code' => $code, 'name' => 'Dinda'])
        ->assertOk()
        ->assertJsonPath('data.is_new', true)
        ->assertJsonPath('data.customer.name', 'Dinda')
        ->assertJsonPath('data.customer.points_balance', 0)
        ->assertJsonPath('data.customer.tier.name', 'Bronze');

    $token = $response->json('data.token');
    $this->withToken($token)->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.phone_wa', '6281234567890');

    // Kode tidak bisa dipakai ulang
    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '081234567890', 'code' => $code])->assertUnprocessable();

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk()->assertJsonPath('message', 'Berhasil keluar.');
    expect(Customer::first()->tokens()->count())->toBe(0);
});

it('membatasi permintaan OTP 3 kali per 10 menit per nomor', function () {
    foreach (range(1, 3) as $i) {
        $this->postJson('/api/v1/auth/otp/request', ['phone' => '081234567890'])->assertOk();
    }

    $this->postJson('/api/v1/auth/otp/request', ['phone' => '6281234567890'])
        ->assertTooManyRequests()
        ->assertJsonPath('message', fn ($m) => str_starts_with($m, 'Permintaan OTP sudah mencapai batas 3 kali dalam 10 menit.'));

    $this->postJson('/api/v1/auth/otp/request', ['phone' => '081299998888'])->assertOk();

    $this->travel(11)->minutes();
    $this->postJson('/api/v1/auth/otp/request', ['phone' => '081234567890'])->assertOk();
});

it('menolak OTP kedaluwarsa dan terlalu banyak percobaan', function () {
    $this->postJson('/api/v1/auth/otp/request', ['phone' => '081234567890']);
    OtpCode::query()->update(['attempts' => 5]);
    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '081234567890', 'code' => '123456'])
        ->assertJsonPath('errors.code.0', 'Terlalu banyak percobaan. Silakan minta kode baru.');

    $this->postJson('/api/v1/auth/otp/request', ['phone' => '081234567890']);
    $this->travel(6)->minutes();
    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '081234567890', 'code' => otpFromWhatsApp('6281234567890')])
        ->assertJsonPath('errors.code.0', 'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.');
});

it('pelanggan lama login tanpa membuat akun baru', function () {
    customer(['phone_wa' => '6281234567890', 'name' => 'Lama']);
    $this->postJson('/api/v1/auth/otp/request', ['phone' => '081234567890']);

    $this->postJson('/api/v1/auth/otp/verify', ['phone' => '081234567890', 'code' => otpFromWhatsApp('6281234567890')])
        ->assertJsonPath('data.is_new', false)->assertJsonPath('data.customer.name', 'Lama');

    expect(Customer::count())->toBe(1);
});

it('mengubah profil', function () {
    actingAsCustomer();

    $this->patchJson('/api/v1/me', ['name' => 'Dinda Putri', 'birth_date' => '1998-05-17'])
        ->assertOk()->assertJsonPath('data.name', 'Dinda Putri')->assertJsonPath('data.birth_date', '1998-05-17');
    $this->patchJson('/api/v1/me', ['email' => 'bukan-email'])->assertJsonValidationErrors('email');
});

it('mengelola alamat dengan satu alamat utama', function () {
    $me = actingAsCustomer();

    $first = $this->postJson('/api/v1/me/addresses', ['label' => 'Rumah', 'address' => 'Jl. A'])->assertCreated()->assertJsonPath('data.is_default', true)->json('data.id');
    $second = $this->postJson('/api/v1/me/addresses', ['label' => 'Kantor', 'address' => 'Jl. B', 'is_default' => true])->json('data.id');

    $this->getJson('/api/v1/me/addresses')->assertJsonPath('data.0.id', $second)->assertJsonPath('data.1.is_default', false);
    $this->patchJson("/api/v1/me/addresses/{$first}", ['note' => 'Pagar hitam'])->assertOk()->assertJsonPath('data.note', 'Pagar hitam');
    $this->getJson("/api/v1/me/addresses/{$first}")->assertOk();

    $this->deleteJson("/api/v1/me/addresses/{$second}")->assertOk();
    expect($me->addresses()->first()->is_default)->toBeTrue();
});

it('mengelola produk favorit', function () {
    actingAsCustomer();
    $product = snack();

    $this->postJson('/api/v1/me/favorites', ['product_id' => $product->id])->assertCreated();
    $this->postJson('/api/v1/me/favorites', ['product_id' => $product->id])->assertCreated();
    $this->getJson('/api/v1/me/favorites')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $product->id);
    $this->deleteJson("/api/v1/me/favorites/{$product->id}")->assertOk();
    $this->getJson('/api/v1/me/favorites')->assertJsonCount(0, 'data');
    $this->postJson('/api/v1/me/favorites', ['product_id' => 999])->assertJsonValidationErrors('product_id');
});

it('menampilkan saldo poin, tier, riwayat, dan simulasi penukaran', function () {
    $me = actingAsCustomer();
    app(LoyaltyService::class)->adjust($me, 120, 'Bonus');
    $me->refresh();

    $this->getJson('/api/v1/me/points')->assertOk()
        ->assertJsonPath('summary.balance', 120)
        ->assertJsonPath('summary.balance_value', 12000)
        ->assertJsonPath('summary.tier.name', 'Bronze')
        ->assertJsonPath('summary.next_tier.name', 'Silver')
        ->assertJsonPath('data.0.type', 'adjust')
        ->assertJsonPath('meta.total', 1);

    $this->postJson('/api/v1/me/points/redeem-preview', ['points' => 100, 'subtotal' => 30000])
        ->assertOk()->assertJsonPath('data.applicable_points', 100)->assertJsonPath('data.discount', 10000);
});

it('menampilkan voucher milik pelanggan', function () {
    actingAsCustomer();
    Promotion::factory()->create(['code' => 'KAMEEHEMAT', 'per_customer_limit' => 2]);

    $this->getJson('/api/v1/me/vouchers')->assertOk()
        ->assertJsonPath('data.0.code', 'KAMEEHEMAT')->assertJsonPath('data.0.remaining_uses', 2);
});

it('memesan ulang dengan harga terkini dan melaporkan produk yang tidak dijual', function () {
    $me = actingAsCustomer();
    $drink = drink(22000);
    $gone = snack();
    $order = Order::factory()->status(OrderStatus::Completed)->create(['customer_id' => $me->id]);
    $item = OrderItem::factory()->create(['order_id' => $order->id, 'product_id' => $drink['product']->id, 'qty' => 2, 'product_name' => 'Kopi']);
    $item->options()->createMany([
        ['option_name' => 'Ukuran: Large', 'price_delta' => 5000],
        ['option_name' => 'Topping: Topping Lama', 'price_delta' => 3000],
    ]);
    OrderItem::factory()->create(['order_id' => $order->id, 'product_id' => $gone->id, 'product_name' => 'Snack Lama']);
    $gone->delete();

    $this->postJson("/api/v1/me/orders/{$order->code}/reorder")->assertOk()
        ->assertJsonPath('message', 'Sebagian produk sudah tidak tersedia.')
        ->assertJsonPath('data.items.0.option_ids', [$drink['large']])
        ->assertJsonPath('data.items.0.unit_price_now', 27000)
        ->assertJsonPath('data.items.0.missing_options', ['Topping: Topping Lama'])
        ->assertJsonPath('data.unavailable.0.product_name', 'Snack Lama');
});

it('ulasan hanya untuk produk dari pesanan selesai milik pelanggan', function () {
    Storage::fake(Media::diskName());
    $me = actingAsCustomer();
    $product = snack();
    $done = Order::factory()->status(OrderStatus::Completed)->create(['customer_id' => $me->id]);
    OrderItem::factory()->create(['order_id' => $done->id, 'product_id' => $product->id]);
    $pending = Order::factory()->create(['customer_id' => $me->id]);
    OrderItem::factory()->create(['order_id' => $pending->id, 'product_id' => $product->id]);

    $this->postJson('/api/v1/me/reviews', ['order_code' => $pending->code, 'product_id' => $product->id, 'rating' => 5])
        ->assertJsonPath('errors.order_code.0', 'Ulasan hanya dapat diberikan untuk pesanan yang sudah selesai.');
    $this->postJson('/api/v1/me/reviews', ['order_code' => $done->code, 'product_id' => snack()->id, 'rating' => 5])
        ->assertJsonPath('errors.product_id.0', 'Produk ini tidak ada di pesanan tersebut.');
    $this->postJson('/api/v1/me/reviews', ['order_code' => 'KMXXXX', 'product_id' => $product->id, 'rating' => 5])
        ->assertJsonPath('errors.order_code.0', 'Pesanan tidak ditemukan.');

    $this->post('/api/v1/me/reviews', [
        'order_code' => $done->code, 'product_id' => $product->id, 'rating' => 4, 'comment' => 'Enak!',
        'photo' => UploadedFile::fake()->image('kopi.jpg'),
    ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.rating', 4);

    $this->postJson('/api/v1/me/reviews', ['order_code' => $done->code, 'product_id' => $product->id, 'rating' => 5])
        ->assertJsonPath('errors.product_id.0', 'Anda sudah memberi ulasan untuk produk ini.');

    expect($product->fresh()->rating_avg)->toBe(4.0)->and($product->fresh()->review_count)->toBe(1)
        ->and(Media::disk()->exists(Review::first()->photo))->toBeTrue();
});
