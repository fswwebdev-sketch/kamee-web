<?php

namespace App\Services\Finance;

use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\Qty;
use Illuminate\Support\Facades\DB;

/**
 * Mutasi stok bahan. Semua perubahan stok lewat sini agar stock_qty selalu = jumlah mutasi.
 */
class StockService
{
    public function __construct(private readonly RecipeService $recipes) {}

    /**
     * Catat satu mutasi dan perbarui stok bahan.
     *
     * @param  array{unit_cost?:float|null, reference?:string|null, note?:string|null, order_id?:int|null, stock_purchase_id?:int|null}  $attributes
     */
    public function record(Ingredient $ingredient, StockMovementType $type, float $qty, ?User $actor = null, array $attributes = []): StockMovement
    {
        return DB::transaction(function () use ($ingredient, $type, $qty, $actor, $attributes) {
            $movement = StockMovement::create($attributes + [
                'ingredient_id' => $ingredient->id,
                'type' => $type,
                'qty' => round($qty, 3),
                'created_by' => $actor?->id,
            ]);

            Ingredient::withoutGlobalScopes()->withTrashed()->whereKey($ingredient->id)->increment('stock_qty', round($qty, 3));
            $ingredient->stock_qty = (float) Ingredient::withoutGlobalScopes()->withTrashed()->whereKey($ingredient->id)->value('stock_qty');

            return $movement;
        });
    }

    /** Hapus mutasi dan kembalikan efeknya pada stok (dipakai saat belanja dibatalkan). */
    public function remove(StockMovement $movement): void
    {
        DB::transaction(function () use ($movement) {
            Ingredient::withoutGlobalScopes()->withTrashed()->whereKey($movement->ingredient_id)->decrement('stock_qty', $movement->qty);
            $movement->delete();
        });
    }

    /** Stok opname: selisih hitung fisik dengan stok sistem dicatat sebagai mutasi adjustment. */
    public function adjust(Ingredient $ingredient, float $countedQty, User $actor, ?string $note = null): Ingredient
    {
        return DB::transaction(function () use ($ingredient, $countedQty, $actor, $note) {
            /** @var Ingredient $locked */
            $locked = Ingredient::withoutGlobalScopes()->lockForUpdate()->findOrFail($ingredient->id);
            $diff = round($countedQty - $locked->stock_qty, 3);

            $this->record($locked, StockMovementType::Adjustment, $diff, $actor, [
                'unit_cost' => $locked->costPerUnit(),
                'note' => $note ?? 'Stok opname: hitung fisik '.Qty::text($countedQty).' '.$locked->unit->value,
            ]);

            return $locked->refresh();
        });
    }

    /**
     * Sinkronkan stok dengan perubahan status pesanan (dipanggil OrderStateMachine di dalam transaksi).
     * Pemotongan sekali saat pesanan menjadi terbayar/berjalan; pengembalian sekali saat dibatalkan.
     * Kolom penanda diset pada $order (disimpan oleh pemanggil).
     */
    public function syncOrder(Order $order, OrderStatus $to, ?User $actor = null): void
    {
        if (in_array($to, OrderStatus::revenueStatuses(), true) && $order->stock_deducted_at === null) {
            $this->deductForOrder($order, $actor);
            $order->stock_deducted_at = now();

            return;
        }

        if ($to === OrderStatus::Cancelled && $order->stock_deducted_at !== null && $order->stock_reversed_at === null) {
            $this->reverseForOrder($order, $actor);
            $order->stock_reversed_at = now();
        }
    }

    private function deductForOrder(Order $order, ?User $actor): void
    {
        $items = $order->items()->with('options')->get();
        $book = $this->recipes->book($order->outlet_id);

        /** @var array<int, float> $usage ingredient_id => qty */
        $usage = [];
        foreach ($items as $item) {
            if ($item->product_id === null) {
                continue;
            }

            $variant = $book->variantFor($item->product_id, $book->sizeForItem($item->product_id, $item->options->pluck('option_name')->all()));
            foreach ($variant ?? [] as $line) {
                $usage[$line['ingredient_id']] = ($usage[$line['ingredient_id']] ?? 0) + $item->qty * $line['qty'];
            }
        }

        if ($usage === []) {
            return;
        }

        $ingredients = Ingredient::withoutGlobalScopes()->withTrashed()->whereIn('id', array_keys($usage))->get()->keyBy('id');
        foreach ($usage as $ingredientId => $qty) {
            $ingredient = $ingredients->get($ingredientId);
            if ($ingredient === null || $qty == 0) {
                continue;
            }

            $this->record($ingredient, StockMovementType::Sale, -$qty, $actor, [
                'unit_cost' => $ingredient->costPerUnit(),
                'reference' => $order->code,
                'order_id' => $order->id,
                'note' => 'Penjualan pesanan '.$order->code,
            ]);
        }
    }

    /** Kembalikan stok sebesar mutasi sale yang benar-benar tercatat untuk pesanan ini. */
    private function reverseForOrder(Order $order, ?User $actor): void
    {
        $sold = StockMovement::query()
            ->where('order_id', $order->id)
            ->where('type', StockMovementType::Sale)
            ->selectRaw('ingredient_id, SUM(qty) as qty, MAX(unit_cost) as unit_cost')
            ->groupBy('ingredient_id')
            ->get();

        $ingredients = Ingredient::withoutGlobalScopes()->withTrashed()->whereIn('id', $sold->pluck('ingredient_id'))->get()->keyBy('id');
        foreach ($sold as $row) {
            $ingredient = $ingredients->get($row->ingredient_id);
            if ($ingredient === null || (float) $row->qty == 0) {
                continue;
            }

            $this->record($ingredient, StockMovementType::SaleReversal, -(float) $row->qty, $actor, [
                'unit_cost' => $row->unit_cost !== null ? (float) $row->unit_cost : null,
                'reference' => $order->code,
                'order_id' => $order->id,
                'note' => 'Pesanan '.$order->code.' dibatalkan',
            ]);
        }
    }
}
