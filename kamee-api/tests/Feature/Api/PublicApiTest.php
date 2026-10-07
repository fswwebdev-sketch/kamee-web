<?php

use App\Models\Banner;
use App\Models\Blog;
use App\Models\BlogCategory;
use App\Models\Category;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Review;
use Illuminate\Support\Facades\Http;

it('menampilkan kategori aktif dengan jumlah produk', function () {
    $coffee = Category::factory()->create(['name' => 'Coffee', 'sort_order' => 1]);
    Category::factory()->create(['is_active' => false]);
    Product::factory()->count(2)->for($coffee)->create();

    $this->getJson('/api/v1/categories')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'coffee')->assertJsonPath('data.0.products_count', 2);
});

it('memfilter, mencari, mengurutkan, dan memaginasi menu', function () {
    $coffee = Category::factory()->create(['name' => 'Coffee']);
    $tea = Category::factory()->create(['name' => 'Tea Series']);
    Product::factory()->for($coffee)->create(['name' => 'Kopi Susu Aren', 'base_price' => 24000, 'sold_count' => 50]);
    Product::factory()->for($coffee)->create(['name' => 'Americano', 'base_price' => 18000, 'sold_count' => 10]);
    Product::factory()->for($tea)->create(['name' => 'Lychee Tea', 'base_price' => 22000, 'sold_count' => 80]);
    Product::factory()->for($coffee)->inactive()->create(['name' => 'Kopi Lama']);

    $this->getJson('/api/v1/products')->assertJsonPath('meta.total', 3)->assertJsonPath('data.0.name', 'Lychee Tea');
    $this->getJson('/api/v1/products?filter[category]=coffee&sort=price')
        ->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.name', 'Americano');
    $this->getJson('/api/v1/products?search=aren')->assertJsonPath('meta.total', 1);
    $this->getJson('/api/v1/products?per_page=1&page=2&sort=-price')
        ->assertJsonPath('meta', ['page' => 2, 'per_page' => 1, 'total' => 3, 'last_page' => 3])
        ->assertJsonPath('data.0.name', 'Lychee Tea');
    $this->getJson('/api/v1/products?per_page=500')->assertJsonPath('meta.per_page', 50);
    $this->getJson('/api/v1/products?filter[tidakada]=1')->assertStatus(400);
});

it('menyembunyikan produk yang habis di outlet tertentu', function () {
    $outlet = outlet();
    $available = snack();
    $soldOut = snack();
    $outlet->products()->attach($soldOut->id, ['is_available' => false]);

    $this->getJson("/api/v1/products?filter[outlet]={$outlet->id}")
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $available->id);
});

it('menampilkan detail produk dengan opsi, galeri, dan ringkasan rating', function () {
    $drink = drink(22000);
    $product = $drink['product'];
    $product->images()->create(['path' => 'products/a.jpg', 'sort_order' => 1]);
    Review::factory()->count(2)->create(['product_id' => $product->id, 'rating' => 5]);
    Review::factory()->create(['product_id' => $product->id, 'rating' => 3]);
    Review::factory()->create(['product_id' => $product->id, 'rating' => 1, 'is_published' => false]);

    $this->getJson("/api/v1/products/{$product->slug}")->assertOk()
        ->assertJsonPath('data.option_groups.0.name', 'Ukuran')
        ->assertJsonPath('data.option_groups.0.is_required', true)
        ->assertJsonPath('data.option_groups.0.options.1.price_delta', 5000)
        ->assertJsonPath('data.option_groups.2.type', 'multi')
        ->assertJsonCount(1, 'data.images')
        ->assertJsonPath('data.rating_summary.breakdown', ['5' => 2, '4' => 0, '3' => 1, '2' => 0, '1' => 0]);

    $this->getJson("/api/v1/products/{$product->slug}/reviews")->assertJsonPath('meta.total', 3);
    $this->getJson("/api/v1/products/{$product->slug}/reviews?rating=5")->assertJsonPath('meta.total', 2);

    $product->update(['is_active' => false]);
    $this->getJson("/api/v1/products/{$product->slug}")->assertNotFound();
});

it('menampilkan produk serupa dari kategori yang sama', function () {
    $category = Category::factory()->create();
    [$a, $b] = Product::factory()->count(2)->for($category)->create();
    snack();

    $this->getJson("/api/v1/products/{$a->slug}/related")->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $b->id);
});

it('menampilkan banner aktif sesuai posisi', function () {
    Banner::factory()->create(['title' => 'Home']);
    Banner::factory()->create(['placement' => 'menu']);
    Banner::factory()->create(['ends_at' => now()->subDay()]);

    $this->getJson('/api/v1/banners?placement=home')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Home');
});

it('menampilkan promo aktif dan mengecek voucher dengan rate limit', function () {
    Promotion::factory()->percent(20, 15000)->create(['code' => 'KAMEEHEMAT', 'min_spend' => 40000]);
    Promotion::factory()->expired()->create();

    $this->getJson('/api/v1/promotions')->assertJsonCount(1, 'data');

    $this->postJson('/api/v1/promotions/validate', ['code' => 'kameehemat', 'subtotal' => 56000])
        ->assertOk()->assertJsonPath('data.discount', 11200)->assertJsonPath('data.subtotal_after', 44800)
        ->assertJsonPath('message', 'Voucher berhasil dipakai. Hemat Rp11.200.');

    $this->postJson('/api/v1/promotions/validate', ['code' => 'SALAH', 'subtotal' => 56000])
        ->assertUnprocessable()->assertJsonPath('errors.code.0', 'Kode voucher tidak ditemukan atau sudah tidak berlaku.');

    foreach (range(1, 8) as $i) {
        $this->postJson('/api/v1/promotions/validate', ['code' => 'SALAH', 'subtotal' => 1]);
    }
    $this->postJson('/api/v1/promotions/validate', ['code' => 'KAMEEHEMAT', 'subtotal' => 56000])
        ->assertTooManyRequests()->assertJsonPath('message', fn ($m) => str_starts_with($m, 'Terlalu banyak percobaan kode voucher.'));
});

