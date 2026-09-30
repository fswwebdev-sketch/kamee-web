<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DateRangeRequest;
use App\Models\Order;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @group Admin: Laporan
 *
 * @authenticated
 */
class ReportController extends Controller
{
    /**
     * Laporan penjualan (JSON).
     *
     * Agregasi per hari, bulan, produk, outlet, atau metode bayar. Admin Outlet otomatis dikunci ke outletnya.
     */
    public function summary(DateRangeRequest $request, ReportService $reports): JsonResponse
    {
        $this->authorize('export', Order::class);

        return response()->json(['data' => $reports->summary(
            $request->outletId(), $request->from(), $request->to(), $request->input('group_by', 'day'),
        )]);
    }

    /**
     * Ekspor laporan penjualan (XLSX).
     *
     * @response 200 scenario="Berkas XLSX" binary
     */
    public function sales(DateRangeRequest $request, ReportService $reports): StreamedResponse
    {
        $this->authorize('export', Order::class);

        return $reports->salesXlsx($request->outletId(), $request->from(), $request->to(), $request->input('group_by'));
    }
}
