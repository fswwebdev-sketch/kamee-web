"""
Aset PWA Kamee Coffee: ikon (any + maskable), ikon shortcut, apple-touch-icon,
dan splash screen iOS (apple-touch-startup-image) untuk ukuran iPhone umum.

    python3 scripts/generate-pwa-assets.py

Butuh Pillow. Logo digambar ulang di sini (sama dengan LogoMark di components/layout/logo.tsx).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "public"
PRIMARY = (4, 51, 139)
CREAM = (227, 234, 247)
CREMA = (42, 91, 184)
INK = (11, 27, 63)
SPLASH_BG = (244, 246, 251)  # --color-surface
SS = 4  # supersampling


def mark(size, rounded=True, pad=0.0):
    """Logo Kamee: kotak primary, cangkir cream, latte art. pad = ruang aman (maskable)."""
    W = size * SS
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle((0, 0, W - 1, W - 1), radius=int(W * 0.3), fill=PRIMARY)
    else:
        d.rectangle((0, 0, W, W), fill=PRIMARY)
    c = W / 2
    scale = 1 - pad
    r1, r2 = W * 0.275 * scale, W * 0.2 * scale
    d.ellipse((c - r1, c - r1, c + r1, c + r1), fill=CREAM)
    d.ellipse((c - r2, c - r2, c + r2, c + r2), fill=CREMA)
    # latte art: kurva hati parametrik + garis tengah
    import math
    k = r2 * 0.62 / 16
    pts = []
    for i in range(240):
        t = 2 * math.pi * i / 240
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((c + x * k, c - y * k + r2 * 0.08))
    d.polygon(pts, fill=CREAM)
    d.line((c, c - r2 * 0.36, c, c + r2 * 0.5), fill=CREMA, width=max(2, int(W * 0.012)))
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
    img = Image.new("RGB", (w, h), SPLASH_BG)
    s = int(w * 0.26)
    logo = mark(s)
    img.paste(logo, ((w - s) // 2, int(h * 0.42 - s / 2)), logo)
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(ROOT / "fonts/poppins-700.woff"), int(w * 0.075))
    text = "Kamee Coffee"
    tw = d.textlength(text, font=font)
    y = int(h * 0.42 + s / 2 + w * 0.06)
    d.text(((w - tw) / 2, y), "Kamee ", font=font, fill=INK)
    d.text(((w - tw) / 2 + d.textlength("Kamee ", font=font), y), "Coffee", font=font, fill=PRIMARY)
    small = ImageFont.truetype(str(ROOT / "fonts/inter-500.woff"), int(w * 0.034))
    tag = "Setiap cangkir, cerita baru"
    d.text(((w - d.textlength(tag, font=small)) / 2, y + int(w * 0.11)), tag, font=small, fill=(122, 101, 88))
    return img


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
    print("ikon & splash selesai")


if __name__ == "__main__":
    main()
