<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\DeliveryQuoteRequest;
use App\Models\Outlet;
use App\Services\DeliveryFeeService;
use Illuminate\Http\JsonResponse;

/**
 * @group Outlet & Pengantaran
 *
 * @unauthenticated
 */
class DeliveryController extends Controller
{
    /**
     * Hitung ongkir.
     *
     * Jarak dihitung dengan rumus Haversine dari koordinat outlet. Di luar radius → 422.
     */
    public function quote(DeliveryQuoteRequest $request, DeliveryFeeService $delivery): JsonResponse
    {
        $outlet = Outlet::findOrFail($request->integer('outlet_id'));
        $quote = $delivery->quoteOrFail($outlet, (float) $request->input('lat'), (float) $request->input('lng'));

        return response()->json(['data' => $quote->toArray() + ['outlet_id' => $outlet->id]]);
    }
}
