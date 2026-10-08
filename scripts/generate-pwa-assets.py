"""
Aset PWA Kamee Coffee: ikon (any + maskable), ikon shortcut, apple-touch-icon,
dan splash screen iOS (apple-touch-startup-image) untuk ukuran iPhone umum.

    python3 scripts/generate-pwa-assets.py

Butuh Pillow. Logo dari scripts/assets/kame-symbol.png & kame-logo.png (logo resmi Kame, putih di transparan).
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent / "public"
PRIMARY = (4, 51, 139)
CREAM = (227, 234, 247)
CREMA = (42, 91, 184)
INK = (11, 27, 63)
SPLASH_BG = (244, 246, 251)  # --color-surface
SS = 4  # supersampling


ASSETS = Path(__file__).resolve().parent / "assets"


def _symbol(px, color=(255, 255, 255)):
    """Simbol Kame (">k") sebagai gambar RGBA berwarna `color`, sisi terpanjang = px."""
    m = Image.open(ASSETS / "kame-symbol.png").getchannel("A")
    k = px / max(m.size)
    m = m.resize((max(1, round(m.width * k)), max(1, round(m.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", m.size, color + (0,))
    out.putalpha(m)
    return out


def mark(size, rounded=True, pad=0.0):
    """Ikon Kame: kotak biru navy + simbol Kame putih. pad = ruang aman tambahan (maskable)."""
    W = size * SS
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, W - 1, W - 1), radius=int(W * 0.22), fill=PRIMARY)
    else:
        d.rectangle((0, 0, W, W), fill=PRIMARY)
    sym = _symbol(int(W * 0.62 * (1 - pad)))
    img.paste(sym, ((W - sym.width) // 2, (W - sym.height) // 2), sym)
    return img.resize((size, size), Image.LANCZOS)


def glyph(size, kind):
    """Ikon shortcut 96 px: menu (cangkir) / lacak (struk)."""
    W = size * SS
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, W - 1, W - 1), radius=int(W * 0.28), fill=PRIMARY)
    lw = int(W * 0.06)
    if kind == "menu":
        d.rounded_rectangle((W * .27, W * .36, W * .63, W * .74), radius=int(W * .08), outline=CREAM, width=lw)
        d.arc((W * .55, W * .44, W * .77, W * .64), -90, 90, fill=CREAM, width=lw)
        for x in (.36, .45, .54):
            d.line((W * x, W * .2, W * x, W * .29), fill=CREAM, width=lw)
    else:
        d.rounded_rectangle((W * .3, W * .2, W * .7, W * .8), radius=int(W * .05), outline=CREAM, width=lw)
        for y in (.38, .5, .62):
            d.line((W * .4, W * y, W * .6, W * y), fill=CREAM, width=lw)
    return img.resize((size, size), Image.LANCZOS)


SPLASH = [  # (lebar, tinggi, device-width, device-height, ratio)
    (1290, 2796, 430, 932, 3),  # iPhone 14 Pro Max, 15 Plus/Pro Max
    (1179, 2556, 393, 852, 3),  # iPhone 14 Pro, 15, 15 Pro
    (1284, 2778, 428, 926, 3),  # iPhone 14 Plus, 13 Pro Max
    (1170, 2532, 390, 844, 3),  # iPhone 14, 13, 12
    (1125, 2436, 375, 812, 3),  # iPhone 13 mini, 11 Pro, X/XS
    (1242, 2688, 414, 896, 3),  # iPhone 11 Pro Max, XS Max
    (828, 1792, 414, 896, 2),  # iPhone 11, XR
    (1242, 2208, 414, 736, 3),  # iPhone 8 Plus
    (750, 1334, 375, 667, 2),  # iPhone SE 2/3, 8
]


def splash(w, h):
    """Splash iOS: logo Kame lengkap (simbol + tulisan) biru navy di latar terang."""
    img = Image.new("RGB", (w, h), SPLASH_BG)
    m = Image.open(ASSETS / "kame-logo.png").getchannel("A")
    lw = int(w * 0.34)
    m = m.resize((lw, round(m.height * lw / m.width)), Image.LANCZOS)
    logo = Image.new("RGBA", m.size, PRIMARY + (0,))
    logo.putalpha(m)
    img.paste(logo, ((w - logo.width) // 2, int(h * 0.45 - logo.height / 2)), logo)
    return img


def favicon():
    """favicon.ico (16/32/48) + ikon 32 px."""
    big = mark(256)
    big.save(ROOT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    mark(32).save(ROOT / "icons" / "icon-32.png", optimize=True)


def main():
    icons = ROOT / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    for s in (192, 512):
        mark(s).save(icons / f"icon-{s}.png", optimize=True)
        # Maskable: full-bleed, isi di dalam lingkaran aman 80%
        mark(s, rounded=False, pad=0.2).save(icons / f"maskable-{s}.png", optimize=True)
    # iOS memberi sudut membulat sendiri → full-bleed tanpa transparansi
    mark(180, rounded=False, pad=0.08).convert("RGB").save(icons / "apple-touch-icon.png", optimize=True)
    glyph(96, "menu").save(icons / "shortcut-menu.png", optimize=True)
    glyph(96, "lacak").save(icons / "shortcut-lacak.png", optimize=True)
    out = ROOT / "splash"
    out.mkdir(parents=True, exist_ok=True)
    for w, h, *_ in SPLASH:
        splash(w, h).save(out / f"splash-{w}x{h}.png", optimize=True)
    favicon()
    print("ikon, favicon & splash selesai")


if __name__ == "__main__":
    main()
