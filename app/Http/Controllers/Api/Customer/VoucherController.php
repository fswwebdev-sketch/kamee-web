<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\PromotionResource;
use App\Services\PromotionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Pelanggan: Voucher
 *
 * @authenticated
 */
class VoucherController extends Controller
{
    /** Voucher yang masih bisa saya pakai. */
    public function index(Request $request, PromotionService $promotions): JsonResponse
    {
        $vouchers = $promotions->vouchersFor($request->user())->map(fn (array $row) => (new PromotionResource($row['promotion']))->resolve($request) + [
            'used' => $row['used'],
            'remaining_uses' => $row['remaining'],
        ]);

        return response()->json(['data' => $vouchers]);
    }
}
