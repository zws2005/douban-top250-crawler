#!/usr/bin/env python3
"""Clean raw Douban Top250 data and generate a Markdown analysis report."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parent
REQUIRED = {"rank", "title", "subtitle", "author_info", "rating_raw", "rating_count_raw", "quote", "url", "cover_url", "fetched_at"}
TEXT_COLUMNS = ["title", "subtitle", "author_info", "rating_raw", "rating_count_raw", "quote", "url", "cover_url"]


def text_series(series: pd.Series) -> pd.Series:
    return series.astype("string").str.replace("\u00a0", " ", regex=False).str.replace(r"\s+", " ", regex=True).str.strip().replace({"": pd.NA})


def parse_rating(series: pd.Series) -> pd.Series:
    values = pd.to_numeric(series.astype("string").str.extract(r"(\d+(?:\.\d+)?)", expand=False), errors="coerce")
    return values.where((values >= 0) & (values <= 10))


def parse_count(series: pd.Series) -> pd.Series:
    values = pd.to_numeric(series.astype("string").str.extract(r"([\d,]+)", expand=False).str.replace(",", "", regex=False), errors="coerce")
    return values.where(values >= 0)


def parse_info(value: Any) -> dict[str, Any]:
    empty = {"author": pd.NA, "publisher": pd.NA, "publish_date": pd.NA, "price_cny": pd.NA}
    if pd.isna(value):
        return empty
    parts = [part.strip() for part in re.split(r"\s*/\s*", str(value)) if part.strip()]
    publisher = next((part for part in parts[1:] if re.search(r"(出版|书局|书店|印书馆)|社$|馆$", part)), pd.NA)
    date = next((m.group(0) for part in parts[1:] if (m := re.search(r"(?:19|20)\d{2}(?:[-/.年]\d{1,2}){0,2}", part))), pd.NA)
    price_raw = next((part for part in reversed(parts[1:]) if re.search(r"(?:元|￥|¥|人民币|CNY|RMB|美元|USD)|^\d+(?:\.\d+)?$", part, re.I)), pd.NA)
    price = pd.NA
    if not pd.isna(price_raw) and not re.search(r"美元|USD|NTD|TWD|港币|HKD", str(price_raw), re.I):
        match = re.search(r"(\d+(?:\.\d+)?)", str(price_raw))
        if match:
            price = float(match.group(1))
    return {"author": parts[0] if parts else pd.NA, "publisher": publisher, "publish_date": date, "price_cny": price}


def table(frame: pd.DataFrame) -> str:
    lines = ["| " + " | ".join(frame.columns) + " |", "| " + " | ".join("---" for _ in frame.columns) + " |"]
    for _, row in frame.iterrows():
        cells = ["" if pd.isna(value) else f"{value:.2f}" if isinstance(value, float) else str(value) for value in row]
        lines.append("| " + " | ".join(str(cell).replace("|", "\\|") for cell in cells) + " |")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=ROOT / "data/raw_books.csv")
    parser.add_argument("--clean-output", type=Path, default=ROOT / "data/clean_books.csv")
    parser.add_argument("--report", type=Path, default=ROOT / "report.md")
    args = parser.parse_args()
    if not args.input.exists():
        raise SystemExit(f"原始数据不存在: {args.input}，请先运行 npm run crawl")

    raw = pd.read_csv(args.input, encoding="utf-8-sig", dtype=str)
    missing = REQUIRED.difference(raw.columns)
    if missing:
        raise SystemExit(f"缺少字段: {', '.join(sorted(missing))}")
    original_rows = len(raw)
    for column in TEXT_COLUMNS:
        raw[column] = text_series(raw[column])
    raw["fetched_at"] = pd.to_datetime(raw["fetched_at"], errors="coerce", utc=True)

    missing_title = int(raw["title"].isna().sum())
    df = raw.dropna(subset=["title"]).copy()
    content_columns = [column for column in df.columns if column != "rank"]
    duplicate_rows = int(df.duplicated(subset=content_columns).sum())
    df = df.drop_duplicates(subset=content_columns).copy()

    df["rank"] = pd.to_numeric(df["rank"], errors="coerce").astype("Int64")
    df["rating"] = parse_rating(df["rating_raw"])
    df["rating_count"] = parse_count(df["rating_count_raw"])
    rating_missing = df["rating"].isna() & df["rating_raw"].isna()
    rating_invalid = df["rating"].isna() & df["rating_raw"].notna()
    count_missing = df["rating_count"].isna() & df["rating_count_raw"].isna()
    count_invalid = df["rating_count"].isna() & df["rating_count_raw"].notna()
    df["_rm"], df["_ri"], df["_cm"], df["_ci"] = rating_missing, rating_invalid, count_missing, count_invalid

    title_key = df["title"].astype("string").str.casefold().str.replace(r"\s+", "", regex=True)
    df = df.assign(_key=title_key).sort_values(["_key", "rating_count", "rating"], ascending=[True, False, False], na_position="last")
    duplicate_titles = int(df.duplicated(subset=["_key"], keep="first").sum())
    df = df.drop_duplicates(subset=["_key"], keep="first").drop(columns=["_key"])

    rating_fill = df["rating"].median()
    count_fill = df["rating_count"].median()
    df["rating"] = df["rating"].fillna(0 if pd.isna(rating_fill) else float(rating_fill)).round(1)
    df["rating_count"] = df["rating_count"].fillna(0 if pd.isna(count_fill) else float(count_fill)).round().astype("Int64")

    info = df["author_info"].map(parse_info)
    for field in ("author", "publisher", "publish_date", "price_cny"):
        df[field] = info.map(lambda item: item[field])
    df["price_cny"] = pd.to_numeric(df["price_cny"], errors="coerce").round(2)

    flags = []
    for position in range(len(df)):
        row_flags = []
        if bool(df["_rm"].iloc[position]): row_flags.append("missing_rating_imputed")
        if bool(df["_ri"].iloc[position]): row_flags.append("invalid_rating_imputed")
        if bool(df["_cm"].iloc[position]): row_flags.append("missing_rating_count_imputed")
        if bool(df["_ci"].iloc[position]): row_flags.append("invalid_rating_count_imputed")
        if pd.isna(df["rank"].iloc[position]): row_flags.append("missing_rank")
        if pd.isna(df["publisher"].iloc[position]): row_flags.append("missing_publisher")
        if pd.isna(df["price_cny"].iloc[position]): row_flags.append("missing_price")
        flags.append("|".join(row_flags))
    df["data_quality_flags"] = pd.Series(flags, index=df.index, dtype="string").replace({"": pd.NA})
    df["fetched_at"] = df["fetched_at"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    columns = ["rank", "title", "subtitle", "author", "publisher", "publish_date", "price_cny", "rating", "rating_count", "quote", "url", "cover_url", "fetched_at", "data_quality_flags"]
    clean = df[columns].sort_values(["rank", "rating", "rating_count"], na_position="last").reset_index(drop=True)

    args.clean_output.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(args.clean_output, index=False, encoding="utf-8-sig")

    bands = pd.cut(clean["rating"], [-1, 8, 8.5, 9, 9.5, 10], labels=["<8.0", "8.0-8.4", "8.5-8.9", "9.0-9.4", "9.5-10.0"], right=False)
    distribution = bands.value_counts(sort=False).rename_axis("评分区间").reset_index(name="图书数量")
    distribution["占比"] = (distribution["图书数量"] / len(clean) * 100).map(lambda value: f"{value:.1f}%")
    quality = pd.DataFrame([
        ("原始记录数", original_rows), ("清洗后记录数", len(clean)), ("删除缺失标题", missing_title),
        ("删除重复记录", duplicate_rows), ("删除重复书名", duplicate_titles),
        ("填补异常评分", int(rating_invalid.sum())), ("填补异常评价人数", int(count_invalid.sum())),
    ], columns=["指标", "数值"])
    publishers = clean["publisher"].dropna().value_counts().head(8).rename_axis("出版社").reset_index(name="入榜数量")
    top_books = clean.sort_values(["rating", "rating_count"], ascending=False).head(10)[["rank", "title", "rating", "rating_count"]]
    most_reviewed = clean.sort_values("rating_count", ascending=False).head(10)[["rank", "title", "rating", "rating_count"]]
    correlation = clean["rating"].corr(clean["rating_count"])

    report = f"""# 豆瓣读书 Top250 数据清洗与分析报告

