<?php

namespace Database\Seeders;

use App\Enums\OptionGroupType;
use App\Models\Category;
use App\Models\OptionGroup;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $groups = $this->optionGroups();

        $drink = [$groups['Ukuran'], $groups['Gula'], $groups['Es'], $groups['Topping']];
        $tea = [$groups['Ukuran'], $groups['Gula'], $groups['Es']];

        $catalog = [
            ['Coffee', 'coffee', $drink, [
                ['Americano', 18000, 'Espresso dan air panas, bersih dan bold.', 'Espresso double shot, air', 10],
                ['Cafe Latte', 25000, 'Espresso lembut dengan susu segar.', 'Espresso, susu segar', 190],
                ['Cappuccino', 25000, 'Seimbang antara espresso, susu, dan foam tebal.', 'Espresso, susu segar, milk foam', 130],
                ['Es Kopi Susu Kamee', 22000, 'Kopi susu andalan dengan gula aren khas Kamee.', 'Espresso, susu segar, gula aren', 210, true, true],
                ['Kopi Susu Aren', 24000, 'Manis legit gula aren Banten.', 'Espresso, susu, gula aren', 230, false, true],
                ['Caramel Macchiato', 30000, 'Vanilla, susu, espresso, dan saus karamel.', 'Espresso, susu, sirup vanilla, karamel', 250],
                ['Vietnamese Drip', 22000, 'Robusta pekat dengan susu kental manis.', 'Robusta, susu kental manis', 180],
            ]],
            ['Non Coffee', 'non-coffee', $drink, [
                ['Chocolate', 25000, 'Cokelat premium yang creamy.', 'Cokelat bubuk, susu segar', 280, false, true],
                ['Matcha Latte', 28000, 'Matcha Jepang dengan susu segar.', 'Matcha, susu segar', 200, true],
                ['Red Velvet Latte', 27000, 'Red velvet lembut dengan aroma vanilla.', 'Red velvet powder, susu', 240],
                ['Taro Latte', 26000, 'Talas ungu manis dan wangi.', 'Taro powder, susu', 230],
                ['Strawberry Milk', 25000, 'Susu segar dengan selai stroberi.', 'Susu segar, selai stroberi', 210],
            ]],
            ['Signature Drink', 'signature-drink', $drink, [
                ['Kamee Butterscotch', 32000, 'Latte butterscotch dengan sea salt cream.', 'Espresso, susu, butterscotch, sea salt cream', 290, true, true],
                ['Pandan Latte', 30000, 'Aroma pandan asli dan espresso.', 'Espresso, susu, pandan', 220, true],
                ['Klepon Latte', 30000, 'Terinspirasi kue klepon: pandan, gula merah, kelapa.', 'Espresso, susu, pandan, gula merah, kelapa', 260],
                ['Salted Caramel Cold Brew', 32000, 'Cold brew 18 jam dengan salted caramel foam.', 'Cold brew, salted caramel foam', 180],
                ['Kopi Rempah', 28000, 'Kopi hangat dengan jahe, kayu manis, dan cengkih.', 'Robusta, jahe, kayu manis, cengkih', 120],
            ]],
            ['Tea Series', 'tea-series', $tea, [
                ['Lychee Tea', 22000, 'Teh melati dengan buah leci.', 'Teh melati, leci', 120, false, true],
                ['Lemon Tea', 18000, 'Teh segar dengan perasan lemon.', 'Teh hitam, lemon', 90],
                ['Thai Tea', 22000, 'Teh Thailand creamy.', 'Thai tea, susu', 230],
                ['Peach Oolong', 24000, 'Oolong wangi dengan persik.', 'Teh oolong, persik', 110],
            ]],
            ['Snack', 'snack', [], [
                ['Croissant Butter', 22000, 'Croissant renyah berlapis mentega.', 'Tepung, mentega', 280],
                ['Pisang Goreng Keju', 20000, 'Pisang goreng krispi dengan parutan keju.', 'Pisang, keju, susu kental manis', 350, false, true],
                ['Kentang Goreng', 20000, 'French fries dengan saus sambal dan mayo.', 'Kentang, saus', 320],
                ['Roti Bakar Cokelat', 22000, 'Roti bakar mentega dengan meses cokelat.', 'Roti, mentega, meses', 380],
                ['Cireng Rujak', 18000, 'Cireng kenyal dengan bumbu rujak.', 'Tepung tapioka, bumbu rujak', 300],
            ]],
            ['Dessert', 'dessert', [], [
                ['Tiramisu Cup', 32000, 'Tiramisu lembut dengan espresso Kamee.', 'Mascarpone, ladyfinger, espresso', 360, true],
                ['Fudgy Brownies', 22000, 'Brownies cokelat padat dan lembap.', 'Cokelat, mentega, telur', 380],
                ['Cheesecake', 30000, 'Baked cheesecake dengan saus berry.', 'Cream cheese, biskuit, berry', 340],
                ['Affogato', 28000, 'Es krim vanilla disiram espresso.', 'Es krim vanilla, espresso', 210],
            ]],
        ];

        foreach ($catalog as $sort => [$name, $slug, $productGroups, $products]) {
            $category = Category::updateOrCreate(['slug' => $slug], [
                'name' => $name, 'icon' => $slug, 'sort_order' => $sort + 1, 'is_active' => true,
            ]);

            foreach ($products as $row) {
                [$pName, $price, $short, $composition, $calories, $featured, $best] = array_pad($row, 7, false);

                $product = Product::updateOrCreate(['slug' => Str::slug($pName)], [
                    'category_id' => $category->id,
                    'name' => $pName,
                    'short_description' => $short,
                    'description' => "{$short} Dibuat fresh setiap pesanan oleh barista Kamee Coffee menggunakan biji kopi pilihan dari petani lokal.",
                    'composition' => $composition,
                    'calories' => $calories,
                    'base_price' => $price,
                    'image' => 'https://placehold.co/600x600/png?text='.rawurlencode($pName),
                    'is_featured' => $featured,
                    'is_best_seller' => $best,
                    'is_active' => true,
                ]);

                $product->optionGroups()->sync(collect($productGroups)->mapWithKeys(fn ($g, $i) => [$g->id => ['sort_order' => $i]])->all());

                if ($product->images()->doesntExist()) {
                    foreach ([1, 2] as $n) {
                        $product->images()->create([
                            'path' => 'https://placehold.co/1200x900/png?text='.rawurlencode("{$pName} {$n}"),
                            'alt' => "{$pName} foto {$n}",
                            'sort_order' => $n,
                        ]);
                    }
                }
            }
        }
    }

    /** @return array<string, OptionGroup> */
    private function optionGroups(): array
    {
        $definitions = [
            'Ukuran' => [OptionGroupType::Single, true, [['Regular', 0], ['Large', 5000]]],
            'Gula' => [OptionGroupType::Single, true, [['Normal', 0], ['Less Sugar', 0], ['Tanpa Gula', 0]]],
            'Es' => [OptionGroupType::Single, true, [['Normal Ice', 0], ['Less Ice', 0], ['Tanpa Es', 0], ['Panas', 0]]],
            'Topping' => [OptionGroupType::Multi, false, [['Extra Shot', 6000], ['Boba', 5000], ['Cheese Foam', 7000], ['Oat Milk', 8000], ['Whipped Cream', 4000]]],
        ];

        $groups = [];
        foreach ($definitions as $name => [$type, $required, $options]) {
            $group = OptionGroup::updateOrCreate(['name' => $name], ['type' => $type, 'is_required' => $required]);
            foreach ($options as $i => [$optName, $delta]) {
                $group->options()->updateOrCreate(['name' => $optName], ['price_delta' => $delta, 'sort_order' => $i]);
            }
            $groups[$name] = $group->load('options');
        }

        return $groups;
    }
}
