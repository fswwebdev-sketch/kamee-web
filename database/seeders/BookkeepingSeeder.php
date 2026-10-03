<?php

namespace Database\Seeders;

use App\Enums\CashCategory;
use App\Enums\CashEntrySource;
use App\Enums\IngredientKind;
use App\Enums\IngredientUnit;
use App\Enums\PaymentMethod;
use App\Models\CashEntry;
use App\Models\Ingredient;
use App\Models\Outlet;
use App\Models\Product;
use App\Models\Recipe;
use App\Models\StockPurchase;
use App\Models\User;
use App\Services\Finance\IngredientService;
use App\Services\Finance\RecipeService;
use App\Services\Finance\StockPurchaseService;
use Illuminate\Database\Seeder;

/**
 * Data awal pembukuan dari buku catatan pemilik (periode 20–29 Sep 2026).
 *
 * - Bahan & kemasan dengan harga nota 20/9/2026; stok awal = belanja 20/9 yang dicatat lewat
 *   StockPurchaseService (mutasi purchase + pengeluaran kas otomatis), sama seperti API.
 * - Pengeluaran lain & pemasukan penjualan (catatan transfer BCA/BJB & tunai) sebagai buku kas.
 * - Resep Aren Kame = resep ASLI pemilik (is_sample=false); resep lain = contoh perkiraan.
 * - Pengeluaran pribadi (kaos kaki, pilates) sengaja TIDAK dicatat atas permintaan pemilik.
 *
 * Idempoten: dijalankan ulang tidak menggandakan data dan tidak menimpa resep yang sudah ada.
 * Dijalankan SETELAH DemoOrderSeeder sehingga pesanan demo tidak memotong stok.
 */
class BookkeepingSeeder extends Seeder
{
    public const PURCHASE_DATE = '2026-09-20';

    public const PURCHASE_SUPPLIER = 'Belanja 10 hari pertama';

    private const UNDATED_NOTE = 'Tanggal & metode belum tercatat di buku';

    private const HANDWRITING_NOTE = 'Bacaan tulisan tangan, mohon cek';

    /** kunci => [nama, jenis, satuan, label kemasan, isi kemasan, harga kemasan] */
    private const INGREDIENTS = [
        'susu' => ['Susu Rich Milk Diamond', 'bahan', 'ml', '1 kotak (1 liter)', 1000, 23500],
        'kopi' => ['Kopi Klasik (blend)', 'bahan', 'gram', '1 kg', 1000, 288000],
        'amer' => ['Kopi Americano', 'bahan', 'gram', '1/2 kg', 500, 220000],
        'aren' => ['Sirup Gula Aren', 'bahan', 'gram', '1 liter (±1.000 gr – cek)', 1000, 60000],
        'creamer' => ['Creamer', 'bahan', 'gram', '1 kg', 1000, 60000],
        'bs' => ['Sirup Butterscotch', 'bahan', 'ml', '1 botol (750 ml – cek)', 750, 45000],
        'matcha' => ['Matcha', 'bahan', 'gram', '100 gram (harga belum diisi)', 100, 0],
        'cup' => ['Cup 12 oz + tutup', 'kemasan', 'pcs', '1 pcs', 1, 1000],
        'botol1L' => ['Botol 1 L + stiker', 'kemasan', 'pcs', '1 botol', 1, 3500],
        'botol250' => ['Botol 250 ml', 'kemasan', 'pcs', '1 botol (harga belum diisi)', 1, 0],
        'plastik' => ['Plastik', 'kemasan', 'pcs', '1 pak isi 65', 65, 15000],
    ];

    /** Belanja 20/9/2026: kunci bahan => [jumlah kemasan, harga per kemasan] (total 2.321.000). */
    private const PURCHASE_ITEMS = [
        'susu' => [22, 23500],
        'kopi' => [3, 288000],
        'amer' => [1, 220000],
        'aren' => [4, 60000],
        'creamer' => [4, 60000],
        'bs' => [1, 45000],
        'cup' => [110, 1000],
        'botol1L' => [20, 3500],
        'plastik' => [1, 15000],
    ];

