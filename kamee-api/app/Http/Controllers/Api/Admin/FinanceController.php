<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Finance\FinanceRangeRequest;
use App\Models\CashEntry;
use App\Services\FinanceService;
use App\Support\AdminOutlet;
use Illuminate\Http\JsonResponse;

/**
 * @group Admin: Keuangan
 *
 * @authenticated
 */
class FinanceController extends Controller
{
    /**
     * Ringkasan keuangan periode: penjualan, pemasukan lain, HPP, laba kotor, pengeluaran, arus kas,
     * menu terlaris, dan rekap harian. Default bulan berjalan (Asia/Jakarta).
     */
    public function summary(FinanceRangeRequest $request, FinanceService $finance): JsonResponse
    {
        $this->authorize('viewAny', CashEntry::class);

        return response()->json([
            'data' => $finance->summary(AdminOutlet::filter($request), $request->from(), $request->to()),
        ]);
    }
}
