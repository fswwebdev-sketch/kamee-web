<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\RedeemPreviewRequest;
use App\Http\Resources\LoyaltyTierResource;
use App\Http\Resources\LoyaltyTransactionResource;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Pelanggan: Poin
 *
 * @authenticated
 */
class PointController extends Controller
{
    public function __construct(private readonly LoyaltyService $loyalty) {}

    /** Saldo, tier, dan riwayat poin. */
    public function index(Request $request): JsonResponse
    {
        $customer = $request->user()->load('tier');
        $next = $this->loyalty->nextTier($customer);

        $history = $customer->loyaltyTransactions()->with('order:id,code')->latest('id')
            ->paginate($this->perPage($request, 15))->withQueryString();

        return LoyaltyTransactionResource::collection($history)->additional([
            'summary' => [
                'balance' => $customer->points_balance,
                'point_value' => $this->loyalty->pointValue(),
                'balance_value' => $customer->points_balance * $this->loyalty->pointValue(),
                'expiring_in_30_days' => $this->loyalty->expiringSoon($customer),
                'lifetime_spend' => $customer->lifetime_spend,
                'tier' => $customer->tier ? new LoyaltyTierResource($customer->tier) : null,
                'next_tier' => $next ? [
                    'name' => $next->name,
                    'min_spend' => $next->min_spend,
                    'remaining_spend' => max(0, $next->min_spend - $customer->lifetime_spend),
                ] : null,
            ],
        ])->response();
    }

    /** Simulasi potongan poin. */
    public function redeemPreview(RedeemPreviewRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->loyalty->preview(
            $request->user(), $request->integer('points'), $request->integer('subtotal'),
        )]);
    }
}