    /** Pengeluaran lain: [keterangan, kategori, nominal, pihak terkait, catatan tambahan] (total 388.150). */
    private const OTHER_EXPENSES = [
        ['Belanja (Az)', 'bahan_baku', 304150, 'Az', null],
        ['Ongkir', 'ongkir', 22000, null, null],
        ['Kekurangan bayar (Adi)', 'lainnya', 6000, 'Adi', "Tertulis 'Adi kurang (6.000)'"],
        ['Ongkir Sukma', 'ongkir', 22000, 'Sukma', '(Umi)'],
        ['Ifa & Ikbal', 'lainnya', 34000, 'Ifa & Ikbal', '(Umi) — mohon cek keterangan'],
    ];

    /** Pemasukan penjualan: [tanggal, pihak, nominal, metode, bank, perlu dicek] (total 1.111.000). */
    private const INCOME = [
        ['2026-09-21', 'Nur', 91000, 'bank_transfer', 'BCA', false],
        ['2026-09-21', 'Arum', 17000, 'bank_transfer', 'BCA', false],
        ['2026-09-22', 'Abi', 51000, 'bank_transfer', 'BCA', false],
        ['2026-09-22', 'Rumi', 175000, 'bank_transfer', 'BCA', false],
        ['2026-09-23', 'Aa', 61000, 'bank_transfer', 'BCA', false],
        ['2026-09-24', 'Aa', 17000, 'bank_transfer', 'BCA', true],
        ['2026-09-24', 'Az', 61000, 'bank_transfer', 'BCA', false],
        ['2026-09-24', 'AG', 80000, 'bank_transfer', 'BJB', false],
        ['2026-09-20', 'Mike', 221000, 'bank_transfer', 'BJB', true],
        ['2026-09-21', 'Rifqo', 23000, 'bank_transfer', 'BJB', true],
        ['2026-09-21', 'Mudi Rafi', 33000, 'bank_transfer', 'BJB', true],
        ['2026-09-20', 'Unun', 104000, 'cash', null, false],
        ['2026-09-20', 'Camat', 177000, 'cash', null, false],
    ];

    private const AREN_KAME_NOTE = 'Resep asli pemilik. Aren, creamer, dan susu dishake/frother sampai tercampur rata, '
        .'tuang lewat saringan, tambah es batu 100 gr (cup), lalu masukkan espresso. '
        .'Kopi dalam gram biji: espresso 40 ml ≈ 20 gr (asumsi ekstraksi 1:2). Es batu tidak masuk HPP (dicatat sebagai pengeluaran).';

    private const SAMPLE_NOTE = 'Resep contoh (takaran perkiraan berbasis resep Aren Kame) — silakan sesuaikan.';

    public function __construct(
        private readonly IngredientService $ingredients,
        private readonly StockPurchaseService $purchases,
        private readonly RecipeService $recipes,
    ) {}

    public function run(): void
    {
        $outlet = Outlet::query()->where('slug', OutletSeeder::SLUG)->first() ?? Outlet::query()->orderBy('id')->first();
        $admin = User::query()->where('email', 'superadmin@kamee.id')->first();
        if ($outlet === null || $admin === null) {
            return;
        }

        $ingredients = $this->seedIngredients($outlet, $admin);
        $this->seedPurchase($outlet, $admin, $ingredients);
        $this->seedCashEntries($outlet, $admin);
        $this->seedRecipes($outlet, $admin, $ingredients);
    }

