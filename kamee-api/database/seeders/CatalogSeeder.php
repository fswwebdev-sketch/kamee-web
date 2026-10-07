<?php

namespace Database\Seeders;

use App\Enums\OptionGroupType;
use App\Models\Category;
use App\Models\OptionGroup;
use App\Models\Product;
use Database\Seeders\Concerns\SyncsPostgresSequences;
use Illuminate\Database\Seeder;

/**
 * Menu asli Kamee Coffee (spesifikasi bersama kamee-web & kamee-api).
 *
 * ID kategori, grup opsi, dan produk dibuat tetap agar cocok dengan data mock frontend.
 * Beberapa grup bernama sama ("Ukuran") tetapi selisih harga Bottle 1 L berbeda per menu,
 * sehingga tiap grup punya kunci internal sendiri. Rating/ulasan/terjual mulai dari 0.
 */
class CatalogSeeder extends Seeder
{
    use SyncsPostgresSequences;

    /** id, slug, nama, ikon */
    private const CATEGORIES = [
        [1, 'based-coffee', 'Based Coffee', 'coffee'],
        [2, 'manual-brew', 'Manual Brew', 'filter'],
        [3, 'non-coffee', 'Non Coffee', 'cup-soda'],
    ];

    /** kunci => [id, nama, tipe, wajib, [[opsi, selisih harga]]] — opsi pertama = default. */
    private const OPTION_GROUPS = [
        'size-americano' => [1, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 250 ml', 0], ['Bottle 1 L', 59000]]],
        'size-orangecano' => [2, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 250 ml', 0], ['Bottle 1 L', 67000]]],
        'size-manucano' => [3, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 250 ml', 0], ['Bottle 1 L', 70000]]],
        'size-latte' => [4, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 250 ml', 0], ['Bottle 1 L', 67000]]],
        'size-choco-regular' => [5, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 1 L', 67000]]],
        'size-choco-premium' => [6, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 1 L', 95000]]],
        'brew-style' => [7, 'Penyajian', 'single', true, [['Hot', 0], ['Japanese (iced)', 0]]],
        'bean-process' => [8, 'Proses Biji', 'single', true, [['Natural', 0], ['Washed', 0], ['Honey', 0]]],
        'size-specialty' => [9, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 250 ml', 0], ['Bottle 1 L', 99000]]],
        'size-aren-premium' => [10, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 250 ml', 0], ['Bottle 1 L', 78000]]],
        'size-cup-250' => [11, 'Ukuran', 'single', true, [['Cup', 0], ['Bottle 250 ml', 0]]],
    ];

    /**
     * id, slug, nama, kategori, harga, grup opsi, best seller, featured, hanya akhir pekan, deskripsi singkat.
     * Harga sesuai daftar menu outlet (Okt 2026). Produk 20+ = menu baru; ID lama tetap agar URL & data lama aman.
     */
    private const PRODUCTS = [
        [1, 'americano', 'Americano', 'based-coffee', 16000, ['size-americano'], false, false, false, 'Espresso dan air — bersih, ringan, tanpa susu.'],
        [2, 'kame-orangecano', 'Kame Orangecano', 'based-coffee', 18000, ['size-orangecano'], false, true, false, 'Americano dengan sentuhan jeruk yang segar.'],
        [3, 'kame-manucano', 'Kame Manucano', 'based-coffee', 20000, ['size-manucano'], true, true, false, 'Iced Americano with Manuka Honey.'],
        [4, 'caramel-latte-kame', 'Caramel Latte Kame', 'based-coffee', 18000, ['size-latte'], false, false, false, 'Latte susu dengan karamel.'],
        [5, 'aren-kame', 'Aren Kame Reguler', 'based-coffee', 18000, ['size-latte'], true, true, false, 'Kopi susu gula aren — with 50% Arabica + 50% Robusta.'],
        [6, 'pandan-latte-kame', 'Pandan Latte Kame', 'based-coffee', 18000, ['size-latte'], true, true, false, 'Latte dengan aroma pandan.'],
        [7, 'spanish-latte-kame', 'Spanish Latte Kame', 'based-coffee', 18000, ['size-latte'], true, true, false, 'Latte manis dengan susu kental.'],
        [8, 'butterscotch-sea-salt-latte', 'Butterscotch Sea Salt Latte', 'based-coffee', 26000, [], false, false, false, 'Latte butterscotch dengan sea salt.'],
        [9, 'mont-blanc', 'Mont Blanc', 'based-coffee', 35000, [], true, false, true, 'Menu spesial — hanya tersedia hari Sabtu.'],
        [10, 'local-beans', 'Local Beans', 'manual-brew', 26000, ['brew-style', 'bean-process'], false, false, false, 'Manual brew biji kopi lokal — Hot atau Japanese, proses Natural, Washed, atau Honey.'],
        [11, 'cold-brew', 'Cold Brew', 'manual-brew', 30000, [], false, false, true, 'Slowly steeped in cold water to create a smooth, mellow cup with subtle sweetness and a clean finish. Hanya hari Sabtu.'],
        [12, 'iced-matcha-latte', 'Iced Matcha Latte', 'non-coffee', 23000, [], true, false, false, 'Matcha dengan susu dingin.'],
        [13, 'iced-strawberry-matcha-latte', 'Iced Strawberry Matcha Latte', 'non-coffee', 26000, [], true, false, false, 'Matcha latte dengan stroberi.'],
        [14, 'iced-matcha-sea-salt-cloud', 'Iced Matcha Sea Salt Cloud', 'non-coffee', 25000, [], false, false, false, 'Matcha dengan lapisan sea salt cream.'],
        [15, 'regular-chocolate', 'Reguler Chocolate', 'non-coffee', 18000, ['size-choco-regular'], false, false, false, 'Cokelat susu klasik. Tersedia juga ukuran 1 L.'],
        [16, 'premium-dark-chocolate', 'Premium Dark Chocolate', 'non-coffee', 25000, ['size-choco-premium'], true, false, false, 'Dark chocolate yang lebih pekat. Tersedia juga ukuran 1 L.'],
        [17, 'iced-chocolate-sea-salt-cloud', 'Iced Chocolate Sea Salt Cloud', 'non-coffee', 25000, [], false, false, false, 'Cokelat dingin dengan lapisan sea salt cream.'],
        [18, 'iced-strawberry-choco', 'Iced Strawberry Choco', 'non-coffee', 23000, [], false, false, false, 'Cokelat dingin dengan stroberi.'],
        [19, 'iced-strawberry-choco-sea-salt-cloud', 'Iced Strawberry Choco Sea Salt Cloud', 'non-coffee', 26000, [], false, false, false, 'Strawberry choco dengan lapisan sea salt cream.'],
        [20, 'americano-specialty-blend', 'Americano Specialty Blend', 'based-coffee', 26000, ['size-specialty'], true, false, false, 'Blend Arabica Colombia & Arabica Brazil Santos.'],
        [21, 'aren-kame-premium', 'Aren Kame Premium', 'based-coffee', 22000, ['size-aren-premium'], true, false, false, 'Kopi susu gula aren — with 100% Arabica Mandhailing.'],
        [22, 'aren-sea-salt-kame', 'Aren Sea Salt Kame', 'based-coffee', 22000, ['size-cup-250'], false, false, false, 'Kopi susu gula aren dengan lapisan sea salt cream.'],
        [23, 'butterscotch-latte-kame', 'Butterscotch Latte Kame', 'based-coffee', 18000, ['size-latte'], false, false, false, 'Latte susu dengan butterscotch.'],
        [24, 'iced-matcha-oatmilk', 'Iced Matcha Oatmilk', 'non-coffee', 25000, [], false, false, false, 'Matcha dengan oat milk dingin.'],
        [25, 'iced-caramel-matcha-latte', 'Iced Caramel Matcha Latte', 'non-coffee', 25000, [], false, false, false, 'Matcha latte dengan karamel.'],
        [26, 'iced-aren-matcha-latte', 'Iced Aren Matcha Latte', 'non-coffee', 25000, [], false, false, false, 'Matcha latte dengan gula aren.'],
        [27, 'iced-espresso-matcha-latte', 'Iced Espresso Matcha Latte', 'non-coffee', 25000, [], false, false, false, 'Matcha latte dengan shot espresso.'],
    ];

    /**
     * Galeri menu yang sudah punya foto asli (public/images/products kamee-web): slug => [[file, ukuran]].
     * Foto pertama = foto utama. Ukuran (mis. "Bottle 1 L") ditulis di alt dan tampil sebagai label di galeri.
     * Americano: foto asli hanya botol 1 L, jadi foto utama tetap ilustrasi cup.
     */
    private const PHOTOS = [
        'americano' => [['americano', null], ['americano-foto', 'Bottle 1 L'], ['americano-foto-2', 'Bottle 1 L']],
        'mont-blanc' => [['mont-blanc-foto', null], ['mont-blanc-foto-2', null], ['mont-blanc-foto-3', null]],
        'aren-kame' => [['aren-kame-cup', 'Cup'], ['aren-kame-foto-2', 'Bottle 1 L'], ['aren-kame-foto', 'Cup']],
        'aren-kame-premium' => [['aren-kame-cup', 'Cup'], ['aren-kame-cup-dekat', 'Cup'], ['aren-kame-foto-2', 'Bottle 1 L']],
        'butterscotch-sea-salt-latte' => [['butterscotch-sea-salt-latte-foto', null], ['butterscotch-sea-salt-latte-foto-2', null], ['butterscotch-sea-salt-latte-foto-3', null]],
    ];

    private const WEEKEND_NOTE = 'Hanya tersedia hari Sabtu.';

    public function run(): void
    {
        $categories = [];
        foreach (self::CATEGORIES as $sort => [$id, $slug, $name, $icon]) {
            $categories[$slug] = Category::unguarded(fn () => Category::updateOrCreate(['id' => $id], [
                'slug' => $slug, 'name' => $name, 'icon' => $icon, 'sort_order' => $sort + 1, 'is_active' => true,
            ]));
        }

        $groups = $this->optionGroups();

        foreach (self::PRODUCTS as [$id, $slug, $name, $category, $price, $groupKeys, $bestSeller, $featured, $weekendOnly, $short]) {
            $gallery = self::PHOTOS[$slug] ?? [[$slug, null], ["{$slug}-2", null], ["{$slug}-3", null]];
            $description = $weekendOnly && ! str_contains($short, 'Sabtu') ? "{$short} ".self::WEEKEND_NOTE : $short;

            $product = Product::unguarded(fn () => Product::updateOrCreate(['id' => $id], [
                'slug' => $slug,
                'category_id' => $categories[$category]->id,
                'name' => $name,
                'short_description' => $short,
                'description' => $description,
                'composition' => null,
                'calories' => null,
                'base_price' => $price,
                // Ilustrasi bawaan situs web (public/images/products) — ganti dengan foto asli lewat admin.
                'image' => "/images/products/{$gallery[0][0]}.avif",
                'rating_avg' => 0,
                'review_count' => 0,
                'sold_count' => 0,
                'is_featured' => $featured,
                'is_best_seller' => $bestSeller,
                'is_active' => true,
            ]));

            $product->optionGroups()->sync(
                collect($groupKeys)->mapWithKeys(fn (string $key, int $i) => [$groups[$key]->id => ['sort_order' => $i]])->all()
            );

            if ($product->images()->doesntExist()) {
                foreach ($gallery as $i => [$file, $size]) {
                    $product->images()->create([
                        'path' => "/images/products/{$file}.avif",
                        'alt' => ($size ? "{$name} {$size}" : $name).' — Kamee Coffee',
                        'sort_order' => $i + 1,
                    ]);
                }
            }
        }

        $this->syncPostgresSequences('categories', 'option_groups', 'products');
    }

    /** @return array<string, OptionGroup> */
    private function optionGroups(): array
    {
        $groups = [];
        foreach (self::OPTION_GROUPS as $key => [$id, $name, $type, $required, $options]) {
            $group = OptionGroup::unguarded(fn () => OptionGroup::updateOrCreate(['id' => $id], [
                'name' => $name, 'type' => OptionGroupType::from($type), 'is_required' => $required,
            ]));

            foreach ($options as $i => [$optName, $delta]) {
                $group->options()->updateOrCreate(['name' => $optName], ['price_delta' => $delta, 'sort_order' => $i]);
            }

            $groups[$key] = $group;
        }

        return $groups;
    }
}
