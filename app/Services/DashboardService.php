<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Statistik dashboard admin. Query Order otomatis dibatasi OutletScope untuk Admin Outlet.
 */
class DashboardService
{
    public function summary(?int $outletId, CarbonInterface $from, CarbonInterface $to): array
    {
        $revenue = $this->revenueQuery($outletId, $from, $to);
        $totalRevenue = (int) (clone $revenue)->sum('total');
        $paidOrders = (clone $revenue)->count();

        $all = $this->orders($outletId)->whereBetween('created_at', [$from, $to]);

        return [
            'period' => ['from' => $from->toIso8601String(), 'to' => $to->toIso8601String()],
            'revenue' => $totalRevenue,
            'orders' => (clone $all)->count(),
            'paid_orders' => $paidOrders,
            'cancelled_orders' => (clone $all)->where('status', OrderStatus::Cancelled)->count(),
            'pending_orders' => (clone $all)->where('status', OrderStatus::Pending)->count(),
            'average_order_value' => $paidOrders > 0 ? intdiv($totalRevenue, $paidOrders) : 0,
            'new_customers' => Customer::query()->whereBetween('created_at', [$from, $to])->count(),
            'by_status' => (clone $all)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            'by_channel' => (clone $all)->selectRaw('channel, COUNT(*) as total')->groupBy('channel')->pluck('total', 'channel'),
        ];
    }

    /** @return list<array{period:string, revenue:int, orders:int}> */
    public function revenue(?int $outletId, CarbonInterface $from, CarbonInterface $to, string $interval = 'day'): array
    {
        $expr = $this->periodExpression($interval);

        $rows = $this->revenueQuery($outletId, $from, $to)
            ->selectRaw("{$expr} as period, SUM(total) as revenue, COUNT(*) as orders")
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->keyBy('period');

        // Lengkapi periode kosong agar grafik kontinu.
        $series = [];
        $cursor = Carbon::parse($from)->startOf($interval);
        $format = $interval === 'month' ? 'Y-m' : 'Y-m-d';
        while ($cursor <= $to) {
            $key = $cursor->format($format);
            $series[] = [
                'period' => $key,
                'revenue' => (int) ($rows[$key]->revenue ?? 0),
                'orders' => (int) ($rows[$key]->orders ?? 0),
            ];
            $cursor->add(1, $interval);
        }

        return $series;
    }

    public function topProducts(?int $outletId, CarbonInterface $from, CarbonInterface $to, int $limit = 10): array
    {
        $orderIds = $this->revenueQuery($outletId, $from, $to)->select('orders.id');

        return OrderItem::query()
            ->whereIn('order_id', $orderIds)
            ->selectRaw('product_id, MAX(product_name) as product_name, SUM(qty) as qty, SUM(subtotal) as revenue')
            ->groupBy('product_id')
            ->orderByDesc('qty')
            ->limit($limit)
            ->get()
            ->map(fn ($r) => [
                'product_id' => $r->product_id,
                'product_name' => $r->product_name,
                'qty' => (int) $r->qty,
                'revenue' => (int) $r->revenue,
            ])
            ->all();
    }

    private function orders(?int $outletId): Builder
    {
        return Order::query()->when($outletId, fn (Builder $q) => $q->where('outlet_id', $outletId));
    }

    private function revenueQuery(?int $outletId, CarbonInterface $from, CarbonInterface $to): Builder
    {
        return $this->orders($outletId)
            ->whereIn('status', OrderStatus::revenueStatuses())
            ->whereBetween('created_at', [$from, $to]);
    }

    private function periodExpression(string $interval): string
    {
        $driver = DB::connection()->getDriverName();

        return match ([$driver, $interval]) {
            ['sqlite', 'month'] => "strftime('%Y-%m', created_at)",
            ['sqlite', 'day'] => "strftime('%Y-%m-%d', created_at)",
            ['pgsql', 'month'] => "to_char(created_at, 'YYYY-MM')",
            ['pgsql', 'day'] => "to_char(created_at, 'YYYY-MM-DD')",
            [$driver, 'month'] => "DATE_FORMAT(created_at, '%Y-%m')",
            default => "DATE_FORMAT(created_at, '%Y-%m-%d')",
        };
    }
}
