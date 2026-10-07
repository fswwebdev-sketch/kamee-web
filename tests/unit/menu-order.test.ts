import { describe, expect, it } from "vitest";
import { groupVariants, variantFamily } from "@/lib/menu-order";

const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe("groupVariants", () => {
  it("menempatkan varian reguler/premium berdekatan sesuai abjad, di posisi anggota pertama", () => {
    const list = [
      { name: "Americano" },
      { name: "Aren Kame Reguler" },
      { name: "Reguler Chocolate" },
      { name: "Aren Kame Premium" },
      { name: "Premium Dark Chocolate" },
      { name: "Americano Specialty Blend" },
      { name: "Mont Blanc" },
    ];
    expect(names(groupVariants(list))).toEqual([
      "Americano",
      "Americano Specialty Blend",
      "Aren Kame Premium",
      "Aren Kame Reguler",
      "Premium Dark Chocolate",
      "Reguler Chocolate",
      "Mont Blanc",
    ]);
  });

  it("menu tanpa varian tidak berubah urutan", () => {
    const list = [{ name: "Kame Manucano" }, { name: "Caramel Latte Kame" }, { name: "Cold Brew" }];
    expect(names(groupVariants(list))).toEqual(names(list));
    expect(variantFamily("Aren Sea Salt Kame")).toBe("aren sea salt kame");
  });
});
