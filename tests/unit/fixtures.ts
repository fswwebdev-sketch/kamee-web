import type { OptionGroup } from "@/types/api";
import type { AddToCartInput, CartOption } from "@/features/cart/pricing";

export const kopiSusu: AddToCartInput["product"] = { id: 1, slug: "kopi-susu-aren", name: "Kopi Susu Aren", image_url: null, base_price: 22_000 };
export const croissant: AddToCartInput["product"] = { id: 2, slug: "croissant", name: "Croissant", image_url: null, base_price: 18_000 };

export const groups: OptionGroup[] = [
  { id: 1, name: "Ukuran", type: "single", is_required: true, options: [
    { id: 1, name: "Regular", price_delta: 0, sort_order: 1 },
    { id: 2, name: "Large", price_delta: 5_000, sort_order: 2 },
  ] },
  { id: 2, name: "Gula", type: "single", is_required: false, options: [
    { id: 3, name: "Normal", price_delta: 0, sort_order: 1 },
    { id: 4, name: "Less sugar", price_delta: 0, sort_order: 2 },
  ] },
  { id: 3, name: "Topping", type: "multi", is_required: false, options: [
    { id: 5, name: "Extra shot", price_delta: 6_000, sort_order: 1 },
    { id: 6, name: "Oat milk", price_delta: 8_000, sort_order: 2 },
  ] },
];

export const large: CartOption = { id: 2, name: "Large", group: "Ukuran", priceDelta: 5_000 };
export const extraShot: CartOption = { id: 5, name: "Extra shot", group: "Topping", priceDelta: 6_000 };
export const oat: CartOption = { id: 6, name: "Oat milk", group: "Topping", priceDelta: 8_000 };
