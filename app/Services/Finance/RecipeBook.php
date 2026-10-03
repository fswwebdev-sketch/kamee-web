<?php

namespace App\Services\Finance;

use App\Models\Ingredient;
use App\Models\Recipe;
use Illuminate\Support\Collection;

/**
 * Seluruh resep satu outlet dalam memori, untuk pemotongan stok dan perhitungan HPP.
 *
 * Varian dicari berdasarkan nama opsi grup "Ukuran" yang dipilih pada item pesanan;
 * bila tidak ada (atau kosong) dipakai varian tanpa ukuran (option_name null).
 */
final class RecipeBook
{
    public const SIZE_GROUP = 'Ukuran';

    /** @var array<int, array<string, list<array{ingredient_id:int, qty:float, ingredient:Ingredient}>>> product_id => option key => baris */
    private array $variants = [];

    /** @var array<int, bool> */
    private array $samples = [];

    /** @var array<int, string|null> */
    private array $notes = [];

    /** @param Collection<int, Recipe> $recipes (dengan items.ingredient) */
    public function __construct(Collection $recipes)
    {
        foreach ($recipes as $recipe) {
            $this->samples[$recipe->product_id] = $recipe->is_sample;
            $this->notes[$recipe->product_id] = $recipe->note;
            foreach ($recipe->items as $item) {
                if ($item->ingredient === null) {
                    continue;
                }
                $this->variants[$recipe->product_id][self::key($item->option_name)][] = [
                    'ingredient_id' => $item->ingredient_id,
                    'qty' => $item->qty,
                    'ingredient' => $item->ingredient,
                ];
            }
        }
    }

    public static function key(?string $optionName): string
    {
        return $optionName === null ? '' : mb_strtolower(trim($optionName));
    }

    /**
     * Ambil nama opsi Ukuran dari snapshot opsi item pesanan ("Ukuran: Cup" → "Cup").
     *
     * @param  list<string>  $optionNames
     */
    public static function sizeOf(array $optionNames): ?string
    {
        foreach ($optionNames as $name) {
            if (preg_match('/^\s*'.self::SIZE_GROUP.'\s*:\s*(.+)$/iu', (string) $name, $m)) {
                return trim($m[1]);
            }
        }

        return null;
    }

    /**
     * Nama varian resep untuk item pesanan: opsi grup "Ukuran" yang dipilih; bila snapshot opsi
     * tidak memakai awalan grup, nama opsi lain yang sama dengan varian resep produk.
     *
     * @param  list<string>  $optionNames
     */
    public function sizeForItem(int $productId, array $optionNames): ?string
    {
        if (($size = self::sizeOf($optionNames)) !== null) {
            return $size;
        }

        foreach ($optionNames as $name) {
            $plain = trim((string) preg_replace('/^[^:]*:\s*/u', '', (string) $name));
            if ($plain !== '' && isset($this->variants[$productId][self::key($plain)])) {
                return $plain;
            }
        }

        return null;
    }

    public function note(int $productId): ?string
    {
        return $this->notes[$productId] ?? null;
    }

    public function isSample(int $productId): ?bool
    {
        return $this->samples[$productId] ?? null;
    }

    /** @return list<array{ingredient_id:int, qty:float, ingredient:Ingredient}> */
    public function lines(int $productId, ?string $optionName): array
    {
        return $this->variants[$productId][self::key($optionName)] ?? [];
    }

    /**
     * Varian resep yang dipakai untuk item terjual, atau null bila produk belum punya resep.
     *
     * @return list<array{ingredient_id:int, qty:float, ingredient:Ingredient}>|null
     */
    public function variantFor(int $productId, ?string $size): ?array
    {
        if ($size !== null && ($lines = $this->lines($productId, $size)) !== []) {
            return $lines;
        }

        $lines = $this->lines($productId, null);

        return $lines !== [] ? $lines : null;
    }

    /** HPP (Rp, dibulatkan) satu porsi varian; null bila belum ada resep. */
    public function hppFor(int $productId, ?string $size): ?int
    {
        $lines = $this->variantFor($productId, $size);

        return $lines === null ? null : self::hpp($lines);
    }

    /** @param list<array{qty:float, ingredient:Ingredient}> $lines */
    public static function hpp(array $lines): int
    {
        return (int) round(array_sum(array_map(fn (array $l) => round($l['qty'] * $l['ingredient']->costPerUnit(), 2), $lines)));
    }
}
