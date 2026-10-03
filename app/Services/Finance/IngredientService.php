<?php

namespace App\Services\Finance;

use App\Enums\StockMovementType;
use App\Models\Ingredient;
use App\Models\RecipeItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class IngredientService
{
    public function __construct(private readonly StockService $stock) {}

    /** @param array<string, mixed> $data */
    public function create(int $outletId, array $data, User $actor): Ingredient
    {
        return DB::transaction(function () use ($outletId, $data, $actor) {
            $ingredient = Ingredient::create(collect($data)->except('opening_stock', 'outlet_id')->all() + ['outlet_id' => $outletId]);

            $opening = (float) ($data['opening_stock'] ?? 0);
            if ($opening != 0) {
                $this->stock->record($ingredient, StockMovementType::Opening, $opening, $actor, [
                    'unit_cost' => $ingredient->costPerUnit(),
                    'note' => 'Stok awal',
                ]);
            }

            return $ingredient->refresh();
        });
    }

    /** @param array<string, mixed> $data */
    public function update(Ingredient $ingredient, array $data): Ingredient
    {
        $ingredient->update(collect($data)->except('opening_stock', 'outlet_id')->all());

        return $ingredient->refresh();
    }

    /** Hapus (soft delete) bahan beserta baris resep yang memakainya. */
    public function delete(Ingredient $ingredient): void
    {
        DB::transaction(function () use ($ingredient) {
            RecipeItem::query()->where('ingredient_id', $ingredient->id)->delete();
            $ingredient->delete();
        });
    }
}
