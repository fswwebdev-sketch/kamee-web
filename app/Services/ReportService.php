<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Outlet;
use App\Models\Payment;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Ekspor laporan penjualan ke XLSX (streaming, hemat memori). */
class ReportService
{
    public const HEADINGS = [
        'Kode', 'Tanggal', 'Outlet', 'Pelanggan', 'No. WA', 'Layanan', 'Kanal', 'Status',
        'Subtotal', 'Diskon', 'Poin Ditukar', 'Ongkir', 'Biaya Layanan', 'Total', 'Metode Bayar',
    ];

    public const GROUP_HEADINGS = [
        'day' => 'Tanggal', 'month' => 'Bulan', 'product' => 'Produk', 'outlet' => 'Outlet', 'payment_method' => 'Metode Bayar',
    ];

    public function salesXlsx(?int $outletId, CarbonInterface $from, CarbonInterface $to, ?string $groupBy = null): StreamedResponse
    {
        if ($groupBy !== null) {
            return $this->summaryXlsx($outletId, $from, $to, $groupBy);
        }

        $filename = sprintf('laporan-penjualan-%s_%s.xlsx', $from->format('Ymd'), $to->format('Ymd'));

        return response()->streamDownload(function () use ($outletId, $from, $to) {
            $writer = new Writer;
            $writer->openToFile('php://output');
            $writer->addRow(Row::fromValues(self::HEADINGS, (new Style)->setFontBold()));

            foreach ($this->rows($outletId, $from, $to) as $row) {
                $writer->addRow(Row::fromValues($row));
            }

            $writer->close();
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /** Ekspor laporan teragregasi (per hari/bulan/produk/outlet/metode bayar). */
    private function summaryXlsx(?int $outletId, CarbonInterface $from, CarbonInterface $to, string $groupBy): StreamedResponse
    {
        $report = $this->summary($outletId, $from, $to, $groupBy);
        $filename = sprintf('laporan-%s-%s_%s.xlsx', str_replace('_', '-', $groupBy), $from->format('Ymd'), $to->format('Ymd'));
        $withQty = $groupBy === 'product';

        return response()->streamDownload(function () use ($report, $groupBy, $withQty) {
            $writer = new Writer;
            $writer->openToFile('php://output');
            $bold = (new Style)->setFontBold();
            $writer->addRow(Row::fromValues(array_values(array_filter([
                self::GROUP_HEADINGS[$groupBy], 'Pesanan', $withQty ? 'Qty Terjual' : null, 'Pendapatan (Rp)', 'Kontribusi (%)',
            ], fn ($v) => $v !== null)), $bold));

            foreach ($report['rows'] as $row) {
                $writer->addRow(Row::fromValues(array_values(array_filter([
                    $row['label'], $row['orders'], $withQty ? $row['qty'] : null, $row['revenue'], $row['share'],
                ], fn ($v) => $v !== null))));
            }

            $writer->addRow(Row::fromValues(array_values(array_filter([
                'Total', $report['totals']['orders'], $withQty ? collect($report['rows'])->sum('qty') : null, $report['totals']['revenue'], 100,
            ], fn ($v) => $v !== null)), $bold));
            $writer->close();
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /**
     * Laporan penjualan teragregasi (hanya pesanan yang dihitung sebagai penjualan).
     *
     * @return array{group_by:string, rows:list<array{key:string, label:string, orders:int, qty:int|null, revenue:int, share:float}>, totals:array{orders:int, revenue:int}}
     */
    public function summary(?int $outletId, CarbonInterface $from, CarbonInterface $to, string $groupBy): array
    {
        $orders = fn (): Builder => Order::query()
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->whereIn('status', OrderStatus::revenueStatuses())
            ->whereBetween('created_at', [$from, $to]);

        $rows = match ($groupBy) {
            'product' => OrderItem::query()
                ->whereIn('order_id', $orders()->select('orders.id'))
                ->selectRaw('product_id as k, MAX(product_name) as label, COUNT(DISTINCT order_id) as orders, SUM(qty) as qty, SUM(subtotal) as revenue')
                ->groupBy('product_id')->orderByDesc('revenue')->get()
                ->map(fn ($r) => ['key' => (string) $r->k, 'label' => $r->label, 'orders' => (int) $r->orders, 'qty' => (int) $r->qty, 'revenue' => (int) $r->revenue]),
            'outlet' => $this->withLabels(
                $orders()->selectRaw('outlet_id as k, COUNT(*) as orders, SUM(total) as revenue')->groupBy('outlet_id')->orderByDesc('revenue')->get(),
                Outlet::query()->pluck('name', 'id')->all(),
            ),
            'payment_method' => $this->withLabels(
                Payment::query()
                    ->where('status', PaymentStatus::Paid)
                    ->whereIn('order_id', $orders()->select('orders.id'))
                    ->selectRaw('method as k, COUNT(DISTINCT order_id) as orders, SUM(amount) as revenue')
                    ->groupBy('method')->orderByDesc('revenue')->get(),
                collect(PaymentMethod::cases())->mapWithKeys(fn ($m) => [$m->value => $m->label()])->all(),
            ),
            default => $this->byPeriod($orders(), $from, $to, $groupBy === 'month' ? 'month' : 'day'),
        };

        $totals = ['orders' => $orders()->count(), 'revenue' => (int) $orders()->sum('total')];
        $sum = max(1, (int) collect($rows)->sum('revenue'));

        return [
            'group_by' => $groupBy,
            'rows' => collect($rows)->map(fn (array $r) => $r + ['qty' => null, 'share' => round($r['revenue'] / $sum * 100, 1)])->values()->all(),
            'totals' => $totals,
        ];
    }

    /** @param array<int|string, string> $labels */
    private function withLabels(iterable $rows, array $labels): array
    {
        return collect($rows)->map(fn ($r) => [
            'key' => (string) ($r->k instanceof \BackedEnum ? $r->k->value : $r->k),
            'label' => $labels[$r->k instanceof \BackedEnum ? $r->k->value : $r->k] ?? (string) $r->k,
            'orders' => (int) $r->orders,
            'revenue' => (int) $r->revenue,
        ])->all();
    }

    private function byPeriod(Builder $orders, CarbonInterface $from, CarbonInterface $to, string $interval): array
    {
        $driver = DB::connection()->getDriverName();
        $expr = match ([$driver, $interval]) {
            ['sqlite', 'month'] => "strftime('%Y-%m', created_at)",
            ['sqlite', 'day'] => "strftime('%Y-%m-%d', created_at)",
            ['pgsql', 'month'] => "to_char(created_at, 'YYYY-MM')",
            ['pgsql', 'day'] => "to_char(created_at, 'YYYY-MM-DD')",
            [$driver, 'month'] => "DATE_FORMAT(created_at, '%Y-%m')",
            default => "DATE_FORMAT(created_at, '%Y-%m-%d')",
        };

        $found = $orders->selectRaw("{$expr} as k, COUNT(*) as orders, SUM(total) as revenue")->groupBy('k')->get()->keyBy('k');
        $rows = [];
        $cursor = $from->copy()->startOf($interval);
        while ($cursor <= $to) {
            $key = $cursor->format($interval === 'month' ? 'Y-m' : 'Y-m-d');
            $rows[] = [
                'key' => $key,
                'label' => $cursor->locale('id')->translatedFormat($interval === 'month' ? 'F Y' : 'D, j M Y'),
                'orders' => (int) ($found[$key]->orders ?? 0),
                'revenue' => (int) ($found[$key]->revenue ?? 0),
            ];
            $cursor = $cursor->add(1, $interval);
        }

        return $rows;
    }

    /** @return \Generator<int, list<string|int>> */
    public function rows(?int $outletId, CarbonInterface $from, CarbonInterface $to): \Generator
    {
        $query = Order::query()
            ->with(['outlet:id,name', 'latestPayment'])
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('id');

        foreach ($query->lazyById(500) as $order) {
            yield [
                $order->code,
                $order->created_at->format('Y-m-d H:i'),
                $order->outlet?->name ?? '-',
                $order->customer_name,
                $order->customer_phone,
                $order->fulfillment->label(),
                $order->channel->label(),
                $order->status->label(),
                $order->subtotal,
                $order->discount,
                $order->points_redeemed,
                $order->delivery_fee,
                $order->service_fee,
                $order->total,
                $order->latestPayment?->method->label() ?? '-',
            ];
        }
    }
}
