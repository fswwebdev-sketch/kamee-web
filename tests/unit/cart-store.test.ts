import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_QTY } from "@/features/cart/pricing";
import { useCartStore } from "@/features/cart/store";
import { croissant, extraShot, kopiSusu, large } from "./fixtures";

const store = () => useCartStore.getState();

beforeEach(() => {
  act(() => {
    useCartStore.setState({ lines: [], outletId: null, promoCode: null, redeemPoints: 0 });
  });
});

describe("useCartStore", () => {
  it("addItem menambah baris baru dan menggabungkan item identik", () => {
    store().addItem({ product: kopiSusu, options: [large] });
    const line = store().addItem({ product: kopiSusu, options: [large], qty: 2 });
    expect(store().lines).toHaveLength(1);
    expect(line.qty).toBe(3);
    store().addItem({ product: kopiSusu, options: [large, extraShot] });
    expect(store().lines).toHaveLength(2);
  });

  it("increment/decrement; qty 0 menghapus baris", () => {
    const { lineId } = store().addItem({ product: croissant });
    store().increment(lineId);
    expect(store().lines[0]!.qty).toBe(2);
    store().decrement(lineId);
    store().decrement(lineId);
    expect(store().lines).toHaveLength(0);
  });

  it("setQty dibatasi MAX_QTY", () => {
    const { lineId } = store().addItem({ product: croissant });
    store().setQty(lineId, 500);
    expect(store().lines[0]!.qty).toBe(MAX_QTY);
  });

  it("removeItem mengembalikan baris yang bisa dipulihkan di posisi semula (undo)", () => {
    store().addItem({ product: kopiSusu });
    const { lineId } = store().addItem({ product: croissant });
    store().addItem({ product: kopiSusu, options: [large] });
    const removed = store().removeItem(lineId)!;
    expect(store().lines).toHaveLength(2);
    store().restoreItem(removed, 1);
    expect(store().lines.map((l) => l.productId)).toEqual([1, 2, 1]);
    store().restoreItem(removed, 0); // tidak menduplikasi
    expect(store().lines).toHaveLength(3);
  });

  it("setNote mengubah identitas baris dan menggabungkan jika sama dengan baris lain", () => {
    store().addItem({ product: kopiSusu, note: "less ice" });
    const { lineId } = store().addItem({ product: kopiSusu, qty: 2 });
    expect(store().lines).toHaveLength(2);
    store().setNote(lineId, "  Less   Ice ");
    expect(store().lines).toHaveLength(1);
    expect(store().lines[0]!.qty).toBe(3);
  });

  it("promo dinormalisasi, poin dibulatkan ke bawah, clear mempertahankan outlet", () => {
    store().setPromoCode(" kameehemat ");
    store().setRedeemPoints(12.9);
    store().setOutlet(2);
    store().addItem({ product: croissant });
    expect(store().promoCode).toBe("KAMEEHEMAT");
    expect(store().redeemPoints).toBe(12);
    store().clear();
    expect(store()).toMatchObject({ lines: [], promoCode: null, redeemPoints: 0, outletId: 2 });
  });

  it("disimpan ke localStorage dengan kunci kamee-cart", () => {
    store().addItem({ product: kopiSusu, options: [large], qty: 2 });
    const saved = JSON.parse(window.localStorage.getItem("kamee-cart")!);
    expect(saved.version).toBe(1);
    expect(saved.state.lines[0]).toMatchObject({ productId: 1, qty: 2, unitPrice: 27_000 });
    expect(saved.state).not.toHaveProperty("addItem");
  });
});
