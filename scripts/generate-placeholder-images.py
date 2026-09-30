"""
Ilustrasi placeholder Kamee Coffee (hero, produk, banner, blog, ikon).

Ganti dengan foto asli di path yang sama: rasio 1:1 untuk produk, latar cream polos,
AVIF/WebP, maks 1200 px (lihat bagian 6 spesifikasi).

    python3 scripts/generate-placeholder-images.py
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "public"
S = 2  # supersampling untuk anti-aliasing

CREAM = (245, 230, 202)
CREAM_LIGHT = (251, 244, 232)
INK = (62, 39, 35)
PRIMARY = (111, 78, 55)


def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def radial(size, inner, outer, center=None, radius=None):
    w, h = size
    cx, cy = center or (w / 2, h / 2)
    radius = radius or math.hypot(w, h) / 2
    img = Image.new("RGB", size, outer)
    px = img.load()
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            t = min(1, math.hypot(x - cx, y - cy) / radius)
            c = mix(inner, outer, t ** 1.4)
            px[x, y] = c
            if x + 1 < w:
                px[x + 1, y] = c
            if y + 1 < h:
                px[x, y + 1] = c
                if x + 1 < w:
                    px[x + 1, y + 1] = c
    return img


def noise(img, amount=6, seed=1):
    rnd = random.Random(seed)
    px = img.load()
    w, h = img.size
    for _ in range(w * h // 6):
        x, y = rnd.randrange(w), rnd.randrange(h)
        d = rnd.randint(-amount, amount)
        r, g, b = px[x, y][:3]
        px[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))
    return img


def shadow(base, box, blur, opacity=90, offset=(0, 18)):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    d.ellipse((x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]), fill=(40, 22, 15, opacity))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def bean(d, cx, cy, r, angle, color=(74, 44, 28)):
    pts = []
    for i in range(40):
        a = 2 * math.pi * i / 40
        x, y = math.cos(a) * r * 1.35, math.sin(a) * r
        ca, sa = math.cos(angle), math.sin(angle)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    d.polygon(pts, fill=color)
    ca, sa = math.cos(angle), math.sin(angle)
    d.line([(cx - r * 1.1 * ca, cy - r * 1.1 * sa), (cx + r * 1.1 * ca, cy + r * 1.1 * sa)], fill=mix(color, (20, 10, 5), .5), width=max(2, int(r / 5)))


def latte_art(d, cx, cy, r, foam, crema):
    """Rosetta sederhana: hati berlapis + batang."""
    for i, scale in enumerate([1.0, .78, .58, .4, .24]):
        rr = r * .62 * scale
        y = cy + r * .18 - i * r * .13
        color = foam if i % 2 == 0 else crema
        d.ellipse((cx - rr * 1.05, y - rr * .78, cx + rr * 1.05, y + rr * .78), fill=color)
    d.polygon([(cx - r * .06, cy - r * .55), (cx + r * .06, cy - r * .55), (cx + r * .015, cy + r * .72), (cx - r * .015, cy + r * .72)], fill=crema)


def cup_topdown(img, cx, cy, r, drink, style, seed=0):
    """Cangkir tampak atas di atas piring kecil."""
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    shadow(img, (cx - r * 1.45, cy - r * 1.45, cx + r * 1.45, cy + r * 1.45), blur=r * .18, opacity=70)
    d = ImageDraw.Draw(img)
    # piring
    d.ellipse((cx - r * 1.45, cy - r * 1.45, cx + r * 1.45, cy + r * 1.45), fill=(255, 255, 255))
    d.ellipse((cx - r * 1.3, cy - r * 1.3, cx + r * 1.3, cy + r * 1.3), fill=(246, 241, 234))
    # gagang
    d.rounded_rectangle((cx + r * .95, cy - r * .16, cx + r * 1.5, cy + r * .16), radius=r * .16, fill=(250, 250, 248))
    # cangkir
    d.ellipse((cx - r * 1.05, cy - r * 1.05, cx + r * 1.05, cy + r * 1.05), fill=(255, 255, 255))
    d.ellipse((cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9), fill=drink)
    if style == "latte":
        rim = mix(drink, (40, 20, 10), .25)
        d.ellipse((cx - r * .9, cy - r * .9, cx + r * .9, cy + r * .9), outline=rim, width=int(r * .08))
        latte_art(d, cx, cy, r * .9, foam=(250, 240, 222), crema=drink)
    elif style == "iced":
        for _ in range(6):
            a = rnd.uniform(0, 2 * math.pi)
            dist = rnd.uniform(0, r * .5)
            x, y = cx + math.cos(a) * dist, cy + math.sin(a) * dist
            s = r * rnd.uniform(.16, .24)
            d.rounded_rectangle((x - s, y - s, x + s, y + s), radius=s * .3, fill=mix(drink, (255, 255, 255), .55), outline=mix(drink, (255, 255, 255), .75), width=3)
        d.ellipse((cx - r * .22, cy - r * .22, cx + r * .22, cy + r * .22), outline=(255, 255, 255), width=int(r * .06))
    elif style == "foam":
        d.ellipse((cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8), fill=mix(drink, (255, 255, 255), .6))
        for _ in range(14):
            a, dist = rnd.uniform(0, 2 * math.pi), rnd.uniform(0, r * .6)
            s = r * rnd.uniform(.03, .07)
            x, y = cx + math.cos(a) * dist, cy + math.sin(a) * dist
            d.ellipse((x - s, y - s, x + s, y + s), fill=drink)
    elif style == "tea":
        for i in range(3):
            a = rnd.uniform(0, 2 * math.pi)
            x, y = cx + math.cos(a) * r * .35, cy + math.sin(a) * r * .35
            s = r * .22
            d.ellipse((x - s, y - s, x + s, y + s), fill=mix(drink, (255, 235, 120), .45), outline=(255, 255, 255), width=3)


def plate(img, cx, cy, r, food, kind, seed=0):
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    shadow(img, (cx - r * 1.35, cy - r * 1.35, cx + r * 1.35, cy + r * 1.35), blur=r * .16, opacity=65)
    d = ImageDraw.Draw(img)
    d.ellipse((cx - r * 1.35, cy - r * 1.35, cx + r * 1.35, cy + r * 1.35), fill=(255, 255, 255))
    d.ellipse((cx - r * 1.12, cy - r * 1.12, cx + r * 1.12, cy + r * 1.12), fill=(247, 243, 237))
    dark = mix(food, (30, 15, 5), .35)
    light = mix(food, (255, 255, 255), .35)
    if kind == "croissant":
        for i in range(5):
            t = (i - 2) / 2
            w = r * (.42 - abs(t) * .12)
            x = cx + t * r * .45
            y = cy + abs(t) ** 1.6 * r * .35
            d.ellipse((x - w * .7, y - w, x + w * .7, y + w), fill=food if i % 2 else light, outline=dark, width=4)
    elif kind == "slice":
        d.polygon([(cx - r * .7, cy + r * .5), (cx + r * .7, cy + r * .5), (cx, cy - r * .75)], fill=food)
        d.polygon([(cx - r * .7, cy + r * .5), (cx + r * .7, cy + r * .5), (cx + r * .7, cy + r * .62), (cx - r * .7, cy + r * .62)], fill=dark)
        for _ in range(3):
            x, y = cx + rnd.uniform(-.2, .2) * r, cy + rnd.uniform(-.1, .3) * r
            d.ellipse((x - r * .07, y - r * .07, x + r * .07, y + r * .07), fill=(190, 40, 60))
    elif kind == "sticks":
        for i in range(9):
            a = rnd.uniform(-.6, .6)
            x, y = cx + rnd.uniform(-.45, .45) * r, cy + rnd.uniform(-.35, .35) * r
            L, W = r * .55, r * .09
            ca, sa = math.cos(a), math.sin(a)
            pts = [(x - L * ca - W * sa, y - L * sa + W * ca), (x + L * ca - W * sa, y + L * sa + W * ca),
                   (x + L * ca + W * sa, y + L * sa - W * ca), (x - L * ca + W * sa, y - L * sa - W * ca)]
            d.polygon(pts, fill=food if i % 2 else light, outline=dark)
    elif kind == "squares":
        for i in range(4):
            x = cx + (-.33 if i % 2 == 0 else .33) * r
            y = cy + (-.3 if i < 2 else .3) * r
            s = r * .3
            d.rounded_rectangle((x - s, y - s, x + s, y + s), radius=s * .2, fill=food, outline=dark, width=4)
            d.line([(x - s * .6, y - s * .2), (x + s * .6, y - s * .2)], fill=light, width=5)
    elif kind == "balls":
        for i in range(6):
            a = 2 * math.pi * i / 6
            x, y = cx + math.cos(a) * r * .42, cy + math.sin(a) * r * .42
            s = r * .24
            d.ellipse((x - s, y - s, x + s, y + s), fill=food, outline=dark, width=3)
        d.ellipse((cx - r * .2, cy - r * .2, cx + r * .2, cy + r * .2), fill=(200, 60, 40))
    elif kind == "bowl":
        d.ellipse((cx - r * .8, cy - r * .8, cx + r * .8, cy + r * .8), fill=(255, 255, 255), outline=(230, 225, 215), width=6)
        d.ellipse((cx - r * .55, cy - r * .55, cx + r * .55, cy + r * .55), fill=light)
        d.ellipse((cx - r * .3, cy - r * .5, cx + r * .45, cy + r * .25), fill=food)


# nama → (warna, gaya, kategori minuman/makanan)
PRODUCTS = {
    "americano": ("#3B2418", "tea", "drink"),
    "cafe-latte": ("#B98A62", "latte", "drink"),
    "cappuccino": ("#A57A55", "latte", "drink"),
    "es-kopi-susu-kamee": ("#A87B55", "iced", "drink"),
    "kopi-susu-aren": ("#8C5E3C", "iced", "drink"),
    "caramel-macchiato": ("#C6925C", "latte", "drink"),
    "vietnamese-drip": ("#4A2C1C", "iced", "drink"),
    "chocolate": ("#5C3A2A", "foam", "drink"),
    "matcha-latte": ("#7FA35A", "latte", "drink"),
    "red-velvet-latte": ("#B5485A", "latte", "drink"),
    "taro-latte": ("#9C7FB8", "iced", "drink"),
    "strawberry-milk": ("#E79AAE", "iced", "drink"),
    "kamee-butterscotch": ("#C8924E", "foam", "drink"),
    "pandan-latte": ("#86A965", "iced", "drink"),
    "klepon-latte": ("#6E9A57", "foam", "drink"),
    "salted-caramel-cold-brew": ("#6B4226", "foam", "drink"),
    "kopi-rempah": ("#6E3F24", "latte", "drink"),
    "lychee-tea": ("#E3B77A", "tea", "drink"),
    "lemon-tea": ("#D9A441", "tea", "drink"),
    "thai-tea": ("#D98A45", "iced", "drink"),
    "peach-oolong": ("#E8A77C", "tea", "drink"),
    "croissant-butter": ("#D9A45A", "croissant", "food"),
    "pisang-goreng-keju": ("#E0B155", "sticks", "food"),
    "kentang-goreng": ("#E8C15E", "sticks", "food"),
    "roti-bakar-cokelat": ("#C98F55", "squares", "food"),
    "cireng-rujak": ("#EAD9B8", "balls", "food"),
    "tiramisu-cup": ("#B89272", "bowl", "food"),
    "fudgy-brownies": ("#4B2E22", "squares", "food"),
    "cheesecake": ("#F2DDB0", "slice", "food"),
    "affogato": ("#F4EBDD", "latte", "drink"),
}

BG_TINTS = [CREAM, (243, 226, 200), (247, 234, 212)]


def product_image(slug, color, style, kind, variant, size=800):
    W = size * S
    bg = radial((W, W), CREAM_LIGHT if variant != 2 else (240, 222, 196), BG_TINTS[variant % 3]).convert("RGBA")
    noise(bg, 3, seed=hash(slug) % 1000 + variant)
    rnd = random.Random(hash(slug) + variant)
    zoom = [1.0, 1.35, .82][variant]
    cx, cy = W / 2 + (rnd.uniform(-.06, .06) * W if variant == 2 else 0), W / 2
    r = W * .24 * zoom
    if variant == 2:
        d = ImageDraw.Draw(bg)
        for _ in range(9):
            bean(d, rnd.uniform(.08, .92) * W, rnd.uniform(.08, .92) * W, W * .022, rnd.uniform(0, math.pi))
    if kind == "drink":
        cup_topdown(bg, cx, cy, r, hexc(color), style, seed=len(slug) + variant)
    else:
        plate(bg, cx, cy, r, hexc(color), style, seed=len(slug) + variant)
    return bg.convert("RGB").resize((size, size), Image.LANCZOS)


def hero(size=(1920, 1280)):
    W, H = size[0] * S, size[1] * S
    img = radial((W, H), (122, 84, 58), (38, 24, 18), center=(W * .68, H * .5), radius=W * .75).convert("RGBA")
    noise(img, 7, seed=7)
    d = ImageDraw.Draw(img)
    rnd = random.Random(3)
    # papan kayu
    for i in range(0, H, int(H / 7)):
        d.line([(0, i), (W, i + rnd.randint(-20, 20))], fill=(30, 18, 12, 90), width=6)
    for _ in range(26):
        bean(d, rnd.uniform(.45, 1) * W, rnd.uniform(0, 1) * H, W * .012, rnd.uniform(0, math.pi))
    cup_topdown(img, W * .7, H * .52, H * .27, (150, 102, 66), "latte", seed=11)
    img = img.convert("RGB").resize(size, Image.LANCZOS)
    return img


def banner(seed, base, size=(1600, 900)):
    W, H = size[0] * S, size[1] * S
    img = radial((W, H), mix(hexc(base), (255, 255, 255), .25), hexc(base), center=(W * .7, H * .5)).convert("RGBA")
    noise(img, 5, seed=seed)
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    for _ in range(14):
        bean(d, rnd.uniform(.4, 1) * W, rnd.uniform(0, 1) * H, W * .012, rnd.uniform(0, math.pi))
    styles = ["latte", "iced", "foam"]
    cup_topdown(img, W * .74, H * .5, H * .26, hexc(["#A87B55", "#6E9A57", "#C8924E", "#8C5E3C"][seed % 4]), styles[seed % 3], seed=seed)
    return img.convert("RGB").resize(size, Image.LANCZOS)


def logo(size):
    W = size * S
    img = Image.new("RGBA", (W, W), PRIMARY + (255,))
    d = ImageDraw.Draw(img)
    c = W / 2
    d.ellipse((c - W * .3, c - W * .3, c + W * .3, c + W * .3), fill=CREAM)
    d.ellipse((c - W * .22, c - W * .22, c + W * .22, c + W * .22), fill=(150, 102, 66))
    latte_art(d, c, c, W * .22, foam=CREAM, crema=(150, 102, 66))
    return img.resize((size, size), Image.LANCZOS)


def save(img, path, quality=62):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=quality)


def main():
    save(hero(), ROOT / "hero/latte.avif", quality=55)
    save(hero((1200, 800)), ROOT / "hero/latte-og.jpg", quality=80)
    for slug, (color, style, kind) in PRODUCTS.items():
        for v in range(3):
            name = f"{slug}.avif" if v == 0 else f"{slug}-{v + 1}.avif"
            save(product_image(slug, color, style, kind, v), ROOT / "images/products" / name)
    for i, base in enumerate(["#6F4E37", "#3E2723", "#8C5E3C", "#5A3E2B", "#7A5236", "#4B3226"]):
        save(banner(i, base), ROOT / f"images/banners/banner-{i + 1}.avif", quality=58)
        save(banner(i + 10, base, (1200, 630)), ROOT / f"images/blog/blog-{i + 1}.avif", quality=58)
    for i in range(2):
        save(banner(20 + i, ["#5A3E2B", "#3E2723"][i], (1200, 800)), ROOT / f"images/outlets/outlet-{i + 1}.avif", quality=58)
    save(banner(30, "#6F4E37", (1200, 900)), ROOT / "images/about/barista.avif", quality=58)
    for s in (192, 512):
        logo(s).save(ROOT / f"icons/icon-{s}.png")
    logo(180).save(ROOT / "icons/apple-touch-icon.png")
    logo(512).save(ROOT / "icons/maskable-512.png")


if __name__ == "__main__":
    (ROOT / "icons").mkdir(parents=True, exist_ok=True)
    main()
    print("selesai")