    /** @return array<string, Ingredient> */
    private function seedIngredients(Outlet $outlet, User $admin): array
    {
        $result = [];
        foreach (self::INGREDIENTS as $key => [$name, $kind, $unit, $label, $size, $price]) {
            $result[$key] = Ingredient::withoutGlobalScopes()->where('outlet_id', $outlet->id)->where('name', $name)->first()
                ?? $this->ingredients->create($outlet->id, [
                    'name' => $name,
                    'kind' => IngredientKind::from($kind),
                    'unit' => IngredientUnit::from($unit),
                    'pack_label' => $label,
                    'pack_size' => $size,
                    'pack_price' => $price,
                    'note' => $price === 0 ? 'Harga belum diisi' : null,
                ], $admin);
        }

        return $result;
    }

    /** @param array<string, Ingredient> $ingredients */
    private function seedPurchase(Outlet $outlet, User $admin, array $ingredients): void
    {
        $exists = StockPurchase::withoutGlobalScopes()->where('outlet_id', $outlet->id)
            ->whereDate('date', self::PURCHASE_DATE)->where('supplier', self::PURCHASE_SUPPLIER)->exists();

        if (! $exists) {
            $this->purchases->create($outlet->id, [
                'date' => self::PURCHASE_DATE,
                'supplier' => self::PURCHASE_SUPPLIER,
                'method' => PaymentMethod::Cash->value,
                'note' => 'Dari buku catatan; metode bayar belum tercatat',
                'items' => collect(self::PURCHASE_ITEMS)->map(fn (array $item, string $key) => [
                    'ingredient_id' => $ingredients[$key]->id,
                    'packs' => $item[0],
                    'pack_price' => $item[1],
                ])->values()->all(),
            ], $admin);
        }

        // Es batu dibeli di hari yang sama tetapi tidak dihitung per gram → pengeluaran terpisah.
        $this->entry($outlet, $admin, self::PURCHASE_DATE, CashCategory::BahanBaku, 'Es batu', 25000, PaymentMethod::Cash,
            note: 'Belanja 20/9 (dari buku catatan); tidak masuk stok/HPP');
    }

    private function seedCashEntries(Outlet $outlet, User $admin): void
    {
        foreach (self::OTHER_EXPENSES as [$description, $category, $amount, $counterparty, $extra]) {
            $this->entry($outlet, $admin, self::PURCHASE_DATE, CashCategory::from($category), $description, $amount, PaymentMethod::Cash,
                counterparty: $counterparty,
                note: $extra ? self::UNDATED_NOTE.'. '.$extra : self::UNDATED_NOTE);
        }

        foreach (self::INCOME as [$date, $counterparty, $amount, $method, $bank, $check]) {
            $this->entry($outlet, $admin, $date, CashCategory::Penjualan, "Penjualan — {$counterparty}", $amount, PaymentMethod::from($method),
                bank: $bank, counterparty: $counterparty, note: $check ? self::HANDWRITING_NOTE : null);
        }
    }

    private function entry(
        Outlet $outlet, User $admin, string $date, CashCategory $category, string $description, int $amount, PaymentMethod $method,
        ?string $bank = null, ?string $counterparty = null, ?string $note = null,
    ): void {
        $exists = CashEntry::withoutGlobalScopes()
            ->where('outlet_id', $outlet->id)
            ->whereDate('date', $date)
            ->where('category', $category->value)
            ->where('description', $description)
            ->where('amount', $amount)
            ->exists();

        if ($exists) {
            return;
        }

        CashEntry::create([
            'outlet_id' => $outlet->id,
            'date' => $date,
            'type' => $category->type(),
            'category' => $category,
            'description' => $description,
            'amount' => $amount,
            'method' => $method,
            'bank' => $bank,
            'counterparty' => $counterparty,
            'note' => $note,
            'source' => CashEntrySource::Manual,
            'created_by' => $admin->id,
        ]);
    }

