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
 * Data awal pembukuan dari buku catatan pemilik & ekspor Kasir Kamee (periode 20 Sep–2 Okt 2026).
 *
 * - Bahan & kemasan dengan harga nota 20/9/2026; stok awal = belanja 20/9 yang dicatat lewat
 *   StockPurchaseService (mutasi purchase + pengeluaran kas otomatis), sama seperti API.
 * - Pengeluaran lain dari buku tulis sebagai buku kas.
 * - Penjualan 20/9–2/10 & pengeluaran 21/9–1/10 dari ekspor Kasir Kamee (Excel) — menggantikan
 *   catatan pemasukan buku tulis (transfer BCA/BJB & tunai) agar tidak dobel.
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

    /**
     * Penjualan dari ekspor Kasir Kamee (Kasir_Kamee_Keuangan.xlsx, 20 Sep–2 Okt 2026; 34 transaksi, total 3.193.000).
     * Menggantikan catatan transfer/tunai buku tulis agar penjualan tidak tercatat dua kali.
     * Metode bayar diambil dari buku tulis bila tanggal & nominal cocok; selain itu ditandai belum tercatat.
     * [tanggal, jam, pelanggan, item, nominal, metode, bank, catatan]
     */
    private const SALES = [
        ['2026-09-20', '13:24', 'Tante Ike', 'Caramel Latte Kame x1; Spanish Latte Kame x1; Aren Kame x11', 221000, 'bank_transfer', 'BJB', 'Take Away; Catatan: 8000 gojek; cocok dgn buku tulis (Mike)'],
        ['2026-09-20', '13:26', 'Tante Unnun', 'Aren Kame x2; Americano x2; Butterscotch Sea Salt Latte x1; Caramel Latte Kame x1', 104000, 'cash', null, 'Dine In; cocok dgn buku tulis (Unun)'],
        ['2026-09-21', '11:57', 'Guru Sukma', 'Aren Kame x2; Kame Orangecano x1; Iced Matche Latte x1', 73000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-21', '13:20', 'Bu Tini', 'Aren Kame x6; Iced Strawberry Choco x1', 125000, 'cash', null, 'Online; Ket: SD Neglasari 1; metode bayar belum tercatat'],
        ['2026-09-21', '13:21', 'Mimih Nur', 'Aden Kame 1ltr x1; Kame Manucano x1', 91000, 'bank_transfer', 'BCA', 'Dine In; Ket: SD Sukma; cocok dgn buku tulis (Nur)'],
        ['2026-09-22', '13:48', 'Siska, Delia, Amira', 'Aren Kame x3', 51000, 'bank_transfer', 'BCA', 'Take Away; cocok dgn buku tulis (Abi)'],
        ['2026-09-22', '13:53', 'Guru taman', 'Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1; Aren Kame x1', 57000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-22', '14:02', 'Pesanan By Abi', 'Dark Chocolate 1L x1; Spanis Latte Kame 1L x1', 175000, 'bank_transfer', 'BCA', 'Take Away; cocok dgn buku tulis (Rumi)'],
        ['2026-09-22', '14:03', 'Pesanan By Abi', 'Butterscotch Sea Salt Latte x1', 23000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-22', '14:04', 'Pesanan By Umi', 'Aren Kame 1L x1', 75000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-23', '14:44', 'Pesanan Abi', 'Butterscotch Sea Salt Latte x2; Aren Kame x1', 63000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-24', '14:45', 'Pesanan by Umi', 'Aren Kame x4; Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1', 108000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-24', '14:47', 'Aa Robi', 'Aren Kame 1L x1', 75000, 'cash', null, 'Online; metode bayar belum tercatat'],
        ['2026-09-24', '14:48', 'Kak Wiwi Pramuka', 'Kame Manucano x1; Strawberry Matcha Latte x1', 41000, 'cash', null, 'Online; metode bayar belum tercatat'],
        ['2026-09-24', '18:30', 'Mamah Lia', 'Aren Kame x2', 34000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-24', '22:56', 'Pesanan By Umi', 'Aren Kame x4; Pandan Latte Kame x1; Butterscotch Sea Salt Latte x1', 108000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-25', '18:19', 'Guru delta', 'Aren Kame 1L x1; Caramel Latte Kame x1; Aren Kame x2; Butterscotch Sea Salt Latte x1; Kame Manucano x1; Pandan Latte Kame x1', 182000, 'cash', null, 'Online; Catatan: +gojek 17k; metode bayar belum tercatat'],
        ['2026-09-25', '18:20', 'Bang Opick', 'Americano 1L x1; Pandan Latte Kame x1; Spanish Latte Kame x1', 94000, 'cash', null, 'Online; metode bayar belum tercatat'],
        ['2026-09-25', '18:21', 'Sa’id', 'Aren Kame x2; Kame Manucano x1', 50000, 'cash', null, 'Dine In; metode bayar belum tercatat'],
        ['2026-09-25', '18:21', 'Pesanan by Umi', 'Iced Matche Latte x1; Aren Kame x1', 40000, 'cash', null, 'Online; metode bayar belum tercatat'],
        ['2026-09-26', '21:45', 'guru sd taman', 'Aren Kame x3; Butterscotch Sea Salt Latte x1; Dari Chocolate x1; Pandan Latte Kame x1', 116000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-26', '21:47', 'Arisan Teh Indah dan Uwa Ita', 'Aren Kame x2', 34000, 'cash', null, 'Dine In; metode bayar belum tercatat'],
        ['2026-09-26', '21:47', 'A Ucu', 'Aren Kame x1; Butterscotch Sea Salt Latte x1', 40000, 'cash', null, 'Dine In; metode bayar belum tercatat'],
        ['2026-09-26', '21:48', 'Umi', 'Aren Kame x2', 34000, 'cash', null, 'Dine In; Catatan: +ongkir 17k; metode bayar belum tercatat'],
        ['2026-09-28', '18:20', 'Fauzan', 'Aren Kame 1L x1', 75000, 'cash', null, 'Online; metode bayar belum tercatat'],
        ['2026-09-29', '11:05', 'Teteh Lia', 'Caramel Latte 1lt x1', 80000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-09-29', '21:51', 'Pak Camat dan Pak Sidik Sukma', 'Aren Kame 1L x2; Aren Kame x1', 167000, 'cash', null, 'Dine In; metode bayar belum tercatat'],
        ['2026-09-30', '10:51', 'Pesanan Abi', 'Butterscotch Sea Salt Latte x2; Aren Kame x1', 63000, 'cash', null, 'Dine In; metode bayar belum tercatat'],
        ['2026-10-01', '10:52', 'Pesanan Umi', 'Aren Kame x1; Iced Matche Latte x1', 40000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-10-01', '10:55', 'Nitya', 'Kame Orangecano x1; Iced Matche Latte x1; Butterscotch Sea Salt Latte x1; Aren Kame x1; Caramel Latte Kame x1', 96000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-10-01', '22:58', 'Kak Shanty', 'Aren Kame 1L x1; Cokelat Reguler 1Lt x1', 165000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-10-02', '11:02', 'Pesanan Guru Delta', 'Iced Strawberry Choco x1; Aren Kame x1; Butterscotch Sea Salt Latte x1; Aren Kame 1L x2; Kame Manucano x1', 241000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
        ['2026-10-02', '11:02', 'Bunda Adia', 'Aren Kame 1L x1; Aren Kame x1', 97000, 'cash', null, 'Dine In; metode bayar belum tercatat'],
        ['2026-10-02', '11:03', 'Pesanan Guru Taman', 'Iced Matche Latte x1; Butterscotch Sea Salt Latte x5; Pandan Latte Kame x1', 155000, 'cash', null, 'Take Away; metode bayar belum tercatat'],
    ];

    /** Pengeluaran dari ekspor Kasir Kamee (21 Sep–1 Okt 2026; total 976.520): [tanggal, keterangan, kategori, nominal]. */
    private const KASIR_EXPENSES = [
        ['2026-09-21', 'Madu Manuka beli Tiptop', 'bahan_baku', 63000],
        ['2026-09-21', 'Strawberry jam beli Alfamart', 'bahan_baku', 20900],
        ['2026-09-21', 'Es Batu Kristal', 'bahan_baku', 5000],
        ['2026-09-21', 'Susu Kental Manis Sachet beli Enci', 'bahan_baku', 10000],
        ['2026-09-21', 'Parkir tiptop', 'bahan_baku', 2000],
        ['2026-09-22', 'Es Batu', 'bahan_baku', 10000],
        ['2026-09-25', 'Susu Diamond Rich Milk beli Tiptop 12kotak', 'bahan_baku', 276300],
        ['2026-09-25', 'Whipped cream', 'bahan_baku', 27850],
        ['2026-09-25', 'Biji Kopi Vottrro arabica mandailing 1kg', 'bahan_baku', 228445],
        ['2026-09-25', 'Whipping Cream Rich Gold 500gr', 'bahan_baku', 39200],
        ['2026-09-25', 'Es Batu', 'bahan_baku', 5000],
        ['2026-10-01', 'Gula Aren', 'bahan_baku', 288825],
    ];

    private const KASIR_NOTE = 'Dari Kasir Kamee (Excel)';

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
        $admin = User::query()->where('email', config('kamee.admin_email'))->first();
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

        foreach (self::KASIR_EXPENSES as [$date, $description, $category, $amount]) {
            $this->entry($outlet, $admin, $date, CashCategory::from($category), $description, $amount, PaymentMethod::Cash,
                note: self::KASIR_NOTE.'; metode bayar belum tercatat');
        }

        foreach (self::SALES as [$date, $time, $customer, $items, $amount, $method, $bank, $note]) {
            $this->entry($outlet, $admin, $date, CashCategory::Penjualan, mb_strimwidth("Penjualan {$time} — {$customer}: {$items}", 0, 255, '…'),
                $amount, PaymentMethod::from($method), bank: $bank, counterparty: $customer, note: self::KASIR_NOTE.'. '.$note);
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

        $arenSized = [
            'Cup' => ['aren' => 30, 'creamer' => 20, 'susu' => 120, 'kopi' => 20, 'cup' => 1],
            'Bottle 250 ml' => ['aren' => 38, 'creamer' => 25, 'susu' => 181, 'kopi' => 25, 'botol250' => 1],
            'Bottle 1 L' => ['aren' => 150, 'creamer' => 100, 'susu' => 725, 'kopi' => 100, 'botol1L' => 1],
        ];

        // slug => [varian, contoh?, catatan]
        $recipes = [
            'aren-kame' => [$arenSized, false, self::AREN_KAME_NOTE],
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
            // Menu baru Okt 2026 — resep contoh.
            'americano-specialty-blend' => [$americano, true, null],
            'aren-kame-premium' => [$arenSized, true, null],
            'aren-sea-salt-kame' => [array_intersect_key($arenSized, ['Cup' => 1, 'Bottle 250 ml' => 1]), true, null],
            'butterscotch-latte-kame' => [array_map(fn (array $l) => $l + ['bs' => (int) round($l['kopi'])], $latte), true, null],
            'iced-matcha-oatmilk' => [$matcha, true, null],
            'iced-caramel-matcha-latte' => [$matcha, true, null],
            'iced-aren-matcha-latte' => [['' => ['matcha' => 5, 'susu' => 150, 'aren' => 20, 'cup' => 1]], true, null],
            'iced-espresso-matcha-latte' => [['' => ['matcha' => 5, 'susu' => 150, 'kopi' => 20, 'cup' => 1]], true, null],
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
