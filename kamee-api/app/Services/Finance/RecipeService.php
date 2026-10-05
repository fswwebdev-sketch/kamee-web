<?php

namespace App\Services\Finance;

use App\Exceptions\BusinessException;
use App\Models\Ingredient;
use App\Models\Option;
use App\Models\OptionGroup;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\User;
use App\Support\Media;
use App\Support\Qty;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Resep & HPP per produk (per outlet). */
class RecipeService
{
    public function book(int $outletId): RecipeBook
    {
        return new RecipeBook($this->recipes($outletId));
    }

    /** @return list<array<string, mixed>> ProductRecipe[] semua produk aktif, urut kategori lalu nama. */
    public function list(int $outletId): array
    {
        $products = Product::query()
            ->active()
            ->with(['category', 'optionGroups.options'])
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->orderBy('categories.sort_order')
            ->orderBy('categories.name')
            ->orderBy('products.name')
            ->select('products.*')
            ->get();

        $book = $this->book($outletId);

        return $products->map(fn (Product $p) => $this->present($p, $book))->values()->all();
    }

    /** @return array<string, mixed> ProductRecipe */
    public function show(int $outletId, Product $product): array
    {
        $product->loadMissing(['category', 'optionGroups.options']);

        return $this->present($product, $this->book($outletId));
    }

    /**
     * Ganti seluruh resep produk di outlet.
     *
     * @param  list<array{option_name?:string|null, items?:list<array{ingredient_id:int, qty:float|int|string}>}>  $variants
     * @param  string|false|null  $note  cara membuat; false = biarkan catatan lama
     */
    public function save(int $outletId, Product $product, array $variants, bool $isSample, ?User $actor = null, string|false|null $note = false): Recipe
    {
        $product->loadMissing('optionGroups.options');
        $sizes = $this->sizeOptions($product);
        $allowed = $sizes?->map(fn (Option $o) => RecipeBook::key($o->name))->all();

        $ingredientIds = collect($variants)->flatMap(fn ($v) => collect($v['items'] ?? [])->pluck('ingredient_id'))->map(fn ($id) => (int) $id)->unique();
        $valid = Ingredient::withoutGlobalScopes()->where('outlet_id', $outletId)->whereIn('id', $ingredientIds)->pluck('id')->all();

        $errors = [];
        $rows = [];
        foreach ($variants as $vi => $variant) {
            $optionName = isset($variant['option_name']) && trim((string) $variant['option_name']) !== '' ? trim((string) $variant['option_name']) : null;

            if ($optionName !== null) {
                if ($allowed === null) {
                    $errors["variants.{$vi}.option_name"][] = "{$product->name} tidak punya pilihan ukuran.";

                    continue;
                }
                $index = array_search(RecipeBook::key($optionName), $allowed, true);
                if ($index === false) {
                    $errors["variants.{$vi}.option_name"][] = "Ukuran \"{$optionName}\" tidak ada di {$product->name}.";

                    continue;
                }
                $optionName = $sizes->values()[$index]->name; // ejaan sesuai katalog
            }

            foreach ($variant['items'] ?? [] as $ii => $item) {
                $ingredientId = (int) $item['ingredient_id'];
                if (! in_array($ingredientId, $valid, true)) {
                    $errors["variants.{$vi}.items.{$ii}.ingredient_id"][] = 'Bahan tidak ditemukan di outlet ini.';

                    continue;
                }
                // Bahan sama dalam satu varian digabung.
                $key = RecipeBook::key($optionName).'|'.$ingredientId;
                $rows[$key] = [
                    'option_name' => $optionName,
                    'ingredient_id' => $ingredientId,
                    'qty' => round(($rows[$key]['qty'] ?? 0) + (float) $item['qty'], 3),
                ];
            }
        }

        if ($errors !== []) {
            throw new BusinessException('Resep tidak valid.', $errors);
        }

        return DB::transaction(function () use ($outletId, $product, $rows, $isSample, $actor, $note) {
            $recipe = Recipe::withoutGlobalScopes()->firstOrNew(['outlet_id' => $outletId, 'product_id' => $product->id]);
            $recipe->is_sample = $isSample;
            if ($note !== false) {
                $recipe->note = filled($note) ? trim($note) : null;
            }
            $recipe->updated_by = $actor?->id;
            $recipe->save();

            $recipe->items()->delete();
            foreach ($rows as $row) {
                $recipe->items()->create($row);
            }

            return $recipe;
        });
    }

    /** Opsi grup "Ukuran" milik produk, atau null bila produk tanpa ukuran. */
    public function sizeOptions(Product $product): ?Collection
    {
        /** @var OptionGroup|null $group */
        $group = $product->optionGroups->first(fn (OptionGroup $g) => RecipeBook::key($g->name) === RecipeBook::key(RecipeBook::SIZE_GROUP));

        return $group?->options->values();
    }

    /** @return EloquentCollection<int, Recipe> */
    private function recipes(int $outletId): EloquentCollection
    {
        return Recipe::withoutGlobalScopes()
            ->where('outlet_id', $outletId)
            ->with(['items.ingredient' => fn ($q) => $q->withoutGlobalScopes()])
            ->get();
    }

    /** @return array<string, mixed> */
    private function present(Product $product, RecipeBook $book): array
    {
        $sizes = $this->sizeOptions($product);

        /** @var list<array{0:?string, 1:int}> $variants [option_name, price] */
        $variants = $sizes === null
            ? [[null, $product->base_price]]
            : $sizes->map(fn (Option $o) => [$o->name, $product->base_price + $o->price_delta])->all();

        // Varian tanpa ukuran yang tersimpan pada produk berukuran tetap ditampilkan.
        if ($sizes !== null && $book->lines($product->id, null) !== []) {
            $variants[] = [null, $product->base_price];
        }

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'category' => $product->category?->name ?? '',
            'image_url' => Media::url($product->image),
            'is_sample' => (bool) $book->isSample($product->id),
            'note' => $book->note($product->id),
            'variants' => array_map(fn (array $v) => $this->variant($v[0], max(0, $v[1]), $book->lines($product->id, $v[0])), $variants),
        ];
    }

    /**
     * @param  list<array{ingredient_id:int, qty:float, ingredient:Ingredient}>  $lines
     * @return array<string, mixed> RecipeVariant
     */
    private function variant(?string $optionName, int $price, array $lines): array
    {
        $items = [];
        $cups = null;
        $limiting = null;

        foreach ($lines as $line) {
            $ingredient = $line['ingredient'];
            $items[] = [
                'ingredient_id' => $ingredient->id,
                'ingredient_name' => $ingredient->name,
                'unit' => $ingredient->unit->value,
                'qty' => Qty::num($line['qty']),
                'cost' => Qty::num($line['qty'] * $ingredient->costPerUnit(), 2),
            ];

            if ($line['qty'] > 0) {
                $possible = $ingredient->stock_qty <= 0 ? 0 : (int) floor(round($ingredient->stock_qty / $line['qty'], 6));
                if ($cups === null || $possible < $cups) {
                    $cups = $possible;
                    $limiting = $ingredient->name;
                }
            }
        }

        $hpp = $lines === [] ? 0 : RecipeBook::hpp($lines);
        $margin = $price - $hpp;

        return [
            'option_name' => $optionName,
            'price' => $price,
            'items' => $items,
            'hpp' => $hpp,
            'margin' => $margin,
            'margin_pct' => $price > 0 ? Qty::num($margin / $price * 100, 1) : 0,
            'cups_possible' => $items === [] ? null : $cups,
            'limiting_ingredient' => $items === [] ? null : $limiting,
        ];
    }
}
