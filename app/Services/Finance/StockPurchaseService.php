<?php

namespace App\Services\Finance;

use App\Enums\CashCategory;
use App\Enums\CashEntrySource;
use App\Enums\CashEntryType;
use App\Enums\IngredientKind;
use App\Enums\PaymentMethod;
use App\Enums\StockMovementType;
use App\Exceptions\BusinessException;
use App\Models\CashEntry;
use App\Models\Ingredient;
use App\Models\StockPurchase;
use App\Models\User;
use App\Support\Qty;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Belanja stok: menambah stok (mutasi purchase), memperbarui harga kemasan terbaru,
 * dan mencatat pengeluaran di buku kas.
 */
class StockPurchaseService
{
    public function __construct(private readonly StockService $stock) {}

    /**
     * @param  array{date:string, supplier?:string|null, method:string, bank?:string|null, note?:string|null,
     *               items:list<array{ingredient_id:int, packs:float|int|string, pack_price:int}>}  $data
     */
    public function create(int $outletId, array $data, User $actor): StockPurchase
    {
        $ids = collect($data['items'])->pluck('ingredient_id')->map(fn ($id) => (int) $id)->unique()->all();
        $ingredients = Ingredient::withoutGlobalScopes()->where('outlet_id', $outletId)->whereIn('id', $ids)->get()->keyBy('id');

        $errors = [];
        foreach ($data['items'] as $i => $item) {
            if (! $ingredients->has((int) $item['ingredient_id'])) {
                $errors["items.{$i}.ingredient_id"][] = 'Bahan tidak ditemukan di outlet ini.';
            }
        }
        if ($errors !== []) {
            throw new BusinessException('Beberapa item belanja tidak valid.', $errors);
        }

        return DB::transaction(function () use ($outletId, $data, $actor, $ingredients) {
            $method = PaymentMethod::from($data['method']);

            $purchase = StockPurchase::create([
                'outlet_id' => $outletId,
                'date' => $data['date'],
                'supplier' => $data['supplier'] ?? null,
                'method' => $method,
                'bank' => $method === PaymentMethod::BankTransfer ? ($data['bank'] ?? null) : null,
                'note' => $data['note'] ?? null,
                'total' => 0,
                'created_by' => $actor->id,
            ]);

            $total = 0;
            $labels = [];
            $kinds = [];

            foreach ($data['items'] as $item) {
                /** @var Ingredient $ingredient */
                $ingredient = $ingredients->get((int) $item['ingredient_id']);
                $packs = round((float) $item['packs'], 3);
                $packPrice = (int) $item['pack_price'];
                $qty = round($packs * $ingredient->pack_size, 3);
                $subtotal = (int) round($packs * $packPrice);

                $purchase->items()->create([
                    'ingredient_id' => $ingredient->id,
                    'packs' => $packs,
                    'pack_price' => $packPrice,
                    'pack_size' => $ingredient->pack_size,
                    'qty' => $qty,
                    'subtotal' => $subtotal,
                ]);

                $this->stock->record($ingredient, StockMovementType::Purchase, $qty, $actor, [
                    'unit_cost' => $ingredient->pack_size > 0 ? round($packPrice / $ingredient->pack_size, 4) : null,
                    'reference' => "Belanja #{$purchase->id}",
                    'stock_purchase_id' => $purchase->id,
                    'note' => $purchase->supplier,
                ]);

                // Harga kemasan mengikuti belanja terbaru.
                Ingredient::withoutGlobalScopes()->whereKey($ingredient->id)->update(['pack_price' => $packPrice]);

                $total += $subtotal;
                $labels[] = $ingredient->name.' ×'.Qty::text($packs);
                $kinds[$ingredient->kind->value] = true;
            }

            $purchase->update(['total' => $total]);

            if ($total > 0) {
                CashEntry::create([
                    'outlet_id' => $outletId,
                    'date' => $purchase->date->toDateString(),
                    'type' => CashEntryType::Expense,
                    'category' => array_keys($kinds) === [IngredientKind::Kemasan->value] ? CashCategory::Kemasan : CashCategory::BahanBaku,
                    'description' => Str::limit('Belanja: '.implode(', ', $labels), 250),
                    'amount' => $total,
                    'method' => $method,
                    'bank' => $purchase->bank,
                    'counterparty' => $purchase->supplier,
                    'note' => $purchase->note,
                    'source' => CashEntrySource::StockPurchase,
                    'stock_purchase_id' => $purchase->id,
                    'created_by' => $actor->id,
                ]);
            }

            return $purchase;
        });
    }

    /** Batalkan belanja: hapus mutasi (stok dikembalikan) dan entri kas terkait. */
    public function delete(StockPurchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            foreach ($purchase->movements()->get() as $movement) {
                $this->stock->remove($movement);
            }

            CashEntry::withoutGlobalScopes()->where('stock_purchase_id', $purchase->id)->delete();
            $purchase->delete();
        });
    }
}
