<?php

use App\Enums\OrderStatus;
use App\Models\Banner;
use App\Models\Blog;
use App\Models\Category;
use App\Models\Contact;
use App\Models\Customer;
use App\Models\OptionGroup;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;
use App\Services\ReportService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->admin = actingAsAdmin(superAdmin());
});

it('mengelola produk beserta gambar, grup opsi, dan galeri', function () {
    $category = Category::factory()->create();
    $groups = OptionGroup::factory()->count(2)->create();

    $id = $this->post('/api/v1/admin/products', [
        'category_id' => $category->id, 'name' => 'Es Kopi Pandan', 'base_price' => 26000,
        'image' => UploadedFile::fake()->image('kopi.jpg'), 'option_group_ids' => [$groups[1]->id, $groups[0]->id],
    ], ['Accept' => 'application/json'])->assertCreated()
        ->assertJsonPath('data.slug', 'es-kopi-pandan')
        ->assertJsonPath('data.option_groups.0.id', $groups[1]->id)
        ->json('data.id');

    $product = Product::find($id);
    Storage::disk('public')->assertExists($product->image);

    $this->patchJson("/api/v1/admin/products/{$id}", ['base_price' => 27000, 'is_best_seller' => true])
        ->assertOk()->assertJsonPath('data.base_price', 27000)->assertJsonPath('message', 'Produk berhasil diperbarui.');

    $this->post("/api/v1/admin/products/{$id}", ['_method' => 'PATCH', 'image' => UploadedFile::fake()->image('baru.jpg')], ['Accept' => 'application/json'])->assertOk();
    expect($product->fresh()->image)->not->toBe($product->image);

    $images = $this->post("/api/v1/admin/products/{$id}/images", ['images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg')]], ['Accept' => 'application/json'])
        ->assertCreated()->assertJsonCount(2, 'data')->json('data');
    $this->deleteJson("/api/v1/admin/products/{$id}/images/{$images[0]['id']}")->assertOk();
    expect($product->images()->count())->toBe(1);

    $this->getJson("/api/v1/admin/products/{$id}")->assertOk();
    $this->getJson('/api/v1/admin/products?filter[search]=pandan')->assertJsonPath('meta.total', 1);
    $this->deleteJson("/api/v1/admin/products/{$id}")->assertOk();
    expect(Product::withTrashed()->find($id)->trashed())->toBeTrue();

    $this->postJson('/api/v1/admin/products', ['name' => 'X'])->assertJsonValidationErrors(['category_id', 'base_price']);
});

it('mengelola kategori dan menolak hapus kategori yang masih punya produk', function () {
    $id = $this->postJson('/api/v1/admin/categories', ['name' => 'Signature Drink'])->assertCreated()->assertJsonPath('data.slug', 'signature-drink')->json('data.id');
    $this->patchJson("/api/v1/admin/categories/{$id}", ['sort_order' => 3])->assertOk()->assertJsonPath('data.sort_order', 3);
    $this->getJson('/api/v1/admin/categories')->assertOk();
    $this->getJson("/api/v1/admin/categories/{$id}")->assertJsonPath('data.products_count', 0);

    Product::factory()->create(['category_id' => $id]);
    $this->deleteJson("/api/v1/admin/categories/{$id}")->assertUnprocessable()->assertJsonValidationErrors('category');

    $empty = Category::factory()->create();
    $this->deleteJson("/api/v1/admin/categories/{$empty->id}")->assertOk();
});

it('mengelola grup opsi dengan sinkronisasi opsi', function () {
    $response = $this->postJson('/api/v1/admin/option-groups', [
        'name' => 'Ukuran', 'type' => 'single', 'is_required' => true,
        'options' => [['name' => 'Regular', 'price_delta' => 0], ['name' => 'Large', 'price_delta' => 5000]],
    ])->assertCreated()->assertJsonCount(2, 'data.options');

    $id = $response->json('data.id');
    $regular = $response->json('data.options.0.id');

    $this->putJson("/api/v1/admin/option-groups/{$id}", [
        'options' => [['id' => $regular, 'name' => 'Regular', 'price_delta' => 0], ['name' => 'Jumbo', 'price_delta' => 9000]],
    ])->assertOk()->assertJsonPath('data.options.1.name', 'Jumbo')->assertJsonCount(2, 'data.options');

    $this->getJson('/api/v1/admin/option-groups')->assertJsonCount(1, 'data');
    $this->getJson("/api/v1/admin/option-groups/{$id}")->assertOk();
    $this->deleteJson("/api/v1/admin/option-groups/{$id}")->assertOk();
});

