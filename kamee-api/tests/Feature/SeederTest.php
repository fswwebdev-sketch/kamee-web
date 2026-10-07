<?php

use App\Enums\CashCategory;
use App\Enums\OrderStatus;
use App\Models\Banner;
use App\Models\Blog;
use App\Models\CashEntry;
use App\Models\Category;
use App\Models\Contact;
use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\LoyaltyTier;
use App\Models\OptionGroup;
use App\Models\Order;
use App\Models\Outlet;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Recipe;
use App\Models\Review;
use App\Models\StockMovement;
use App\Models\StockPurchase;
use App\Models\User;
use App\Services\Finance\RecipeService;
use Database\Seeders\BookkeepingSeeder;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\OutletSeeder;
use Database\Seeders\UserSeeder;

it('seeder mengisi satu outlet, menu asli, dan data demo yang konsisten', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Outlet::count())->toBe(1)
        ->and(Outlet::first()->only(['id', 'slug', 'phone_wa', 'delivery_radius_km']))
        ->toMatchArray(['id' => 1, 'slug' => 'kamee-taman-cibodas', 'phone_wa' => '6281280871630'])
        ->and(Category::orderBy('sort_order')->pluck('slug')->all())->toBe(['based-coffee', 'manual-brew', 'non-coffee'])
        ->and(Product::count())->toBe(27)
        ->and(Review::count())->toBe(0)
        ->and(Product::where('rating_avg', '>', 0)->orWhere('review_count', '>', 0)->orWhere('sold_count', '>', 0)->count())->toBe(0)
        ->and(Product::whereNotNull('calories')->orWhereNotNull('composition')->count())->toBe(0)
        ->and(Product::where('is_best_seller', true)->orderBy('id')->pluck('slug')->all())
        ->toBe(['kame-manucano', 'aren-kame', 'pandan-latte-kame', 'spanish-latte-kame', 'mont-blanc', 'iced-matcha-latte',
            'iced-strawberry-matcha-latte', 'premium-dark-chocolate', 'americano-specialty-blend', 'aren-kame-premium']);

    // Grup "Ukuran" berbeda per menu: selisih Bottle 1 L mengikuti spesifikasi.
    $bottle = fn (string $slug) => Product::where('slug', $slug)->first()->optionGroups()->first()->options->firstWhere('name', 'Bottle 1 L')?->price_delta;
    expect($bottle('americano'))->toBe(59000)
        ->and($bottle('kame-orangecano'))->toBe(67000)
        ->and($bottle('kame-manucano'))->toBe(70000)
        ->and($bottle('aren-kame'))->toBe(67000)
        ->and($bottle('americano-specialty-blend'))->toBe(99000)
        ->and($bottle('aren-kame-premium'))->toBe(78000)
        ->and($bottle('aren-sea-salt-kame'))->toBeNull()
        ->and($bottle('regular-chocolate'))->toBe(67000)
        ->and($bottle('premium-dark-chocolate'))->toBe(95000)
        ->and(Product::where('slug', 'local-beans')->first()->optionGroups()->pluck('name')->all())->toBe(['Penyajian', 'Proses Biji'])
        ->and(Product::where('slug', 'mont-blanc')->value('description'))->toContain('Sabtu–Minggu')
        ->and(Product::where('slug', 'cold-brew')->value('description'))->toContain('Sabtu–Minggu');

    $admin = User::where('email', 'admin.cibodas@kamee.id')->first();
    expect($admin->outlet_id)->toBe(1)
        ->and(User::where('email', 'superadmin@kamee.id')->exists())->toBeTrue()
        ->and(Order::withoutGlobalScopes()->count())->toBeGreaterThan(50)
        ->and(Order::withoutGlobalScopes()->where('outlet_id', '!=', 1)->count())->toBe(0)
        ->and(Payment::whereNotIn('provider', ['manual', 'cash'])->count())->toBe(0)
        ->and(Order::withoutGlobalScopes()->where('status', OrderStatus::Pending)->count())->toBe(0);

    // Pembukuan dijalankan setelah pesanan demo: stok tidak dipotong mundur.
    expect(StockMovement::whereIn('type', ['sale', 'sale_reversal'])->count())->toBe(0)
        ->and(Ingredient::where('name', 'Cup 12 oz + tutup')->value('stock_qty'))->toEqual(110.0);
});

