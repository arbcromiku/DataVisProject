import json, collections, pathlib
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(r"C:\Users\Langkasuka\Desktop\DataVisProject")
img_dir = root / "assets" / "images"
img_dir.mkdir(parents=True, exist_ok=True)
records = json.loads((root / "processed_police_data.json").read_text())
pos = [r for r in records if r.get("METRIC") == "positive_drug_tests" and r.get("NO_DRUGS_DETECTED") != "Yes"]

# simple font
try:
    font = ImageFont.truetype("arial.ttf", 14)
    font_small = ImageFont.truetype("arial.ttf", 12)
    font_title = ImageFont.truetype("arial.ttf", 18)
except:
    font = ImageFont.load_default()
    font_small = ImageFont.load_default()
    font_title = ImageFont.load_default()

blue = (37,99,235)
gray = (75,85,99)

# Trend line (simple polyline)
by_year = collections.defaultdict(int)
for r in pos:
    by_year[int(r['YEAR'])] += int(r['COUNT'])
items = sorted(by_year.items())
xs = [x for x,_ in items]; ys=[y for _,y in items]
w,h = 900, 420
img = Image.new('RGB', (w,h), (255,255,255))
draw = ImageDraw.Draw(img)
margin = 70; top = 70; bottom = 60
maxy = max(ys); miny = 0
for frac in [0.25,0.5,0.75]:
    y = top + (1-frac)*(h-top-bottom)
    draw.line((margin,y,w-40,y), fill=(229,231,235))
points=[]
for xval,yval in items:
    x = margin + (xval-min(xs))/(max(xs)-min(xs)) * (w- margin - 60)
    y = top + (1-(yval-miny)/(maxy-miny))*(h-top-bottom)
    points.append((x,y))
if len(points)>1:
    draw.line(points, fill=blue, width=3)
for x,y in points:
    draw.ellipse((x-3,y-3,x+3,y+3), fill=blue)
draw.text((w/2-200,20),'Positive Drug Tests by Year (2008–2024)', fill=(17,24,39), font=font_title)
draw.text((w/2-20,h-bottom+30),'Year', fill=gray, font=font_small)
draw.text((20,h/2),'Positive tests', fill=gray, font=font_small)
img.save(img_dir/'trend_static.png', dpi=(150,150))

# Jurisdiction barh latest year
latest = max(xs)
by_j = collections.defaultdict(int)
for r in pos:
    if int(r['YEAR'])==latest:
        by_j[r['JURISDICTION']] += int(r['COUNT'])
items = sorted(by_j.items(), key=lambda kv: kv[1], reverse=True)
w,h=820,420
img = Image.new('RGB',(w,h),(255,255,255))
draw=ImageDraw.Draw(img)
ox,oy=200,60; barh=24; spacing=8
maxv = items[0][1]
draw.text((w/2-200,20), f'Positive Tests by Jurisdiction ({latest})', fill=(17,24,39), font=font_title)
draw.text((w/2-50,h-30),'Positive tests', fill=gray, font=font_small)
for i,(label,val) in enumerate(items):
    y=oy+i*(barh+spacing)
    width = int((val/maxv)*(w-ox-60))
    draw.rectangle((ox,y,ox+width,y+barh), fill=blue)
    draw.text((ox-12,y+4),label, fill=(17,24,39), font=font_small, anchor='ra')
    draw.text((ox+width+6,y+4),f"{val:,}", fill=gray, font=font_small)
img.save(img_dir/'jurisdiction_latest.png', dpi=(150,150))

# Drug bar vertical
by_drug = collections.defaultdict(int)
for r in pos:
    c=int(r['COUNT'])
    for drug in ['AMPHETAMINE','CANNABIS','COCAINE','ECSTASY','METHYLAMPHETAMINE']:
        if str(r.get(drug,'' )).lower()=='yes':
            by_drug[drug]+=c
items=sorted(by_drug.items(), key=lambda kv: kv[1], reverse=True)
labels=[k.title() for k,_ in items]; vals=[v for _,v in items]
w,h=760,420
img=Image.new('RGB',(w,h),(255,255,255))
draw=ImageDraw.Draw(img)
ox,oy=80,80; W = 100*len(labels); maxv=max(vals); bottom=80
colors=[(74,222,128),(34,197,94),(22,163,74),(21,128,61),(22,101,52)]
draw.text((w/2-180,20),'Positive Tests by Drug Type (All Years)', fill=(17,24,39), font=font_title)
draw.text((20,h/2),'Positive tests', fill=gray, font=font_small)
for i,(label,val) in enumerate(zip(labels, vals)):
    x=ox+i*120
    height=int((val/maxv)*(h-oy-bottom))
    draw.rectangle((x, oy+(h-oy-bottom)-height, x+70, oy+(h-oy-bottom)), fill=colors[i%len(colors)])
    draw.text((x+35, oy+(h-oy-bottom)+14), label, fill=(55,65,81), font=font_small, anchor='mm')
    draw.text((x+35, oy+(h-oy-bottom)-height-10), f"{vals[i]:,}", fill=gray, font=font_small, anchor='mm')
img.save(img_dir/'drugtype_overall.png', dpi=(150,150))

print('PNGs written to', img_dir)