it('mengelola promo, banner, blog, dan kategori blog', function () {
    $promo = $this->postJson('/api/v1/admin/promotions', [
        'code' => 'kopi10', 'name' => 'Diskon 10%', 'type' => 'percent', 'value' => 10, 'max_discount' => 10000,
        'starts_at' => now()->toDateTimeString(), 'ends_at' => now()->addWeek()->toDateTimeString(),
    ])->assertCreated()->assertJsonPath('data.code', 'KOPI10')->json('data.id');
    $this->postJson('/api/v1/admin/promotions', ['name' => 'X', 'type' => 'percent', 'value' => 150])->assertJsonValidationErrors('value');
    $this->patchJson("/api/v1/admin/promotions/{$promo}", ['quota' => 50])->assertJsonPath('data.quota', 50);
    $this->getJson('/api/v1/admin/promotions')->assertJsonPath('data.0.used', 0);
    $this->getJson("/api/v1/admin/promotions/{$promo}")->assertOk();
    $this->deleteJson("/api/v1/admin/promotions/{$promo}")->assertOk();
    expect(Promotion::count())->toBe(0);

    $banner = $this->post('/api/v1/admin/banners', ['title' => 'Promo', 'image_desktop_file' => UploadedFile::fake()->image('b.jpg')], ['Accept' => 'application/json'])
        ->assertCreated()->json('data.id');
    Storage::disk('public')->assertExists(Banner::find($banner)->image_desktop);
    $this->patchJson("/api/v1/admin/banners/{$banner}", ['is_active' => false])->assertJsonPath('data.is_active', false);
    $this->getJson('/api/v1/admin/banners')->assertJsonCount(1, 'data');
    $this->getJson("/api/v1/admin/banners/{$banner}")->assertOk();
    $this->deleteJson("/api/v1/admin/banners/{$banner}")->assertOk();

    $cat = $this->postJson('/api/v1/admin/blog-categories', ['name' => 'Tips Kopi'])->assertCreated()->json('data.id');
    $this->patchJson("/api/v1/admin/blog-categories/{$cat}", ['name' => 'Tips & Trik'])->assertOk();
    $blog = $this->post('/api/v1/admin/blogs', [
        'title' => 'Menyeduh V60', 'content' => '<p>Isi</p>', 'status' => 'published', 'blog_category_id' => $cat,
        'cover' => UploadedFile::fake()->image('c.jpg'),
    ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.author', $this->admin->name)->json('data.id');
    expect(Blog::find($blog)->published_at)->not->toBeNull();
    $this->post("/api/v1/admin/blogs/{$blog}", ['_method' => 'PATCH', 'cover' => UploadedFile::fake()->image('d.jpg'), 'title' => 'Menyeduh V60 (Update)'], ['Accept' => 'application/json'])
        ->assertOk()->assertJsonPath('data.title', 'Menyeduh V60 (Update)');
    $this->getJson('/api/v1/admin/blogs?filter[status]=published')->assertJsonPath('meta.total', 1);
    $this->getJson("/api/v1/admin/blogs/{$blog}")->assertJsonPath('content', '<p>Isi</p>');
    $this->getJson('/api/v1/admin/blog-categories')->assertOk();
    $this->getJson("/api/v1/admin/blog-categories/{$cat}")->assertJsonPath('data.blogs_count', 1);
    $this->deleteJson("/api/v1/admin/blogs/{$blog}")->assertOk();
    $this->deleteJson("/api/v1/admin/blog-categories/{$cat}")->assertOk();
});

it('mengelola outlet dan pengguna admin', function () {
    $outlet = $this->postJson('/api/v1/admin/outlets', [
        'name' => 'Kamee BSD', 'address' => 'Jl. BSD', 'city' => 'Tangerang Selatan', 'lat' => -6.30, 'lng' => 106.65, 'phone_wa' => '081211112222',
    ])->assertCreated()->assertJsonPath('data.phone_wa', '6281211112222')->assertJsonPath('data.open_time', '07:00')->json('data.id');
    $this->patchJson("/api/v1/admin/outlets/{$outlet}", ['is_open' => false])->assertJsonPath('data.is_open', false);
    $this->getJson("/api/v1/admin/outlets/{$outlet}")->assertOk();

    $user = $this->postJson('/api/v1/admin/users', ['name' => 'Admin BSD', 'email' => 'BSD@kamee.id', 'password' => 'rahasia123', 'role' => 'outlet_admin', 'outlet_id' => $outlet])
        ->assertCreated()->assertJsonPath('data.email', 'bsd@kamee.id')->assertJsonPath('data.outlet.id', $outlet)->json('data.id');
    $this->postJson('/api/v1/admin/users', ['name' => 'X', 'email' => 'x@kamee.id', 'password' => 'rahasia123', 'role' => 'outlet_admin'])
        ->assertJsonValidationErrors(['outlet_id' => 'Admin Outlet wajib memiliki outlet.']);

    User::find($user)->createToken('t', ['admin']);
    $this->patchJson("/api/v1/admin/users/{$user}", ['is_active' => false])->assertJsonPath('data.is_active', false);
    expect(User::find($user)->tokens()->count())->toBe(0);
    $this->patchJson("/api/v1/admin/users/{$user}", ['role' => 'super_admin'])->assertJsonPath('data.outlet_id', null);
    $this->getJson('/api/v1/admin/users')->assertJsonPath('meta.total', 2);
    $this->getJson("/api/v1/admin/users/{$user}")->assertOk();
    $this->deleteJson("/api/v1/admin/users/{$this->admin->id}")->assertForbidden();
    $this->deleteJson("/api/v1/admin/users/{$user}")->assertOk();

    Order::factory()->create(['outlet_id' => $outlet]);
    $this->deleteJson("/api/v1/admin/outlets/{$outlet}")->assertUnprocessable();
    $this->deleteJson('/api/v1/admin/outlets/'.outlet()->id)->assertOk();
    $this->getJson('/api/v1/admin/outlets')->assertJsonCount(1, 'data');
});

it('menampilkan pelanggan dan mengoreksi poin', function () {
    $customer = customer(['name' => 'Dinda']);
    Order::factory()->status(OrderStatus::Completed)->create(['customer_id' => $customer->id, 'total' => 50000]);

    $this->getJson('/api/v1/admin/customers?filter[search]=dinda')->assertJsonPath('data.0.orders_count', 1);
    $this->getJson("/api/v1/admin/customers/{$customer->id}")->assertOk()
        ->assertJsonPath('data.stats.total_spend', 50000)->assertJsonCount(1, 'recent_orders');

    $this->postJson("/api/v1/admin/customers/{$customer->id}/points-adjust", ['points' => 25, 'note' => 'Kompensasi'])
        ->assertCreated()->assertJsonPath('data.balance_after', 25);
    $this->postJson("/api/v1/admin/customers/{$customer->id}/points-adjust", ['points' => -100, 'note' => 'Koreksi'])
        ->assertUnprocessable();
});

it('menandai pesan kontak dibaca', function () {
    $contact = Contact::factory()->create();
    actingAsAdmin(outletAdmin());

    $this->getJson('/api/v1/admin/contacts?filter[status]=new')->assertJsonPath('meta.total', 1);
    $this->getJson("/api/v1/admin/contacts/{$contact->id}")->assertOk();
    $this->patchJson("/api/v1/admin/contacts/{$contact->id}", ['status' => 'read'])->assertJsonPath('data.status', 'read');
});

it('menampilkan ringkasan dashboard, grafik pendapatan, dan produk terlaris', function () {
    $outlet = outlet();
    $product = snack();
    $o1 = Order::factory()->status(OrderStatus::Completed)->create(['outlet_id' => $outlet->id, 'total' => 60000, 'created_at' => now()->subDays(2)]);
    $o2 = Order::factory()->status(OrderStatus::Paid)->create(['outlet_id' => $outlet->id, 'total' => 40000]);
    Order::factory()->status(OrderStatus::Cancelled)->create(['outlet_id' => $outlet->id, 'total' => 99000]);
    OrderItem::factory()->create(['order_id' => $o1->id, 'product_id' => $product->id, 'product_name' => 'Kopi', 'qty' => 3, 'subtotal' => 60000]);
    OrderItem::factory()->create(['order_id' => $o2->id, 'product_id' => $product->id, 'product_name' => 'Kopi', 'qty' => 2, 'subtotal' => 40000]);
    Customer::factory()->create();

    $this->getJson('/api/v1/admin/dashboard/summary')->assertOk()
        ->assertJsonPath('data.revenue', 100000)
        ->assertJsonPath('data.orders', 3)
        ->assertJsonPath('data.paid_orders', 2)
        ->assertJsonPath('data.cancelled_orders', 1)
        ->assertJsonPath('data.average_order_value', 50000)
        ->assertJsonPath('data.new_customers', 1);

    $daily = $this->getJson('/api/v1/admin/dashboard/revenue?interval=day&from='.now()->subDays(3)->toDateString())->assertOk()->json('data');
    expect($daily)->toHaveCount(4)
        ->and(collect($daily)->firstWhere('period', now()->subDays(2)->toDateString())['revenue'])->toBe(60000);

    $this->getJson('/api/v1/admin/dashboard/revenue?interval=month')->assertJsonPath('data.1.revenue', 100000);

    $this->getJson('/api/v1/admin/dashboard/top-products?limit=5')
        ->assertJsonPath('data.0.qty', 5)->assertJsonPath('data.0.revenue', 100000);

    $this->getJson('/api/v1/admin/dashboard/summary?from=2026-09-10&to=2026-09-01')->assertJsonValidationErrors('to');
});

it('mengekspor laporan penjualan XLSX', function () {
    $order = Order::factory()->status(OrderStatus::Completed)->create(['total' => 55000]);

    $response = $this->get('/api/v1/admin/reports/sales.xlsx?from=2026-09-01&to=2026-09-30');
    $response->assertOk()->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect($response->headers->get('content-disposition'))->toContain('laporan-penjualan-20260901_20260930.xlsx')
        ->and(substr($response->streamedContent(), 0, 2))->toBe('PK');

    $rows = iterator_to_array(app(ReportService::class)->rows(null, now()->startOfMonth(), now()->endOfMonth()));
    expect($rows)->toHaveCount(1)->and($rows[0][0])->toBe($order->code)->and($rows[0][13])->toBe(55000)
        ->and(ReportService::HEADINGS)->toHaveCount(15);
});

it('membaca dan menyimpan pengaturan bisnis', function () {
    $this->getJson('/api/v1/admin/settings')->assertJsonPath('data.points_earn_per_amount', 10000);

    $this->putJson('/api/v1/admin/settings', ['delivery_base_fee' => 9000, 'points_expiry_months' => 6, 'tidak_dikenal' => 1])
        ->assertOk()->assertJsonPath('data.delivery_base_fee', 9000)->assertJsonPath('data.points_expiry_months', 6)
        ->assertJsonMissingPath('data.tidak_dikenal');

    $this->putJson('/api/v1/admin/settings', ['points_max_redeem_percent' => 150])->assertJsonValidationErrors('points_max_redeem_percent');
});

it('admin melihat profil dan logout', function () {
    $user = User::factory()->superAdmin()->create();
    $token = $user->createToken('dashboard', ['admin'])->plainTextToken;
    app('auth')->forgetGuards();

    $this->withToken($token)->getJson('/api/v1/admin/auth/me')->assertJsonPath('data.email', $user->email);
    $this->withToken($token)->postJson('/api/v1/admin/auth/logout')->assertOk();
    expect($user->tokens()->count())->toBe(0);
});
