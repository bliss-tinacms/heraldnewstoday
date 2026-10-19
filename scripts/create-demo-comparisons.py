from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
actual_dir = root / "evidence/astro-demo-lock"
reference_root = Path("/home/aaisha/herald-demo-extraction/rendered")
out = actual_dir / "comparisons"
out.mkdir(parents=True, exist_ok=True)
route_map = {
    "index": "index",
    "about": "about",
    "contact": "contact",
    "our-team": "team",
    "single-post": "article",
    "single-category": "category",
    "single-author": "author",
    "single-page": "page",
    "sitemap": "sitemap",
    "404": "404",
}
for actual_name, reference_name in route_map.items():
    for mode in ("desktop", "mobile"):
        reference = Image.open(reference_root / reference_name / f"{mode}-full.png").convert("RGB")
        actual = Image.open(actual_dir / f"{actual_name}-{mode}.png").convert("RGB")
        panel_width = 720 if mode == "desktop" else 390
        def fit_width(img):
            height = round(img.height * panel_width / img.width)
            return img.resize((panel_width, height), Image.Resampling.LANCZOS)
        reference, actual = fit_width(reference), fit_width(actual)
        h = max(reference.height, actual.height)
        canvas = Image.new("RGB", (panel_width * 2, h + 42), "white")
        canvas.paste(reference, (0, 42))
        canvas.paste(actual, (panel_width, 42))
        draw = ImageDraw.Draw(canvas)
        draw.text((12, 13), "REFERENCE", fill="#0B0D10")
        draw.text((panel_width + 12, 13), "LOCAL ASTRO/TINA", fill="#0B0D10")
        output = out / f"{actual_name}-{mode}-comparison.jpg"
        canvas.save(output, quality=88, optimize=True)
        print(output)
