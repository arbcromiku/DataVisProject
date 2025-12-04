import json, collections, pathlib, statistics

p = pathlib.Path(r"C:\Users\Langkasuka\Desktop\DataVisProject\processed_police_data.json")
data = json.loads(p.read_text())

positive = [d for d in data if d.get("METRIC") == "positive_drug_tests" and d.get("NO_DRUGS_DETECTED") != "Yes"]
by_year = collections.OrderedDict()
by_jy = collections.defaultdict(int)
by_drug = collections.defaultdict(int)

for d in positive:
    c = int(d["COUNT"])
    y = int(d["YEAR"])
    j = d["JURISDICTION"]
    by_year[y] = by_year.get(y, 0) + c
    by_jy[(y, j)] += c
    for drug in ["AMPHETAMINE", "CANNABIS", "COCAINE", "ECSTASY", "METHYLAMPHETAMINE"]:
        if str(d.get(drug, "")).lower() == "yes":
            by_drug[drug] += c

years = sorted(by_year)
start, end = by_year[years[0]], by_year[years[-1]]
periods = len(years) - 1
cagr = (end / start) ** (1 / periods) - 1 if start > 0 else 0
vals = [by_year[y] for y in years]
quartiles = statistics.quantiles(vals, n=4, method="inclusive")
peak_item = max(by_jy.items(), key=lambda kv: kv[1] / (by_year[kv[0][0]] or 1))
peak_share = peak_item[1] / by_year[peak_item[0][0]] if by_year[peak_item[0][0]] else 0

print("records", len(positive))
print("years", years[0], years[-1])
print("total positives", sum(by_year.values()))
print("start vs end", start, end)
print("CAGR", f"{cagr*100:.2f}%")
print("IQR", quartiles[0], quartiles[2])
print("median", statistics.median(vals))
print("top year", max(by_year.items(), key=lambda kv: kv[1]))
print("peak jur share", peak_item, "share", f"{peak_share*100:.1f}%")
print("top drug", max(by_drug.items(), key=lambda x: x[1]))
print("drug order", sorted(by_drug.items(), key=lambda x: -x[1]))