it('BookkeepingSeeder mengisi data buku catatan pemilik secara idempoten', function () {
    $this->seed([OutletSeeder::class, UserSeeder::class, CatalogSeeder::class, BookkeepingSeeder::class]);
    $this->seed(BookkeepingSeeder::class);

    $superAdmin = User::where('email', 'superadmin@kamee.id')->value('id');
    $purchase = StockPurchase::sole();
    $expense = CashEntry::where('type', 'expense');

    expect(Ingredient::count())->toBe(11)
        ->and($purchase->total)->toBe(2321000)
        ->and($purchase->date->toDateString())->toBe('2026-09-20')
        ->and($purchase->items()->count())->toBe(9)
        ->and(StockMovement::where('type', 'purchase')->count())->toBe(9)
        ->and($purchase->cashEntry->amount)->toBe(2321000)
        ->and(CashEntry::where('description', 'Es batu')->sole()->amount)->toBe(25000)
        ->and((int) (clone $expense)->sum('amount'))->toBe(2321000 + 25000 + 388150 + 976520)
        ->and((int) (clone $expense)->where('source', 'manual')->where('description', '!=', 'Es batu')->sum('amount'))->toBe(388150 + 976520)
        ->and((int) CashEntry::where('type', 'income')->sum('amount'))->toBe(3193000)
        ->and(CashEntry::where('category', CashCategory::Penjualan)->count())->toBe(34)
        ->and(CashEntry::where('bank', 'BJB')->count())->toBe(1)
        ->and(CashEntry::where('description', 'like', 'Penjualan — %')->count())->toBe(0) // pemasukan buku tulis diganti data Kasir
        ->and(CashEntry::whereIn('description', ['Kaos kaki', 'Pilates'])->count())->toBe(0)
        ->and(CashEntry::where('created_by', '!=', $superAdmin)->count())->toBe(0)
        ->and(Ingredient::whereIn('name', ['Matcha', 'Botol 250 ml'])->pluck('stock_qty')->all())->toEqual([0.0, 0.0])
        ->and(Recipe::count())->toBe(27)
        ->and(Recipe::where('is_sample', false)->sole()->product->slug)->toBe('aren-kame');

    $aren = app(RecipeService::class)->show(1, Product::where('slug', 'aren-kame')->first());
    $cup = collect($aren['variants'])->firstWhere('option_name', 'Cup');

    expect($aren['is_sample'])->toBeFalse()
        ->and($aren['variants'])->toHaveCount(3)
        ->and($cup)->toMatchArray([
            'price' => 18000, 'hpp' => 12580, 'margin' => 5420, 'margin_pct' => 30.1,
            'cups_possible' => 110, 'limiting_ingredient' => 'Cup 12 oz + tutup',
        ]);
});

it('mode produksi (KAMEE_SEED_DEMO=false) hanya mengisi data asli tanpa pelanggan, pesanan, dan pesan demo', function () {
    config(['kamee.seed_demo' => false]);
    $this->seed(DatabaseSeeder::class);

    expect(Customer::count())->toBe(0)
        ->and(Order::withoutGlobalScopes()->count())->toBe(0)
        ->and(Contact::count())->toBe(0)
        ->and(Review::count())->toBe(0)
        ->and(User::pluck('email')->sort()->values()->all())->toBe(['admin.cibodas@kamee.id', 'superadmin@kamee.id'])
        ->and(Outlet::count())->toBe(1)
        ->and(Product::count())->toBe(27)
        ->and(LoyaltyTier::count())->toBeGreaterThan(0)
        ->and(Promotion::count())->toBeGreaterThan(0)
        ->and(Banner::count())->toBeGreaterThan(0)
        ->and(Blog::count())->toBeGreaterThan(0)
        ->and(Recipe::count())->toBe(27)
        ->and(StockPurchase::count())->toBe(1)
        ->and(Ingredient::where('name', 'Cup 12 oz + tutup')->value('stock_qty'))->toEqual(110.0);

    // Sequence ID ikut maju setelah seeder ber-ID tetap (PostgreSQL): data baru tidak bentrok primary key.
    // (MySQL tidak me-rollback AUTO_INCREMENT antar tes, jadi cukup dipastikan lebih besar dari ID seeder.)
    expect(Category::factory()->create()->id)->toBeGreaterThan(3)
        ->and(Product::factory()->create()->id)->toBeGreaterThan(27)
        ->and(Outlet::factory()->create()->id)->toBeGreaterThan(1)
        ->and(OptionGroup::factory()->create()->id)->toBeGreaterThan(11);
});
