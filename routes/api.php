<?php

use App\Http\Controllers\Api;
use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\Customer;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Kamee Coffee REST API — /api/v1
|--------------------------------------------------------------------------
*/

// Webhook gateway pembayaran (tanpa rate limit publik; diverifikasi signature).
Route::post('webhooks/payments/{provider}', Api\PaymentWebhookController::class)->name('webhooks.payments');

// Pemicu tugas terjadwal tanpa daemon (pg_cron/pg_net atau Vercel Cron); diamankan header X-Cron-Secret.
Route::match(['get', 'post'], 'internal/cron', Api\InternalCronController::class)
    ->middleware('throttle:60,1')
    ->name('internal.cron');

Route::middleware('throttle:public')->group(function () {

    // ------------------------------------------------------------------ Publik
    Route::name('public.')->group(function () {
        Route::get('categories', [Api\CategoryController::class, 'index'])->name('categories.index');

        Route::get('products', [Api\ProductController::class, 'index'])->name('products.index');
        Route::get('products/{product:slug}', [Api\ProductController::class, 'show'])->name('products.show');
        Route::get('products/{product:slug}/reviews', [Api\ProductController::class, 'reviews'])->name('products.reviews');
        Route::get('products/{product:slug}/related', [Api\ProductController::class, 'related'])->name('products.related');

        Route::get('banners', [Api\BannerController::class, 'index'])->name('banners.index');
        Route::get('promotions', [Api\PromotionController::class, 'index'])->name('promotions.index');
        Route::post('promotions/validate', [Api\PromotionController::class, 'validate'])->middleware('throttle:voucher')->name('promotions.validate');
        Route::get('outlets', [Api\OutletController::class, 'index'])->name('outlets.index');
        Route::post('delivery/quote', [Api\DeliveryController::class, 'quote'])->name('delivery.quote');

        Route::get('blogs', [Api\BlogController::class, 'index'])->name('blogs.index');
        Route::get('blogs/{blog:slug}', [Api\BlogController::class, 'show'])->name('blogs.show');
        Route::get('blog-categories', [Api\BlogController::class, 'categories'])->name('blog-categories.index');

        Route::post('contacts', [Api\ContactController::class, 'store'])->middleware('throttle:contact')->name('contacts.store');
        Route::get('testimonials', [Api\TestimonialController::class, 'index'])->name('testimonials.index');

        // Pesanan & pembayaran
        Route::post('orders/quote', [Api\OrderController::class, 'quote'])->middleware('throttle:voucher')->name('orders.quote');
        Route::post('orders/whatsapp', [Api\OrderController::class, 'whatsapp'])->middleware('idempotent')->name('orders.whatsapp');
        Route::post('orders', [Api\OrderController::class, 'store'])->middleware('idempotent')->name('orders.store');
        Route::get('orders/{code}', [Api\OrderController::class, 'track'])->name('orders.track');
        Route::post('orders/{code}/pay', [Api\PaymentController::class, 'store'])->middleware('idempotent')->name('orders.pay');
        Route::get('orders/{code}/payment-status', [Api\PaymentController::class, 'status'])->name('orders.payment-status');
    });

    // ------------------------------------------------------------------ Pelanggan
    Route::prefix('auth')->name('customer.auth.')->group(function () {
        Route::post('otp/request', [Customer\AuthController::class, 'requestOtp'])->middleware('throttle:otp')->name('otp.request');
        Route::post('otp/verify', [Customer\AuthController::class, 'verifyOtp'])->middleware('throttle:otp-verify')->name('otp.verify');
        Route::post('logout', [Customer\AuthController::class, 'logout'])->middleware(['auth:sanctum', 'customer'])->name('logout');
    });

    Route::prefix('me')->name('me.')->middleware(['auth:sanctum', 'customer'])->group(function () {
        Route::get('/', [Customer\ProfileController::class, 'show'])->name('show');
        Route::patch('/', [Customer\ProfileController::class, 'update'])->name('update');

        Route::get('orders', [Customer\OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{code}', [Customer\OrderController::class, 'show'])->name('orders.show');
        Route::post('orders/{code}/reorder', [Customer\OrderController::class, 'reorder'])->name('orders.reorder');

        Route::get('points', [Customer\PointController::class, 'index'])->name('points.index');
        Route::post('points/redeem-preview', [Customer\PointController::class, 'redeemPreview'])->name('points.redeem-preview');

        Route::get('favorites', [Customer\FavoriteController::class, 'index'])->name('favorites.index');
        Route::post('favorites', [Customer\FavoriteController::class, 'store'])->name('favorites.store');
        Route::delete('favorites/{productId}', [Customer\FavoriteController::class, 'destroy'])->whereNumber('productId')->name('favorites.destroy');

        Route::apiResource('addresses', Customer\AddressController::class);

        Route::get('vouchers', [Customer\VoucherController::class, 'index'])->name('vouchers.index');
        Route::post('reviews', [Customer\ReviewController::class, 'store'])->name('reviews.store');
    });

    // ------------------------------------------------------------------ Admin
    // Panel admin memakai limiter sendiri (lebih longgar per akun) karena Kanban & realtime memicu banyak refetch.
    Route::prefix('admin')->name('admin.')->withoutMiddleware('throttle:public')->middleware('throttle:admin')->group(function () {
        Route::post('auth/login', [Admin\AuthController::class, 'login'])->middleware('throttle:admin-login')->name('auth.login');

        Route::middleware(['auth:sanctum', 'admin'])->group(function () {
            Route::get('auth/me', [Admin\AuthController::class, 'me'])->name('auth.me');
            Route::post('auth/logout', [Admin\AuthController::class, 'logout'])->name('auth.logout');

            Route::get('dashboard/summary', [Admin\DashboardController::class, 'summary'])->name('dashboard.summary');
            Route::get('dashboard/revenue', [Admin\DashboardController::class, 'revenue'])->name('dashboard.revenue');
            Route::get('dashboard/top-products', [Admin\DashboardController::class, 'topProducts'])->name('dashboard.top-products');

            Route::get('orders', [Admin\OrderController::class, 'index'])->name('orders.index');
            Route::post('orders/pos', [Admin\OrderController::class, 'pos'])->name('orders.pos');
            Route::get('orders/{order}', [Admin\OrderController::class, 'show'])->name('orders.show');
            Route::patch('orders/{order}/status', [Admin\OrderController::class, 'updateStatus'])->name('orders.status');
            Route::post('orders/{order}/confirm-payment', [Admin\OrderController::class, 'confirmPayment'])->name('orders.confirm-payment');
            Route::post('orders/{order}/refund', [Admin\OrderController::class, 'refund'])->name('orders.refund');

            Route::post('products/bulk', [Admin\ProductController::class, 'bulk'])->name('products.bulk');
            Route::apiResource('products', Admin\ProductController::class);
            Route::put('products/{product}/images/order', [Admin\ProductController::class, 'reorderImages'])->name('products.images.order');
            Route::post('products/{product}/images', [Admin\ProductController::class, 'storeImages'])->name('products.images.store');
            Route::delete('products/{product}/images/{image}', [Admin\ProductController::class, 'destroyImage'])->name('products.images.destroy');
            Route::apiResource('categories', Admin\CategoryController::class);
            Route::apiResource('option-groups', Admin\OptionGroupController::class);
            Route::patch('outlets/{outlet}/products/{product}', Admin\ProductAvailabilityController::class)->name('outlets.products.availability');

            Route::apiResource('promotions', Admin\PromotionController::class);
            Route::apiResource('banners', Admin\BannerController::class);

            Route::get('customers', [Admin\CustomerController::class, 'index'])->name('customers.index');
            Route::get('customers/{customer}', [Admin\CustomerController::class, 'show'])->name('customers.show');
            Route::post('customers/{customer}/points-adjust', [Admin\CustomerController::class, 'adjustPoints'])->name('customers.points-adjust');

            Route::apiResource('blogs', Admin\BlogController::class);
            Route::apiResource('blog-categories', Admin\BlogCategoryController::class);

            Route::get('contacts', [Admin\ContactController::class, 'index'])->name('contacts.index');
            Route::get('contacts/{contact}', [Admin\ContactController::class, 'show'])->name('contacts.show');
            Route::patch('contacts/{contact}', [Admin\ContactController::class, 'update'])->name('contacts.update');

            Route::apiResource('outlets', Admin\OutletController::class);
            Route::apiResource('users', Admin\UserController::class);

            // Keuangan (pembukuan): Super Admin & Admin Outlet, dibatasi outlet.
            Route::get('ingredients/{ingredient}/movements', [Admin\IngredientController::class, 'movements'])->name('ingredients.movements');
            Route::post('ingredients/{ingredient}/adjust', [Admin\IngredientController::class, 'adjust'])->name('ingredients.adjust');
            Route::apiResource('ingredients', Admin\IngredientController::class);
            Route::apiResource('stock-purchases', Admin\StockPurchaseController::class)->except('update');
            Route::get('recipes', [Admin\RecipeController::class, 'index'])->name('recipes.index');
            Route::get('recipes/{product}', [Admin\RecipeController::class, 'show'])->name('recipes.show');
            Route::put('recipes/{product}', [Admin\RecipeController::class, 'update'])->name('recipes.update');
            Route::apiResource('cash-entries', Admin\CashEntryController::class);
            Route::get('finance/summary', [Admin\FinanceController::class, 'summary'])->name('finance.summary');

            Route::get('reports/sales', [Admin\ReportController::class, 'summary'])->name('reports.summary');
            Route::get('reports/sales.xlsx', [Admin\ReportController::class, 'sales'])->name('reports.sales');

            Route::get('settings', [Admin\SettingController::class, 'show'])->name('settings.show');
            Route::put('settings', [Admin\SettingController::class, 'update'])->name('settings.update');
        });
    });
});