it('menghitung ongkir dari koordinat', function () {
    $outlet = outlet();

    $this->postJson('/api/v1/delivery/quote', ['outlet_id' => $outlet->id, 'lat' => -6.2100, 'lng' => 106.6400])
        ->assertOk()->assertJsonPath('data.fee', 8000)->assertJsonPath('data.within_radius', true);
    $this->postJson('/api/v1/delivery/quote', ['outlet_id' => $outlet->id, 'lat' => -6.40, 'lng' => 106.83])
        ->assertUnprocessable()->assertJsonValidationErrors('address');
});

it('mode ojol: ongkir tidak ditagih di web (dibayar ke driver GoSend/GrabExpress)', function () {
    config(['kamee.settings.delivery_mode' => 'ojol']);
    $outlet = outlet();

    $this->postJson('/api/v1/delivery/quote', ['outlet_id' => $outlet->id, 'lat' => -6.2100, 'lng' => 106.6400])
        ->assertOk()->assertJsonPath('data.fee', 0)->assertJsonPath('data.within_radius', true);
});

it('menampilkan outlet dengan status buka saat ini', function () {
    outlet(['name' => 'Kamee Cikokol']);

    $this->getJson('/api/v1/outlets')->assertJsonPath('data.0.is_open_now', true)->assertJsonPath('data.0.open_time', '07:00');
});

it('outlet tutup pada hari Minggu dan menolak pesanan', function () {
    outlet(['name' => 'Kamee Cikokol']);
    $this->travelTo(Carbon\Carbon::parse('2026-10-04 12:00:00', 'Asia/Jakarta')); // Minggu

    $this->getJson('/api/v1/outlets')->assertJsonPath('data.0.is_open_now', false)->assertJsonPath('data.0.open_days', 'Senin–Sabtu');
});

it('menampilkan blog terbit, detail dengan artikel terkait, dan kategori', function () {
    $category = BlogCategory::factory()->create(['name' => 'Tips Kopi']);
    $blog = Blog::factory()->for($category, 'category')->create(['title' => 'Cara Seduh V60']);
    Blog::factory()->for($category, 'category')->create();
    Blog::factory()->draft()->create();

    $this->getJson('/api/v1/blogs')->assertJsonPath('meta.total', 2);
    $this->getJson('/api/v1/blogs?filter[category]=tips-kopi&search=V60')->assertJsonPath('meta.total', 1);
    $this->getJson("/api/v1/blogs/{$blog->slug}")->assertOk()
        ->assertJsonPath('data.title', 'Cara Seduh V60')->assertJsonCount(1, 'related')
        ->assertJsonStructure(['data' => ['content', 'meta_title']]);
    expect($blog->fresh()->views)->toBe(1);

    $this->getJson('/api/v1/blogs/'.Blog::where('status', 'draft')->value('slug'))->assertNotFound();
    $this->getJson('/api/v1/blog-categories')->assertJsonFragment(['slug' => 'tips-kopi', 'blogs_count' => 2]);
});

it('menyimpan form kontak dengan verifikasi Turnstile', function () {
    $this->postJson('/api/v1/contacts', ['name' => 'Dinda', 'email' => 'd@kamee.id', 'subject' => 'Event', 'message' => 'Halo', 'phone' => '081234567890'])
        ->assertCreated();
    expect(Contact::first()->phone)->toBe('6281234567890');

    config(['kamee.turnstile.secret' => 'secret']);
    Http::fake(['challenges.cloudflare.com/*' => Http::sequence()->push(['success' => false])->push(['success' => true])]);

    $body = ['name' => 'Dinda', 'email' => 'd@kamee.id', 'subject' => 'Event', 'message' => 'Halo'];
    $this->postJson('/api/v1/contacts', $body)->assertJsonValidationErrors('turnstile_token');
    $this->postJson('/api/v1/contacts', $body + ['turnstile_token' => 'bad'])->assertJsonPath('errors.turnstile_token.0', 'Verifikasi captcha gagal. Silakan coba lagi.');
    $this->postJson('/api/v1/contacts', $body + ['turnstile_token' => 'good'])->assertCreated();
});

it('menampilkan testimoni unggulan', function () {
    Review::factory()->create(['rating' => 5, 'comment' => 'Mantap']);
    Review::factory()->create(['rating' => 2]);

    $this->getJson('/api/v1/testimonials')->assertJsonCount(1, 'data')->assertJsonStructure(['data' => [['customer_name', 'product']]]);
});

it('mengembalikan 404 berbahasa Indonesia untuk endpoint yang tidak ada', function () {
    $this->getJson('/api/v1/tidak-ada')->assertNotFound()->assertJsonPath('message', 'Endpoint tidak ditemukan.');
    $this->deleteJson('/api/v1/categories')->assertStatus(405)->assertJsonPath('message', 'Metode HTTP tidak didukung untuk endpoint ini.');
});
