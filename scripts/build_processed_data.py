import argparse
import json
import pathlib
import pandas as pd


def load_positive_tests(path: pathlib.Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = df[df["METRIC"] == "positive_drug_tests"].copy()
    df = df[df["NO_DRUGS_DETECTED"] != "Yes"].copy()

    numeric_cols = ["YEAR", "COUNT", "FINES", "ARRESTS", "CHARGES"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
        if col == "YEAR":
            df[col] = df[col].astype(int)
        else:
            df[col] = df[col].astype(int)

    df = df.sort_values(["YEAR", "JURISDICTION", "LOCATION", "AGE_GROUP"])
    return df


def write_json(df: pd.DataFrame, out_path: pathlib.Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    records = df.to_dict(orient="records")
    out_path.write_text(json.dumps(records, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Build processed_police_data.json for dashboard consumption.")
    parser.add_argument(
        "--input",
        default=pathlib.Path("data/police_enforcement_2024_positive_drug_tests-1.csv"),
        type=pathlib.Path,
        help="Source CSV containing positive drug tests.",
    )
    parser.add_argument(
        "--output-data",
        default=pathlib.Path("data/processed_police_data.json"),
        type=pathlib.Path,
        help="Output path for processed data copy (analytics).",
    )
    parser.add_argument(
        "--output-web",
        default=pathlib.Path("web/processed_police_data.json"),
        type=pathlib.Path,
        help="Output path for web dashboard consumption.",
    )

    args = parser.parse_args()

    df = load_positive_tests(args.input)
    for target in (args.output_data, args.output_web):
        write_json(df, target)
    print(f"Wrote {len(df)} rows to {args.output_data} and {args.output_web}")
    print(f"Totals — COUNT: {int(df['COUNT'].sum()):,}, FINES: {int(df['FINES'].sum()):,}, ARRESTS: {int(df['ARRESTS'].sum()):,}, CHARGES: {int(df['CHARGES'].sum()):,}")


if __name__ == "__main__":
    main()
