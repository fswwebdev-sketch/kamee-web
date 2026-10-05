<?php

namespace App\Services;

use App\Enums\CashCategory;
use App\Enums\CashEntryType;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\CashEntry;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\Finance\RecipeBook;
use App\Services\Finance\RecipeService;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

/**
 * Ringkasan keuangan: penjualan (pesanan terbayar), buku kas, HPP dari resep, dan laba.
 *
 * Pengelompokan tanggal memakai zona waktu aplikasi (Asia/Jakarta) dan dihitung di PHP
 * agar konsisten di MySQL maupun SQLite.
 */
class FinanceService
{
    public function __construct(private readonly RecipeService $recipes) {}

    /** @return array<string, mixed> */
    public function summary(?int $outletId, CarbonInterface $from, CarbonInterface $to): array
    {
        $from = $from->copy()->startOfDay();
        $to = $to->copy()->endOfDay();

        $orders = $this->paidOrders($outletId, $from, $to);
        $entries = CashEntry::withoutGlobalScopes()
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->toDateString())
            ->get();

        $income = $entries->where('type', CashEntryType::Income);
        $expense = $entries->where('type', CashEntryType::Expense);

        $sales = $this->sales($orders);
        [$products, $hppTotal, $missing] = $this->products($orders);

        $otherIncome = [
            'total' => (int) $income->sum('amount'),
            'by_category' => $this->byCategory($income),
            'by_method' => $this->entriesByMethod($income),
        ];
        $expenses = [
            'total' => (int) $expense->sum('amount'),
            'by_category' => $this->byCategory($expense),
            'by_method' => $this->entriesByMethod($expense),
        ];

