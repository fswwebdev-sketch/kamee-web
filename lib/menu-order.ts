/**
 * Menu bervarian (mis. "Aren Kame Reguler" & "Aren Kame Premium", "Americano" & "Americano Specialty Blend",
 * "Reguler Chocolate" & "Premium Dark Chocolate") ditempatkan berdekatan, diurutkan sesuai abjad.
 * Satu keluarga menempati posisi anggotanya yang muncul pertama (mis. yang termurah); menu lain tidak berubah urutan.
 */
const VARIANT_WORDS = /\b(reguler|regular|premium|specialty|special|spesial|blend|dark)\b/g;

export function variantFamily(name: string): string {
  return name.toLowerCase().replace(VARIANT_WORDS, " ").replace(/\s+/g, " ").trim();
}

export function groupVariants<T extends { name: string }>(items: T[]): T[] {
  const first = new Map<string, number>();
  items.forEach((p, i) => {
    const key = variantFamily(p.name);
    if (!first.has(key)) first.set(key, i);
  });
  return items
    .map((p) => ({ p, pos: first.get(variantFamily(p.name))! }))
    .sort((a, b) => a.pos - b.pos || a.p.name.localeCompare(b.p.name, "id"))
    .map((x) => x.p);
}
