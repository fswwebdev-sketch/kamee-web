<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ValidatePromotionRequest;
use App\Http\Resources\PromotionResource;
use App\Models\Customer;
use App\Models\Promotion;
use App\Services\PromotionContext;
use App\Services\PromotionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Promo
 *
 * @unauthenticated
 */
class PromotionController extends Controller
{
    /** Promo aktif yang sedang berjalan. */
    public function index(): AnonymousResourceCollection
    {
        return PromotionResource::collection(Promotion::query()->running()->orderBy('ends_at')->get());
    }

    /**
     * Cek voucher.
     *
     * Rate limit 10 permintaan/menit. Diskon final tetap dihitung ulang saat membuat pesanan.
     */
    public function validate(ValidatePromotionRequest $request, PromotionService $promotions): JsonResponse
    {
        $customer = $request->user('sanctum');

        $evaluation = $promotions->evaluateCode($request->string('code'), new PromotionContext(
            subtotal: $request->integer('subtotal'),
            outletId: $request->integer('outlet_id') ?: null,
            deliveryFee: $request->integer('delivery_fee'),
            customer: $customer instanceof Customer ? $customer : null,
        ));

        return response()->json([
            'message' => $evaluation->message,
            'data' => [
                'valid' => true,
                'discount' => $evaluation->discount,
                'subtotal_after' => max(0, $request->integer('subtotal') - $evaluation->discount),
                'promotion' => new PromotionResource($evaluation->promotion),
            ],
        ]);
    }
}
