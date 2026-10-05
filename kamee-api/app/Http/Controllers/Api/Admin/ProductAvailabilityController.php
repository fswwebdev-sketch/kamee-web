<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAvailabilityRequest;
use App\Models\Outlet;
use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;

/**
 * @group Admin: Katalog
 *
 * @authenticated
 */
class ProductAvailabilityController extends Controller
{
    /**
     * Tandai produk tersedia / habis di outlet.
     *
     * Admin Outlet hanya untuk outlet miliknya.
     */
    public function __invoke(UpdateAvailabilityRequest $request, Outlet $outlet, Product $product, ProductService $products): JsonResponse
    {
        $this->authorize('manageAvailability', $outlet);

        $available = $request->boolean('is_available');
        $products->setAvailability($outlet, $product, $available);

        return response()->json([
            'message' => $available ? "{$product->name} tersedia kembali di {$outlet->name}." : "{$product->name} ditandai habis di {$outlet->name}.",
            'data' => ['outlet_id' => $outlet->id, 'product_id' => $product->id, 'is_available' => $available],
        ]);
    }
}
