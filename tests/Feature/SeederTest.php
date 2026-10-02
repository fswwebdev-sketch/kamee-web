<?php

use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Outlet;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;

it('seeder mengisi satu outlet, menu asli, dan data demo yang konsisten', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Outlet::count())->toBe(1)
        ->and(Outlet::first()->only(['id', 'slug', 'phone_wa', 'delivery_radius_km']))
        ->toMatchArray(['id' => 1, 'slug' => 'kamee-taman-cibodas', 'phone_wa' => '6281280871630'])
        ->and(Category::orderBy('sort_order')->pluck('slug')->all())->toBe(['based-coffee', 'manual-brew', 'non-coffee'])
        ->and(Product::count())->toBe(19)
        ->and(Review::count())->toBe(0)
        ->and(Product::where('rating_avg', '>', 0)->orWhere('review_count', '>', 0)->orWhere('sold_count', '>', 0)->count())->toBe(0)
        ->and(Product::whereNotNull('calories')->orWhereNotNull('composition')->count())->toBe(0)
        ->and(Product::where('is_best_seller', true)->orderBy('id')->pluck('slug')->all())
        ->toBe(['kame-manucano', 'aren-kame', 'pandan-latte-kame', 'spanish-latte-kame']);

    // Grup "Ukuran" berbeda per menu: selisih Bottle 1 L mengikuti spesifikasi.
    $bottle = fn (string $slug) => Product::where('slug', $slug)->first()->optionGroups()->first()->options->firstWhere('name', 'Bottle 1 L')?->price_delta;
    expect($bottle('americano'))->toBe(50000)
        ->and($bottle('kame-orangecano'))->toBe(59000)
        ->and($bottle('kame-manucano'))->toBe(67000)
        ->and($bottle('aren-kame'))->toBe(63000)
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
});
