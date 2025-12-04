import json, collections, pathlib, pprint
root = pathlib.Path(r"C:\Users\Langkasuka\Desktop\DataVisProject")
data = json.loads((root / "processed_police_data.json").read_text())
pos = [r for r in data if r.get("METRIC") == "positive_drug_tests" and r.get("NO_DRUGS_DETECTED") != "Yes"]
by_year = collections.defaultdict(int)
by_j = collections.defaultdict(int)
by_drug = collections.defaultdict(int)
for r in pos:
    y = int(r["YEAR"])
    by_year[y] += int(r["COUNT"])
last_year = max(by_year)
for r in pos:
    if int(r["YEAR"]) == last_year:
        by_j[r["JURISDICTION"]] += int(r["COUNT"])
    for drug in ["AMPHETAMINE", "CANNABIS", "COCAINE", "ECSTASY", "METHYLAMPHETAMINE"]:
        if str(r.get(drug, "")).lower() == "yes":
            by_drug[drug] += int(r["COUNT"])

print("years =", [(k, by_year[k]) for k in sorted(by_year)])
print("jur =", sorted(by_j.items(), key=lambda kv: -kv[1]))
print("drug =", sorted(by_drug.items(), key=lambda kv: -kv[1]))