    /** @param array<string, Ingredient> $ing */
    private function seedRecipes(Outlet $outlet, User $admin, array $ing): void
    {
        $cup = fn (array $lines) => $lines + ['cup' => 1];

        $americano = ['Cup' => ['amer' => 20, 'cup' => 1], 'Bottle 250 ml' => ['amer' => 25, 'botol250' => 1], 'Bottle 1 L' => ['amer' => 100, 'botol1L' => 1]];
        $latte = [
            'Cup' => ['kopi' => 20, 'susu' => 120, 'creamer' => 20, 'cup' => 1],
            'Bottle 250 ml' => ['kopi' => 25, 'susu' => 181, 'creamer' => 25, 'botol250' => 1],
            'Bottle 1 L' => ['kopi' => 100, 'susu' => 725, 'creamer' => 100, 'botol1L' => 1],
        ];
        $matcha = ['' => ['matcha' => 5, 'susu' => 150, 'cup' => 1]];
        $chocoSized = ['Cup' => ['susu' => 150, 'creamer' => 20, 'cup' => 1], 'Bottle 1 L' => ['susu' => 725, 'creamer' => 100, 'botol1L' => 1]];
        $choco = ['' => ['susu' => 150, 'creamer' => 20, 'cup' => 1]];

        // slug => [varian, contoh?, catatan]
        $recipes = [
            'aren-kame' => [[
                'Cup' => ['aren' => 30, 'creamer' => 20, 'susu' => 120, 'kopi' => 20, 'cup' => 1],
                'Bottle 250 ml' => ['aren' => 38, 'creamer' => 25, 'susu' => 181, 'kopi' => 25, 'botol250' => 1],
                'Bottle 1 L' => ['aren' => 150, 'creamer' => 100, 'susu' => 725, 'kopi' => 100, 'botol1L' => 1],
            ], false, self::AREN_KAME_NOTE],
            'americano' => [$americano, true, null],
            'kame-orangecano' => [$americano, true, null],
            'kame-manucano' => [$americano, true, null],
            'caramel-latte-kame' => [$latte, true, null],
            'pandan-latte-kame' => [$latte, true, null],
            'spanish-latte-kame' => [$latte, true, null],
            'butterscotch-sea-salt-latte' => [['' => $cup(['kopi' => 20, 'susu' => 120, 'bs' => 20, 'creamer' => 20])], true, null],
            'mont-blanc' => [['' => $cup(['kopi' => 20, 'susu' => 120, 'creamer' => 20])], true, null],
            'local-beans' => [['' => $cup(['kopi' => 15])], true, null],
            'cold-brew' => [['' => $cup(['kopi' => 20])], true, null],
            'iced-matcha-latte' => [$matcha, true, null],
            'iced-strawberry-matcha-latte' => [$matcha, true, null],
            'iced-matcha-sea-salt-cloud' => [$matcha, true, null],
            'regular-chocolate' => [$chocoSized, true, null],
            'premium-dark-chocolate' => [$chocoSized, true, null],
            'iced-chocolate-sea-salt-cloud' => [$choco, true, null],
            'iced-strawberry-choco' => [$choco, true, null],
            'iced-strawberry-choco-sea-salt-cloud' => [$choco, true, null],
        ];

        $products = Product::query()->whereIn('slug', array_keys($recipes))->with('optionGroups.options')->get()->keyBy('slug');

        foreach ($recipes as $slug => [$variants, $isSample, $note]) {
            $product = $products->get($slug);
            if ($product === null || Recipe::withoutGlobalScopes()->where('outlet_id', $outlet->id)->where('product_id', $product->id)->exists()) {
                continue;
            }

            $payload = [];
            foreach ($variants as $option => $lines) {
                $payload[] = [
                    'option_name' => $option === '' ? null : $option,
                    'items' => collect($lines)->map(fn ($qty, string $key) => ['ingredient_id' => $ing[$key]->id, 'qty' => $qty])->values()->all(),
                ];
            }

            $this->recipes->save($outlet->id, $product, $payload, $isSample, $admin, $note ?? self::SAMPLE_NOTE);
        }
    }
}
