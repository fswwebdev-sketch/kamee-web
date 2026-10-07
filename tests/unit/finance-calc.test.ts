import { describe, expect, it } from "vitest";
import {
  computeVariant,
  costPerUnit,
  findRecipeVariant,
  markupOf,
  matchSizeOption,
  stockUsageForOrder,
  suggestPrice,
  type CalcIngredient,
} from "@/lib/admin/finance-calc";

/** Bahan dari nota 20/9/2026 (stok awal = jumlah belanja). */
const ING: CalcIngredient[] = [
  { id: 1, name: "Susu Rich Milk Diamond", unit: "ml", cost_per_unit: costPerUnit(23500, 1000), stock_qty: 22000 },
  { id: 2, name: "Kopi Klasik (blend)", unit: "gram", cost_per_unit: costPerUnit(288000, 1000), stock_qty: 3000 },
  { id: 4, name: "Sirup Gula Aren", unit: "gram", cost_per_unit: costPerUnit(60000, 1000), stock_qty: 4000 },
  { id: 5, name: "Creamer", unit: "gram", cost_per_unit: costPerUnit(60000, 1000), stock_qty: 4000 },
  { id: 8, name: "Cup 12 oz + tutup", unit: "pcs", cost_per_unit: costPerUnit(1000, 1), stock_qty: 110 },
  { id: 10, name: "Botol 250 ml", unit: "pcs", cost_per_unit: costPerUnit(0, 1), stock_qty: 0 },
];

const AREN_CUP = [
  { ingredient_id: 4, qty: 30 },
  { ingredient_id: 5, qty: 20 },
  { ingredient_id: 1, qty: 120 },
  { ingredient_id: 2, qty: 20 },
  { ingredient_id: 8, qty: 1 },
];

describe("costPerUnit", () => {
  it("harga kemasan / isi, 2 desimal", () => {
    expect(costPerUnit(23500, 1000)).toBe(23.5);
    expect(costPerUnit(288000, 1000)).toBe(288);
    expect(costPerUnit(15000, 65)).toBe(230.77);
    expect(costPerUnit(45000, 750)).toBe(60);
  });

  it("0 bila isi kemasan tidak valid", () => {
    expect(costPerUnit(10000, 0)).toBe(0);
    expect(costPerUnit(0, 100)).toBe(0);
  });
});

describe("computeVariant", () => {
  it("Aren Kame Cup: HPP 12.580, margin 4.420 (26,0%), cukup 110 cup (pembatas cup)", () => {
    const v = computeVariant("Cup", 17000, AREN_CUP, ING);
    expect(v.items.map((i) => i.cost)).toEqual([1800, 1200, 2820, 5760, 1000]);
    expect(v.hpp).toBe(12580);
    expect(v.margin).toBe(4420);
    expect(v.margin_pct).toBe(26);
    expect(v.cups_possible).toBe(110);
    expect(v.limiting_ingredient).toBe("Cup 12 oz + tutup");
    expect(v.items[0]).toMatchObject({ ingredient_id: 4, ingredient_name: "Sirup Gula Aren", unit: "gram", qty: 30 });
  });

  it("pembatas berpindah ke kopi bila cup berlimpah", () => {
    const many = ING.map((i) => (i.id === 8 ? { ...i, stock_qty: 1000 } : i));
    const v = computeVariant("Cup", 17000, AREN_CUP, many);
    expect(v.cups_possible).toBe(133); // aren 4.000 / 30
    expect(v.limiting_ingredient).toBe("Sirup Gula Aren");
  });

  it("stok ≤ 0 → 0 porsi; tanpa item → null", () => {
    const v = computeVariant("Bottle 250 ml", 17000, [{ ingredient_id: 2, qty: 25 }, { ingredient_id: 10, qty: 1 }], ING);
    expect(v.cups_possible).toBe(0);
    expect(v.limiting_ingredient).toBe("Botol 250 ml");

    const empty = computeVariant(null, 23000, [], ING);
    expect(empty).toMatchObject({ hpp: 0, margin: 23000, margin_pct: 100, cups_possible: null, limiting_ingredient: null, items: [] });
  });

  it("harga 0 → margin_pct 0; HPP dibulatkan ke rupiah", () => {
    const v = computeVariant(null, 0, [{ ingredient_id: 1, qty: 181 }], ING); // 181 × 23,5 = 4.253,5
    expect(v.items[0]!.cost).toBe(4253.5);
    expect(v.hpp).toBe(4254);
    expect(v.margin_pct).toBe(0);
  });

  it("menerima Map dan mengabaikan bahan yang tidak dikenal", () => {
    const v = computeVariant(null, 10000, [{ ingredient_id: 99, qty: 5 }, { ingredient_id: 8, qty: 1 }], new Map(ING.map((i) => [i.id, i])));
    expect(v.items).toHaveLength(1);
    expect(v.hpp).toBe(1000);
    expect(v.margin_pct).toBe(90);
  });
});

