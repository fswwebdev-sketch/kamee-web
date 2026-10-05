<?php

use App\Enums\OptionGroupType;
use App\Models\Customer;
use App\Models\LoyaltyTier;
use App\Models\OptionGroup;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\User;
use App\Services\WhatsApp\ArrayWhatsApp;
use App\Services\WhatsApp\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature', 'Unit');

/*
|--------------------------------------------------------------------------
| Helper data uji
|--------------------------------------------------------------------------
*/

/** Outlet di Tangerang (koordinat tetap) buka 07:00–22:00, radius 7 km. */
function outlet(array $attributes = []): Outlet
{
    return Outlet::factory()->create($attributes + [
        'lat' => -6.2088100, 'lng' => 106.6365200, 'delivery_radius_km' => 7,
        'open_time' => '07:00:00', 'close_time' => '22:00:00', 'is_open' => true,
    ]);
}

/**
 * Menu minuman dengan grup opsi: Ukuran (wajib: Regular 0 / Large +5.000),
 * Gula (opsional: Normal / Less), Topping (multi: Extra Shot +6.000, Boba +5.000).
 *
 * @return array{product: Product, regular: int, large: int, normal: int, less: int, shot: int, boba: int}
 */
function drink(int $price = 22000, array $attributes = []): array
{
    $size = OptionGroup::factory()->required()->create(['name' => 'Ukuran', 'type' => OptionGroupType::Single]);
    $regular = $size->options()->create(['name' => 'Regular', 'price_delta' => 0, 'sort_order' => 0]);
    $large = $size->options()->create(['name' => 'Large', 'price_delta' => 5000, 'sort_order' => 1]);

    $sugar = OptionGroup::factory()->create(['name' => 'Gula', 'type' => OptionGroupType::Single]);
    $normal = $sugar->options()->create(['name' => 'Normal', 'price_delta' => 0]);
    $less = $sugar->options()->create(['name' => 'Less', 'price_delta' => 0]);

    $topping = OptionGroup::factory()->multi()->create(['name' => 'Topping']);
    $shot = $topping->options()->create(['name' => 'Extra Shot', 'price_delta' => 6000]);
    $boba = $topping->options()->create(['name' => 'Boba', 'price_delta' => 5000]);

    $product = Product::factory()->price($price)->create($attributes);
    $product->optionGroups()->attach([$size->id => ['sort_order' => 0], $sugar->id => ['sort_order' => 1], $topping->id => ['sort_order' => 2]]);

    return [
        'product' => $product, 'regular' => $regular->id, 'large' => $large->id,
        'normal' => $normal->id, 'less' => $less->id, 'shot' => $shot->id, 'boba' => $boba->id,
    ];
}

function snack(int $price = 20000): Product
{
    return Product::factory()->price($price)->create();
}

function customer(array $attributes = []): Customer
{
    return Customer::factory()->create($attributes + ['tier_id' => LoyaltyTier::where('name', 'Bronze')->value('id')]);
}

function superAdmin(): User
{
    return User::factory()->superAdmin()->create();
}

function outletAdmin(?Outlet $outlet = null): User
{
    return User::factory()->outletAdmin($outlet ?? outlet())->create();
}

function actingAsAdmin(User $user): User
{
    Sanctum::actingAs($user, ['admin']);

    return $user;
}

function actingAsCustomer(?Customer $customer = null): Customer
{
    $customer ??= customer();
    Sanctum::actingAs($customer, ['customer']);

    return $customer;
}

function whatsapp(): ArrayWhatsApp
{
    return app(WhatsAppService::class);
}

/** Payload POST /orders standar (pickup). */
function orderPayload(Outlet $outlet, array $items, array $overrides = []): array
{
    return array_replace_recursive([
        'outlet_id' => $outlet->id,
        'customer' => ['name' => 'Dinda', 'phone' => '081234567890'],
        'fulfillment' => 'pickup',
        'items' => $items,
    ], $overrides);
}

function idem(?string $key = null): array
{
    return ['Idempotency-Key' => $key ?? (string) Str::uuid()];
}