        $stockPurchases = (int) $expense->filter(fn (CashEntry $e) => $e->category->isStockPurchase())->sum('amount');
        $operating = $expenses['total'] - $stockPurchases;
        $grossProfit = $sales['total'] - $hppTotal;
        $earnedOther = (int) $income->filter(fn (CashEntry $e) => $e->category !== CashCategory::Modal)->sum('amount');
        $incomeTotal = $sales['total'] + $otherIncome['total'];

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'sales' => $sales,
            'other_income' => $otherIncome,
            'income_total' => $incomeTotal,
            'income_by_method' => $this->mergeByMethod($sales['by_method'], $otherIncome['by_method']),
            'hpp_total' => $hppTotal,
            'gross_profit' => $grossProfit,
            'expenses' => $expenses,
            'stock_purchases_total' => $stockPurchases,
            'operating_expenses' => $operating,
            'net_profit_estimate' => $grossProfit + $earnedOther - $operating,
            'cash_flow' => $incomeTotal - $expenses['total'],
            'products' => $products,
            'daily' => $this->daily($from, $to, $orders, $income, $expense),
            'missing_recipes' => $missing,
        ];
    }

    /** Pesanan terbayar dalam periode (paid_at), tidak dibatalkan. */
    private function paidOrders(?int $outletId, CarbonInterface $from, CarbonInterface $to): Collection
    {
        return Order::query()->withoutGlobalScopes()
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$from, $to])
            ->where('status', '!=', OrderStatus::Cancelled)
            ->with(['items.options', 'payments'])
            ->orderBy('paid_at')
            ->get();
    }

    /** Metode bayar pesanan: pembayaran lunas terakhir; bila tidak ada, pembayaran terakhir; default tunai. */
    public static function orderMethod(Order $order): PaymentMethod
    {
        $payments = $order->payments->sortByDesc('id');

        /** @var Payment|null $payment */
        $payment = $payments->first(fn (Payment $p) => $p->status === PaymentStatus::Paid) ?? $payments->first();

        return $payment?->method ?? PaymentMethod::Cash;
    }

    /** @return array<string, mixed> */
    private function sales(Collection $orders): array
    {
        $byMethod = $this->methodRows();
        $byChannel = collect(OrderChannel::cases())->mapWithKeys(fn (OrderChannel $c) => [$c->value => [
            'channel' => $c->value, 'label' => $c->label(), 'amount' => 0, 'count' => 0,
        ]])->all();

        foreach ($orders as $order) {
            $method = self::orderMethod($order);
            $byMethod[$method->value] ??= ['method' => $method->value, 'label' => $method->bookLabel(), 'amount' => 0, 'count' => 0];
            $byMethod[$method->value]['amount'] += $order->total;
            $byMethod[$method->value]['count']++;

            $byChannel[$order->channel->value]['amount'] += $order->total;
            $byChannel[$order->channel->value]['count']++;
        }

        return [
            'total' => (int) $orders->sum('total'),
            'orders_count' => $orders->count(),
            'items_count' => (int) $orders->sum(fn (Order $o) => $o->items->sum('qty')),
            'by_method' => $this->withoutEmptyExtras($byMethod),
            'by_channel' => array_values($byChannel),
        ];
    }

    /** @return array{0: list<array<string, mixed>>, 1: int, 2: list<string>} [products, hpp_total, missing_recipes] */
    private function products(Collection $orders): array
    {
        /** @var array<int, RecipeBook> $books */
        $books = [];
        $rows = [];
        $missing = [];
        $hppTotal = 0;

        $catalog = Product::withTrashed()->with('category')
            ->whereIn('id', $orders->flatMap(fn (Order $o) => $o->items->pluck('product_id'))->filter()->unique())
            ->get()->keyBy('id');

        foreach ($orders as $order) {
            $book = $books[$order->outlet_id] ??= $this->recipes->book($order->outlet_id);

            foreach ($order->items as $item) {
                $optionNames = $item->options->pluck('option_name')->all();
                $size = $item->product_id ? $book->sizeForItem($item->product_id, $optionNames) : RecipeBook::sizeOf($optionNames);
                $unitHpp = $item->product_id ? $book->hppFor($item->product_id, $size) : null;
                $product = $item->product_id ? $catalog->get($item->product_id) : null;
                $name = $product?->name ?? $item->product_name;

                if ($unitHpp === null) {
                    $missing[$name] = true;
                }

                $hpp = ($unitHpp ?? 0) * $item->qty;
                $hppTotal += $hpp;

                $key = $item->product_id ?? 'x:'.$item->product_name;
                $rows[$key] ??= [
                    'product_id' => $item->product_id,
                    'name' => $name,
                    'category' => $product?->category?->name ?? '',
                    'qty' => 0, 'revenue' => 0, 'hpp' => 0, 'profit' => 0,
                    'variants' => [],
                ];
                $rows[$key]['qty'] += $item->qty;
                $rows[$key]['revenue'] += $item->subtotal;
                $rows[$key]['hpp'] += $hpp;
                $rows[$key]['profit'] = $rows[$key]['revenue'] - $rows[$key]['hpp'];

                $vKey = RecipeBook::key($size);
                $rows[$key]['variants'][$vKey] ??= ['option_name' => $size, 'qty' => 0, 'revenue' => 0];
                $rows[$key]['variants'][$vKey]['qty'] += $item->qty;
                $rows[$key]['variants'][$vKey]['revenue'] += $item->subtotal;
            }
        }

        $products = collect($rows)
            ->map(function (array $r) {
                $r['variants'] = collect($r['variants'])->sortByDesc('qty')->values()->all();

                return $r;
            })
            ->sort(fn (array $a, array $b) => [$b['qty'], $b['revenue'], $a['name']] <=> [$a['qty'], $a['revenue'], $b['name']])
            ->values()->all();

        $missing = array_keys($missing);
        sort($missing);

        return [$products, $hppTotal, $missing];
    }

    /** @return list<array{category:string, label:string, amount:int}> */
    private function byCategory(Collection $entries): array
    {
        return $entries->groupBy(fn (CashEntry $e) => $e->category->value)
            ->map(fn (Collection $g, string $cat) => [
                'category' => $cat,
                'label' => CashCategory::from($cat)->label(),
                'amount' => (int) $g->sum('amount'),
            ])
            ->sortByDesc('amount')->values()->all();
    }

    /** @return list<array{method:string, label:string, amount:int, count:int}> */
    private function entriesByMethod(Collection $entries): array
    {
        $rows = $this->methodRows();
        foreach ($entries as $entry) {
            $m = $entry->method;
            $rows[$m->value] ??= ['method' => $m->value, 'label' => $m->bookLabel(), 'amount' => 0, 'count' => 0];
            $rows[$m->value]['amount'] += $entry->amount;
            $rows[$m->value]['count']++;
        }

        return $this->withoutEmptyExtras($rows);
    }

    /** Baris awal: tunai, QRIS, transfer (selalu ada walau 0). */
    private function methodRows(): array
    {
        return collect(PaymentMethod::bookkeepingValues())->mapWithKeys(fn (string $m) => [$m => [
            'method' => $m, 'label' => PaymentMethod::from($m)->bookLabel(), 'amount' => 0, 'count' => 0,
        ]])->all();
    }

    private function withoutEmptyExtras(array $rows): array
    {
        return array_values(array_filter($rows, fn (array $r) => in_array($r['method'], PaymentMethod::bookkeepingValues(), true) || $r['count'] > 0));
    }

    /** @return list<array{method:string, label:string, amount:int}> */
    private function mergeByMethod(array ...$lists): array
    {
        $rows = [];
        foreach ($lists as $list) {
            foreach ($list as $r) {
                $rows[$r['method']] ??= ['method' => $r['method'], 'label' => $r['label'], 'amount' => 0];
                $rows[$r['method']]['amount'] += $r['amount'];
            }
        }

        return array_values($rows);
    }

    /** @return list<array{date:string, sales:int, other_income:int, expense:int}> */
    private function daily(CarbonInterface $from, CarbonInterface $to, Collection $orders, Collection $income, Collection $expense): array
    {
        $sales = $orders->groupBy(fn (Order $o) => $o->paid_at->copy()->setTimezone(config('app.timezone'))->toDateString())
            ->map(fn (Collection $g) => (int) $g->sum('total'));
        $in = $income->groupBy(fn (CashEntry $e) => $e->date->toDateString())->map(fn (Collection $g) => (int) $g->sum('amount'));
        $out = $expense->groupBy(fn (CashEntry $e) => $e->date->toDateString())->map(fn (Collection $g) => (int) $g->sum('amount'));

        $days = [];
        foreach (CarbonPeriod::create($from->copy()->startOfDay(), '1 day', $to->copy()->startOfDay()) as $day) {
            $d = $day->toDateString();
            $days[] = ['date' => $d, 'sales' => $sales[$d] ?? 0, 'other_income' => $in[$d] ?? 0, 'expense' => $out[$d] ?? 0];
        }

        return $days;
    }
}