describe("pencocokan varian", () => {
  const SIZES = ["Cup", "Bottle 250 ml", "Bottle 1 L"];

  it("nama opsi item dicocokkan dengan opsi grup Ukuran", () => {
    expect(matchSizeOption(["Bottle 1 L"], SIZES)).toBe("Bottle 1 L");
    expect(matchSizeOption(["Hot", " bottle 250 ML "], SIZES)).toBe("Bottle 250 ml");
    expect(matchSizeOption(["Japanese (iced)", "Washed"], SIZES)).toBeNull();
    expect(matchSizeOption(["Cup"], [])).toBeNull();
  });

  it("varian resep: cocok persis, jatuh ke varian null, atau tidak ada", () => {
    const variants = [
      { option_name: "Cup", tag: "cup" },
      { option_name: null, tag: "default" },
    ];
    expect(findRecipeVariant(variants, "Cup")?.tag).toBe("cup");
    expect(findRecipeVariant(variants, "Bottle 1 L")?.tag).toBe("default");
    expect(findRecipeVariant(variants, null)?.tag).toBe("default");
    expect(findRecipeVariant([{ option_name: "Cup" }], "Bottle 1 L")).toBeUndefined();
  });
});

describe("stockUsageForOrder", () => {
  const recipes = {
    5: {
      variants: [
        { option_name: "Cup", items: AREN_CUP },
        { option_name: "Bottle 1 L", items: [{ ingredient_id: 4, qty: 150 }, { ingredient_id: 1, qty: 725 }] },
      ],
    },
    8: { variants: [{ option_name: null, items: [{ ingredient_id: 2, qty: 20 }, { ingredient_id: 8, qty: 1 }] }] },
  };
  const sizes = (pid: number) => (pid === 5 ? ["Cup", "Bottle 250 ml", "Bottle 1 L"] : []);

  it("menjumlahkan pemakaian per bahan × qty item", () => {
    const usage = stockUsageForOrder(
      [
        { product_id: 5, qty: 2, options: [{ name: "Cup" }] },
        { product_id: 5, qty: 1, options: [{ name: "Bottle 1 L" }] },
        { product_id: 8, qty: 1, options: [] },
      ],
      recipes,
      sizes,
    );
    expect(Object.fromEntries(usage)).toEqual({ 4: 60 + 150, 5: 40, 1: 240 + 725, 2: 40 + 20, 8: 2 + 1 });
  });

  it("item tanpa resep / tanpa varian cocok / tanpa produk diabaikan", () => {
    const usage = stockUsageForOrder(
      [
        { product_id: 5, qty: 1, options: [{ name: "Bottle 250 ml" }] }, // resep belum ada untuk ukuran ini & tanpa varian null
        { product_id: 99, qty: 3 },
        { product_id: null, qty: 1 },
      ],
      recipes,
      sizes,
    );
    expect(usage.size).toBe(0);
  });
});

describe("suggestPrice & markupOf", () => {
  it("untung 200% = 3× HPP, dibulatkan ke atas ke Rp1.000", () => {
    expect(suggestPrice(7300, 200)).toBe(22000);
    expect(suggestPrice(6000, 200)).toBe(18000);
    expect(suggestPrice(6001, 200)).toBe(19000);
    expect(suggestPrice(7300, 100)).toBe(15000);
    expect(suggestPrice(7300, 200, 500)).toBe(22000);
    expect(suggestPrice(7100, 200, 500)).toBe(21500);
  });

  it("HPP 0 → tidak ada saran", () => {
    expect(suggestPrice(0, 200)).toBe(0);
    expect(markupOf(18000, 0)).toBeNull();
  });

  it("markup = (harga − HPP) / HPP", () => {
    expect(markupOf(18000, 6000)).toBe(200);
    expect(markupOf(18000, 12000)).toBe(50);
    expect(markupOf(10000, 12000)).toBe(-16.7);
  });
});
