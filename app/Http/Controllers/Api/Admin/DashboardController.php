<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DateRangeRequest;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

/**
 * @group Admin: Dashboard
 *
 * @authenticated
 */
class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboard) {}

    /** Ringkasan penjualan, pesanan, AOV, pelanggan baru. */
    public function summary(DateRangeRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->summary($request->outletId(), $request->from(), $request->to())]);
    }

    /** Grafik pendapatan per hari/bulan. */
    public function revenue(DateRangeRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->revenue(
            $request->outletId(), $request->from(), $request->to(), $request->input('interval', 'day'),
        )]);
    }

    /** Produk terlaris. */
    public function topProducts(DateRangeRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->dashboard->topProducts(
            $request->outletId(), $request->from(), $request->to(), $request->integer('limit', 10),
        )]);
    }
}
