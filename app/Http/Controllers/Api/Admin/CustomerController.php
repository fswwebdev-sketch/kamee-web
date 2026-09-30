<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdjustPointsRequest;
use App\Http\Resources\Admin\AdminCustomerResource;
use App\Http\Resources\LoyaltyTransactionResource;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Services\CustomerService;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Admin: Pelanggan
 *
 * @authenticated
 */
class CustomerController extends Controller
{
    /**
     * Daftar pelanggan.
     *
     * @queryParam filter[search] string Nama / nomor WA / email. Example: dinda
     * @queryParam filter[tier_id] integer Example: 2
     * @queryParam sort string lifetime_spend, points_balance, created_at. Example: -lifetime_spend
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Customer::class);

        $customers = QueryBuilder::for(Customer::query()->with('tier')->withCount('orders'))
            ->allowedFilters([
                AllowedFilter::exact('tier_id'),
                AllowedFilter::callback('search', fn ($q, $v) => $q->where(fn ($w) => $w
                    ->where('name', 'like', "%{$v}%")->orWhere('phone_wa', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%"))),
            ])
            ->allowedSorts(['lifetime_spend', 'points_balance', 'created_at', 'name'])
            ->defaultSort('-created_at')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return AdminCustomerResource::collection($customers);
    }

    /** Detail pelanggan: statistik, pesanan terbaru, riwayat poin. */
    public function show(Customer $customer, CustomerService $customers): JsonResponse
    {
        $this->authorize('view', $customer);

        $customer->load('tier', 'addresses');

        return (new AdminCustomerResource($customer))->withStats($customers->stats($customer))->additional([
            'recent_orders' => OrderResource::collection($customer->orders()->withoutGlobalScopes()->with('outlet:id,name,phone_wa')->latest()->limit(10)->get()),
            'points_history' => LoyaltyTransactionResource::collection($customer->loyaltyTransactions()->with('order:id,code')->latest('id')->limit(20)->get()),
        ])->response();
    }

    /** Koreksi poin (khusus Super Admin, tercatat di riwayat poin). */
    public function adjustPoints(AdjustPointsRequest $request, Customer $customer, LoyaltyService $loyalty): JsonResponse
    {
        $this->authorize('adjustPoints', $customer);

        $transaction = $loyalty->adjust($customer, $request->integer('points'), $request->string('note'), $request->user());

        return response()->json([
            'message' => 'Poin pelanggan berhasil dikoreksi.',
            'data' => new LoyaltyTransactionResource($transaction),
        ], 201);
    }
}
