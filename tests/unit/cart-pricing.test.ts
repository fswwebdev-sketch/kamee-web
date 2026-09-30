import { describe, expect, it } from "vitest";
import {
  MAX_LINES,
  MAX_QTY,
  buildLine,
  cartCount,
  cartSubtotal,
  clampQty,
  defaultSelection,
  estimateTotals,
  lineKey,
  mergeLine,
  normalizeNote,
  toCartOptions,
  toOrderItems,
  unitPrice,
  validateSelection,
} from "@/features/cart/pricing";
import { croissant, extraShot, groups, kopiSusu, large, oat } from "./fixtures";

describe("normalizeNote & lineKey", () => {
  it("merapikan spasi dan membatasi 200 karakter", () => {
    expect(normalizeNote("  es   dipisah \n ya ")).toBe("es dipisah ya");
    expect(normalizeNote("x".repeat(300))).toHaveLength(200);
    expect(normalizeNote(null)).toBe("");
  });

  it("identitas baris tidak bergantung urutan opsi maupun kapitalisasi catatan", () => {
    expect(lineKey(1, [5, 2], "Es Dipisah")).toBe(lineKey(1, [2, 5], "es dipisah"));
    expect(lineKey(1, [2], "")).not.toBe(lineKey(1, [5], ""));
    expect(lineKey(1, [2], "a")).not.toBe(lineKey(1, [2], "b"));
  });
});

describe("harga", () => {
  it("unitPrice = harga dasar + jumlah price_delta, tidak pernah negatif", () => {
    expect(unitPrice(22_000, [large, extraShot])).toBe(33_000);
    expect(unitPrice(10_000, [{ priceDelta: -20_000 }])).toBe(0);
  });

  it("clampQty membulatkan dan membatasi 0..MAX_QTY", () => {
    expect(clampQty(2.6)).toBe(3);
    expect(clampQty(-4)).toBe(0);
    expect(clampQty(999)).toBe(MAX_QTY);
    expect(clampQty(Number.NaN)).toBe(1);
  });

  it("subtotal & jumlah item", () => {
    const lines = [buildLine({ product: kopiSusu, options: [large], qty: 2 }), buildLine({ product: croissant, qty: 1 })];
    expect(cartCount(lines)).toBe(3);
    expect(cartSubtotal(lines)).toBe(27_000 * 2 + 18_000);
  });

  it("estimateTotals mengikuti urutan server dan tidak pernah negatif", () => {
    expect(estimateTotals({ subtotal: 100_000, discount: 10_000, pointsValue: 5_000, deliveryFee: 12_000, serviceFee: 2_000 })).toEqual({
      subtotal: 100_000, discount: 10_000, pointsValue: 5_000, deliveryFee: 12_000, serviceFee: 2_000, total: 99_000,
    });
    expect(estimateTotals({ subtotal: 20_000, discount: 50_000 }).total).toBe(0);
    expect(estimateTotals({ subtotal: 20_000, discount: -5 }).discount).toBe(0);
  });
});

describe("opsi varian", () => {
  it("defaultSelection memilih opsi pertama hanya untuk grup single wajib", () => {
    expect(defaultSelection(groups)).toEqual({ 1: [1], 2: [], 3: [] });
  });

  it("validateSelection mencerminkan aturan server", () => {
    expect(validateSelection(groups, { 1: [], 2: [], 3: [] })).toEqual({ 1: "Pilih ukuran terlebih dahulu." });
    expect(validateSelection(groups, { 1: [1], 2: [3, 4], 3: [5, 6] })).toEqual({ 2: "Pilih hanya satu gula." });
    expect(validateSelection(groups, { 1: [2], 3: [5, 6] })).toEqual({});
  });

  it("toCartOptions memetakan id terpilih ke nama grup & price delta", () => {
    expect(toCartOptions(groups, [2, 6])).toEqual([large, oat]);
  });
});

describe("buildLine & mergeLine", () => {
  it("buildLine mengurutkan opsi, menghitung harga satuan, dan qty minimal 1", () => {
    const line = buildLine({ product: kopiSusu, options: [oat, large], qty: 0, note: "  less ice " });
    expect(line.options.map((o) => o.id)).toEqual([2, 6]);
    expect(line.unitPrice).toBe(35_000);
    expect(line.qty).toBe(1);
    expect(line.note).toBe("less ice");
  });

  it("baris identik digabung dan qty dibatasi MAX_QTY", () => {
    const a = buildLine({ product: kopiSusu, options: [large], qty: 30 });
    const b = buildLine({ product: kopiSusu, options: [large], qty: 30 });
    const merged = mergeLine([a], b);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.qty).toBe(MAX_QTY);
  });

  it("opsi atau catatan berbeda menjadi baris terpisah", () => {
    const base = buildLine({ product: kopiSusu });
    let lines = mergeLine([base], buildLine({ product: kopiSusu, options: [large] }));
    lines = mergeLine(lines, buildLine({ product: kopiSusu, note: "tanpa es" }));
    expect(lines).toHaveLength(3);
  });

  it(`menolak lebih dari ${MAX_LINES} jenis item`, () => {
    const lines = Array.from({ length: MAX_LINES }, (_, i) => buildLine({ product: { ...croissant, id: 100 + i } }));
    expect(() => mergeLine(lines, buildLine({ product: kopiSusu }))).toThrow(/Maksimal/);
  });

  it("toOrderItems menghasilkan payload API", () => {
    const lines = [buildLine({ product: kopiSusu, options: [extraShot, large], qty: 2, note: "panas" }), buildLine({ product: croissant })];
    expect(toOrderItems(lines)).toEqual([
      { product_id: 1, qty: 2, option_ids: [2, 5], note: "panas" },
      { product_id: 2, qty: 1, option_ids: [], note: null },
    ]);
  });
});