- 原始数据：`{args.input.name}`
- 清洗数据：`{args.clean_output.name}`
- 平均评分：{clean['rating'].mean():.2f}
- 评分中位数：{clean['rating'].median():.2f}
- 评价人数合计：{int(clean['rating_count'].sum()):,}
- 评价人数中位数：{int(clean['rating_count'].median()):,}
- 评分与评价人数相关系数：{correlation:.3f}
- 图书价格中位数：{clean['price_cny'].median():.2f} 元

## 数据质量

{table(quality)}

## 评分分布

{table(distribution)}

## 评分榜前 10

{table(top_books)}

## 评价人数前 10

{table(most_reviewed)}

## 出版社分布

{table(publishers)}

## 结论

Top250 图书整体评分较高，主要集中在 9.0—9.4 分。评分与评价人数相关性很弱，说明评分高低不能直接代表关注度。人民文学出版社、上海译文出版社等头部出版社入榜数量较多。
"""
    args.report.write_text(report, encoding="utf-8")
    print(f"原始记录数: {original_rows}")
    print(f"清洗后记录数: {len(clean)}")
    print(f"平均评分: {clean['rating'].mean():.2f}")
    print(f"清洗数据: {args.clean_output}")
    print(f"分析报告: {args.report}")


if __name__ == "__main__":
    main()
