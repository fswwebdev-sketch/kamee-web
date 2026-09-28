<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DateRangeRequest;
use App\Models\Order;
use App\Services\ReportService;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @group Admin: Laporan
 *
 * @authenticated
 */
class ReportController extends Controller
{
    /**
     * Ekspor laporan penjualan (XLSX).
     *
     * @response 200 scenario="Berkas XLSX" binary
     */
    public function sales(DateRangeRequest $request, ReportService $reports): StreamedResponse
    {
        $this->authorize('export', Order::class);

        return $reports->salesXlsx($request->outletId(), $request->from(), $request->to());
    }
}
