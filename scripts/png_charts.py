import json, collections, pathlib
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(r"C:\Users\Langkasuka\Desktop\DataVisProject")
img_dir = root / "assets" / "images"
img_dir.mkdir(parents=True, exist_ok=True)
records = json.loads((root / "processed_police_data.json").read_text())
pos = [r for r in records if r.get("METRIC") == "positive_drug_tests" and r.get("NO_DRUGS_DETECTED") != "Yes"]

try:
    font_title = ImageFont.truetype("arial.ttf", 20)
    font = ImageFont.truetype("arial.ttf", 13)
    font_small = ImageFont.truetype("arial.ttf", 11)
except Exception:
    font_title = font = font_small = ImageFont.load_default()

blue = (37, 99, 235)
gray = (75, 85, 99)
dark = (17, 24, 39)
colors = [(74, 222, 128), (34, 197, 94), (22, 163, 74), (21, 128, 61), (22, 101, 52)]

# Trend line
by_year = collections.defaultdict(int)
for r in pos:
    by_year[int(r["YEAR"])] += int(r["COUNT"])
items = sorted(by_year.items())
xs = [x for x, _ in items]
ys = [y for _, y in items]
w, h = 900, 500
margin, top, bottom, right = 90, 70, 80, 60
img = Image.new("RGB", (w, h), (255, 255, 255)); d = ImageDraw.Draw(img)
maxy = max(ys); miny = 0
for frac in [0.25, 0.5, 0.75]:
    y = top + (1 - frac) * (h - top - bottom)
    d.line((margin, y, w - right, y), fill=(229, 231, 235))
pts = []
for xval, yval in items:
    x = margin + (xval - min(xs)) / (max(xs) - min(xs)) * (w - margin - right)
    y = top + (1 - (yval - miny) / (maxy - miny)) * (h - top - bottom)
    pts.append((x, y))
if len(pts) > 1:
    d.line(pts, fill=blue, width=3)
for x, y in pts:
    d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=blue)
d.text((w / 2, 30), "Positive Drug Tests by Year (2008–2024)", fill=dark, font=font_title, anchor="mm")
d.text((w / 2, h - bottom + 40), "Year", fill=gray, font=font)
d.text((30, h / 2), "Positive tests", fill=gray, font=font, anchor="lm")
for frac in [0, 0.25, 0.5, 0.75, 1]:
    yval = int(miny + frac * (maxy - miny))
    y = top + (1 - frac) * (h - top - bottom)
    d.text((margin - 12, y), f"{yval:,}", fill=gray, font=font_small, anchor="rm")
for i in range(6):
    xv = int(round(xs[0] + i * (xs[-1] - xs[0]) / 5))
    x = margin + (xv - xs[0]) / (xs[-1] - xs[0]) * (w - margin - right)
    d.text((x, h - bottom + 20), str(xv), fill=gray, font=font_small, anchor="mm")
img.save(img_dir / "trend_static.png", dpi=(180, 180))

# Jurisdiction barh latest year
latest = xs[-1]; by_j = collections.defaultdict(int)
for r in pos:
    if int(r["YEAR"]) == latest:
        by_j[r["JURISDICTION"]] += int(r["COUNT"])
items = sorted(by_j.items(), key=lambda kv: kv[1], reverse=True)
w, h = 820, 480
ox, oy, barh, spacing = 220, 80, 26, 12
maxv = items[0][1]
img = Image.new("RGB", (w, h), (255, 255, 255)); d = ImageDraw.Draw(img)
d.text((w / 2, 30), f"Positive Tests by Jurisdiction ({latest})", fill=dark, font=font_title, anchor="mm")
d.text((w / 2, h - 30), "Positive tests", fill=gray, font=font)
for i, (lab, val) in enumerate(items):
    y = oy + i * (barh + spacing)
    width = int((val / maxv) * (w - ox - 100))
    d.rectangle((ox, y, ox + width, y + barh), fill=blue)
    d.text((ox - 14, y + barh / 2), lab, fill=dark, font=font, anchor="rm")
    d.text((ox + width + 8, y + barh / 2), f"{val:,}", fill=gray, font=font_small, anchor="lm")
img.save(img_dir / "jurisdiction_latest.png", dpi=(180, 180))

# Drug vertical
by_drug = collections.defaultdict(int)
for r in pos:
    c = int(r["COUNT"])
    for drug in ["AMPHETAMINE", "CANNABIS", "COCAINE", "ECSTASY", "METHYLAMPHETAMINE"]:
        if str(r.get(drug, "" )).lower() == "yes":
            by_drug[drug] += c
items = sorted(by_drug.items(), key=lambda kv: kv[1], reverse=True)
labels = [k.title() for k, _ in items]; vals = [v for _, v in items]
w, h = 780, 480
ox, oy, bottom = 90, 80, 80
maxv = max(vals)
img = Image.new("RGB", (w, h), (255, 255, 255)); d = ImageDraw.Draw(img)
d.text((w / 2, 30), "Positive Tests by Drug Type (All Years)", fill=dark, font=font_title, anchor="mm")
d.text((30, h / 2), "Positive tests", fill=gray, font=font, anchor="lm")
for i, (lab, val) in enumerate(zip(labels, vals)):
    x = ox + i * 120
    height = int((val / maxv) * (h - oy - bottom))
    y0 = oy + (h - oy - bottom) - height
    d.rectangle((x, y0, x + 70, oy + (h - oy - bottom)), fill=colors[i % len(colors)])
    d.text((x + 35, oy + (h - oy - bottom) + 16), lab, fill=dark, font=font_small, anchor="mm")
    d.text((x + 35, y0 - 12), f"{val:,}", fill=gray, font=font_small, anchor="mm")
img.save(img_dir / "drugtype_overall.png", dpi=(180, 180))

print("PNGs written to", img_dir)
