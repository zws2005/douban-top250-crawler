#!/usr/bin/env python3
"""Clean and analyse the raw Douban Top250 CSV produced by the TypeScript crawler."""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
except ImportError:
    plt = None
    font_manager = None

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = PROJECT_ROOT / "data" / "raw_books.csv"
DEFAULT_CLEAN_OUTPUT = PROJECT_ROOT / "data" / "clean_books.csv"
DEFAULT_ANALYSIS_DIR = PROJECT_ROOT / "analysis"

RAW_REQUIRED_COLUMNS = {
    "rank",
    "title",
    "subtitle",
    "author_info",
    "rating_raw",
    "rating_count_raw",
    "quote",
    "url",
    "cover_url",
    "fetched_at",
}

TEXT_COLUMNS = [
    "title",
    "subtitle",
    "author_info",
    "rating_raw",
    "rating_count_raw",
    "quote",
    "url",
    "cover_url",
]

CLEAN_COLUMNS = [
    "rank",
    "title",
    "subtitle",
    "author",
    "publisher",
    "publish_date",
    "price_cny",
    "rating",
    "rating_count",
    "quote",
    "url",
    "cover_url",
    "fetched_at",
    "data_quality_flags",
]


def normalize_text(series: pd.Series) -> pd.Series:
    """Trim, collapse whitespace and turn empty strings into missing values."""
    return (
        series.astype("string")
        .str.replace("\u00a0", " ", regex=False)
        .str.replace(r"\s+", " ", regex=True)
        .str.strip()
        .replace({"": pd.NA, "nan": pd.NA})
    )


def parse_rating(series: pd.Series) -> pd.Series:
    extracted = series.astype("string").str.extract(r"(\d+(?:\.\d+)?)", expand=False)
    numeric = pd.to_numeric(extracted, errors="coerce")
    return numeric.where((numeric >= 0) & (numeric <= 10))


def parse_rating_count(series: pd.Series) -> pd.Series:
    extracted = (
        series.astype("string")
        .str.extract(r"([\d,]+)", expand=False)
        .str.replace(",", "", regex=False)
    )
    numeric = pd.to_numeric(extracted, errors="coerce")
    return numeric.where(numeric >= 0)


def parse_book_info(value: Any) -> dict[str, Any]:
    if pd.isna(value):
        return {
            "author": pd.NA,
            "publisher": pd.NA,
            "publish_date": pd.NA,
            "price_cny": pd.NA,
        }

    parts = [part.strip() for part in re.split(r"\s*/\s*", str(value)) if part.strip()]
    author = parts[0] if parts else pd.NA

    publisher = next(
        (
            part
            for part in parts[1:]
            if re.search(r"(出版|书局|书店|印书馆)|社$|馆$", part)
        ),
        pd.NA,
    )

    date_pattern = re.compile(r"(?:19|20)\d{2}(?:[-/.年]\d{1,2}){0,2}")
    publish_date = next(
        (match.group(0) for part in parts[1:] if (match := date_pattern.search(part))),
        pd.NA,
    )

    price_raw = next(
        (
            part
            for part in reversed(parts[1:])
            if re.search(
                r"(?:元|￥|¥|人民币|CNY|RMB|美元|USD)|^\d+(?:\.\d+)?$",
                part,
                flags=re.IGNORECASE,
            )
        ),
        pd.NA,
    )
    price_cny = pd.NA
    if not pd.isna(price_raw):
        price_match = re.search(r"(\d+(?:\.\d+)?)", str(price_raw))
        if price_match and not re.search(
            r"美元|USD|NTD|TWD|港币|HKD", str(price_raw), flags=re.IGNORECASE
        ):
            price_cny = float(price_match.group(1))

    return {
        "author": author,
        "publisher": publisher,
        "publish_date": publish_date,
        "price_cny": price_cny,
    }


def markdown_table(frame: pd.DataFrame, columns: list[str]) -> str:
    header = "| " + " | ".join(columns) + " |"
    separator = "| " + " | ".join("---" for _ in columns) + " |"
    rows: list[str] = []
    for _, row in frame.iterrows():
        cells: list[str] = []
        for column in columns:
            value = row[column]
            if pd.isna(value):
                text = ""
            elif isinstance(value, float):
                text = f"{value:.2f}"
            else:
                text = str(value)
            cells.append(text.replace("|", "\\|"))
        rows.append("| " + " | ".join(cells) + " |")
    return "\n".join([header, separator, *rows])


def as_native(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (int, float, str, bool)):
        return value
    return str(value)


def generate_figures(
    clean: pd.DataFrame,
    distribution: pd.DataFrame,
    publisher_stats: pd.DataFrame,
    figures_dir: Path,
) -> dict[str, Path]:
    """Regenerate all analysis charts from the latest cleaned dataset."""
    if plt is None or font_manager is None:
        print("警告: 未安装 matplotlib，跳过图表生成")
        return {}

    available = {font.name for font in font_manager.fontManager.ttflist}
    for name in [
        "Noto Sans CJK SC",
        "WenQuanYi Micro Hei",
        "Microsoft YaHei",
        "SimHei",
        "DejaVu Sans",
    ]:
        if name in available:
            plt.rcParams["font.sans-serif"] = [name]
            break
    plt.rcParams["axes.unicode_minus"] = False

    figures_dir.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, Path] = {}

    fig, ax = plt.subplots(figsize=(9, 4.6))
    colors = ["#94A3B8", "#93C5FD", "#60A5FA", "#2563EB", "#1E3A8A"]
    bars = ax.bar(
        distribution["rating_band"].astype(str),
        distribution["book_count"],
        color=colors[: len(distribution)],
        width=0.62,
    )
    for bar, value in zip(bars, distribution["book_count"]):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            value + 2,
            str(int(value)),
            ha="center",
            va="bottom",
            fontsize=11,
        )
    ax.set_title("豆瓣读书 Top250 评分区间分布", fontsize=16, fontweight="bold", pad=12)
    ax.set_xlabel("评分区间")
    ax.set_ylabel("图书数量")
    ax.set_ylim(0, max(1, int(distribution["book_count"].max())) * 1.18)
    ax.grid(axis="y", linestyle="--", alpha=0.25)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    rating_path = figures_dir / "rating_distribution.png"
    fig.savefig(rating_path, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    outputs["rating_distribution"] = rating_path

    publisher_plot = publisher_stats.head(10).sort_values("book_count")
    fig, ax = plt.subplots(figsize=(9, 5.2))
    bars = ax.barh(
        publisher_plot["publisher"],
        publisher_plot["book_count"],
        color="#0EA5E9",
        height=0.62,
    )
    for bar, value in zip(bars, publisher_plot["book_count"]):
        ax.text(
            value + 0.4,
            bar.get_y() + bar.get_height() / 2,
            str(int(value)),
            va="center",
            fontsize=10,
        )
    ax.set_title("入榜图书数量最多的出版社", fontsize=16, fontweight="bold", pad=12)
    ax.set_xlabel("入榜图书数量")
    ax.set_xlim(0, max(1, int(publisher_plot["book_count"].max())) * 1.15)
    ax.grid(axis="x", linestyle="--", alpha=0.25)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    publisher_path = figures_dir / "publisher_distribution.png"
    fig.savefig(publisher_path, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    outputs["publisher_distribution"] = publisher_path

    fig, ax = plt.subplots(figsize=(9, 4.8))
    ax.scatter(
        clean["rating"],
        clean["rating_count"],
        s=38,
        alpha=0.72,
        c=clean["rating_count"],
        cmap="Blues",
        edgecolors="white",
        linewidths=0.5,
    )
    ax.set_yscale("log")
    ax.set_title("评分与评价人数的关系（对数纵轴）", fontsize=16, fontweight="bold", pad=12)
    ax.set_xlabel("评分")
    ax.set_ylabel("评价人数（对数）")
    ax.grid(True, which="major", linestyle="--", alpha=0.22)
    ax.spines[["top", "right"]].set_visible(False)
    correlation = clean["rating"].corr(clean["rating_count"])
    ax.text(
        0.02,
        0.96,
        f"Pearson r = {correlation:.3f}",
        transform=ax.transAxes,
        va="top",
        fontsize=11,
        bbox=dict(boxstyle="round,pad=0.35", facecolor="#F8FAFC", edgecolor="#CBD5E1"),
    )
    fig.tight_layout()
    scatter_path = figures_dir / "rating_vs_reviews.png"
    fig.savefig(scatter_path, dpi=220, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    outputs["rating_vs_reviews"] = scatter_path

    return outputs


def main() -> None:
    args = parse_args()
    input_path = args.input.resolve()
    clean_output = args.clean_output.resolve()
    analysis_dir = args.analysis_dir.resolve()
    figures_dir = (args.figures_dir if args.figures_dir is not None else analysis_dir / "figures").resolve()

    if not input_path.exists():
        raise SystemExit(f"原始数据不存在: {input_path}\n请先运行 npm run crawl")

    raw = pd.read_csv(input_path, encoding="utf-8-sig", dtype=str)
    raw.columns = [str(column).strip() for column in raw.columns]
    missing_columns = RAW_REQUIRED_COLUMNS.difference(raw.columns)
    if missing_columns:
        raise SystemExit(f"原始 CSV 缺少字段: {', '.join(sorted(missing_columns))}")

    original_rows = len(raw)
    for column in TEXT_COLUMNS:
        raw[column] = normalize_text(raw[column])
    raw["fetched_at"] = pd.to_datetime(raw["fetched_at"], errors="coerce", utc=True)

    missing_title_removed = int(raw["title"].isna().sum())
    frame = raw.dropna(subset=["title"]).copy()

    duplicate_content_columns = [column for column in frame.columns if column != "rank"]
    exact_duplicates_removed = int(
        frame.duplicated(subset=duplicate_content_columns).sum()
    )
    frame = frame.drop_duplicates(subset=duplicate_content_columns).copy()

    frame["rank"] = pd.to_numeric(frame["rank"], errors="coerce").astype("Int64")
    frame["rating"] = parse_rating(frame["rating_raw"])
    frame["rating_count"] = parse_rating_count(frame["rating_count_raw"])

    rating_missing = frame["rating"].isna() & frame["rating_raw"].isna()
    rating_invalid = frame["rating"].isna() & frame["rating_raw"].notna()
    count_missing = frame["rating_count"].isna() & frame["rating_count_raw"].isna()
    count_invalid = frame["rating_count"].isna() & frame["rating_count_raw"].notna()
    frame["_rating_missing"] = rating_missing
    frame["_rating_invalid"] = rating_invalid
    frame["_count_missing"] = count_missing
    frame["_count_invalid"] = count_invalid

    title_key = (
        frame["title"].astype("string").str.casefold().str.replace(r"\s+", "", regex=True)
    )
    frame = frame.assign(_title_key=title_key).sort_values(
        ["_title_key", "rating_count", "rating"],
        ascending=[True, False, False],
        na_position="last",
    )
    title_duplicates_removed = int(frame.duplicated(subset=["_title_key"], keep="first").sum())
    frame = frame.drop_duplicates(subset=["_title_key"], keep="first").drop(columns=["_title_key"])

    rating_fill = frame["rating"].median()
    if pd.isna(rating_fill):
        rating_fill = 0.0
    count_fill = frame["rating_count"].median()
    if pd.isna(count_fill):
        count_fill = 0.0

    frame["rating"] = frame["rating"].fillna(float(rating_fill)).round(1)
    frame["rating_count"] = (
        frame["rating_count"].fillna(float(count_fill)).round().astype("Int64")
    )

    parsed_info = frame["author_info"].map(parse_book_info)
    for field in ("author", "publisher", "publish_date", "price_cny"):
        frame[field] = parsed_info.map(lambda item: item[field])

    frame["price_cny"] = pd.to_numeric(frame["price_cny"], errors="coerce").round(2)

    flags: list[str] = []
    for position in range(len(frame)):
        row_flags: list[str] = []
        if bool(frame["_rating_missing"].iloc[position]):
            row_flags.append("missing_rating_imputed")
        if bool(frame["_rating_invalid"].iloc[position]):
            row_flags.append("invalid_rating_imputed")
        if bool(frame["_count_missing"].iloc[position]):
            row_flags.append("missing_rating_count_imputed")
        if bool(frame["_count_invalid"].iloc[position]):
            row_flags.append("invalid_rating_count_imputed")
        if pd.isna(frame["rank"].iloc[position]):
            row_flags.append("missing_rank")
        if pd.isna(frame["author"].iloc[position]):
            row_flags.append("missing_author")
        if pd.isna(frame["publisher"].iloc[position]):
            row_flags.append("missing_publisher")
        if pd.isna(frame["publish_date"].iloc[position]):
            row_flags.append("missing_publish_date")
        if pd.isna(frame["price_cny"].iloc[position]):
            row_flags.append("missing_price")
        flags.append("|".join(row_flags))

    frame["data_quality_flags"] = pd.Series(flags, index=frame.index, dtype="string").replace(
        {"": pd.NA}
    )
    frame["fetched_at"] = frame["fetched_at"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    frame = frame.sort_values(["rank", "rating", "rating_count"], ascending=[True, False, False], na_position="last")
    clean = frame[CLEAN_COLUMNS].reset_index(drop=True)

    clean_output.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(clean_output, index=False, encoding="utf-8-sig")
    analysis_dir.mkdir(parents=True, exist_ok=True)

    rating_series = pd.to_numeric(clean["rating"], errors="coerce")
    count_series = pd.to_numeric(clean["rating_count"], errors="coerce")

    rating_bands = pd.cut(
        rating_series,
        bins=[-1, 8.0, 8.5, 9.0, 9.5, 10.0],
        labels=["<8.0", "8.0-8.4", "8.5-8.9", "9.0-9.4", "9.5-10.0"],
        right=False,
    )
    distribution = (
        rating_bands.value_counts(sort=False)
        .rename_axis("rating_band")
        .reset_index(name="book_count")
    )
    distribution["share_pct"] = (distribution["book_count"] / max(len(clean), 1) * 100).round(2)

    top_books = clean.sort_values(
        ["rating", "rating_count"], ascending=[False, False]
    ).head(20)
    most_reviewed = clean.sort_values("rating_count", ascending=False).head(20)
    publisher_stats = (
        clean["publisher"]
        .dropna()
        .value_counts()
        .rename_axis("publisher")
        .reset_index(name="book_count")
        .head(10)
    )

    figures = {} if args.skip_figures else generate_figures(clean, distribution, publisher_stats, figures_dir)

    top_books.to_csv(analysis_dir / "top_books.csv", index=False, encoding="utf-8-sig")
    most_reviewed.to_csv(
        analysis_dir / "most_reviewed_books.csv", index=False, encoding="utf-8-sig"
    )
    distribution.to_csv(
        analysis_dir / "rating_distribution.csv", index=False, encoding="utf-8-sig"
    )
    publisher_stats.to_csv(
        analysis_dir / "publisher_stats.csv", index=False, encoding="utf-8-sig"
    )

    correlation = (
        rating_series.corr(count_series)
        if rating_series.nunique() > 1 and count_series.nunique() > 1
        else pd.NA
    )
    top_rated = top_books.iloc[0] if not top_books.empty else None
    reviewed = most_reviewed.iloc[0] if not most_reviewed.empty else None
    top_publisher = publisher_stats.iloc[0] if not publisher_stats.empty else None
    common_band = (
        distribution.sort_values("book_count", ascending=False).iloc[0]
        if not distribution.empty
        else None
    )

    summary: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_file": str(input_path),
        "clean_file": str(clean_output),
        "original_rows": original_rows,
        "clean_rows": int(len(clean)),
        "missing_title_removed": missing_title_removed,
        "exact_duplicates_removed": exact_duplicates_removed,
        "title_duplicates_removed": title_duplicates_removed,
        "missing_rating_imputed": int(rating_missing.sum()),
        "invalid_rating_imputed": int(rating_invalid.sum()),
        "missing_rating_count_imputed": int(count_missing.sum()),
        "invalid_rating_count_imputed": int(count_invalid.sum()),
        "mean_rating": round(float(rating_series.mean()), 4),
        "median_rating": round(float(rating_series.median()), 4),
        "min_rating": round(float(rating_series.min()), 4),
        "max_rating": round(float(rating_series.max()), 4),
        "total_rating_count": int(count_series.sum()),
        "median_rating_count": int(count_series.median()),
        "rating_count_correlation": None
        if pd.isna(correlation)
        else round(float(correlation), 4),
        "median_price_cny": None
        if clean["price_cny"].dropna().empty
        else round(float(clean["price_cny"].median()), 2),
        "most_common_rating_band": None
        if common_band is None
        else str(common_band["rating_band"]),
        "top_rated_book": None if top_rated is None else as_native(top_rated["title"]),
        "most_reviewed_book": None if reviewed is None else as_native(reviewed["title"]),
        "top_publisher": None if top_publisher is None else as_native(top_publisher["publisher"]),
    }
    (analysis_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    quality_rows = pd.DataFrame(
        [
            ("原始记录数", original_rows),
            ("清洗后记录数", len(clean)),
            ("删除缺失标题记录", missing_title_removed),
            ("删除完全重复记录", exact_duplicates_removed),
            ("删除重复书名记录", title_duplicates_removed),
            ("缺失评分填补", int(rating_missing.sum())),
            ("异常评分填补", int(rating_invalid.sum())),
            ("缺失评价人数填补", int(count_missing.sum())),
            ("异常评价人数填补", int(count_invalid.sum())),
        ],
        columns=["指标", "数值"],
    )
    overview_rows = pd.DataFrame(
        [
            ("平均评分", f"{rating_series.mean():.2f}"),
            ("评分中位数", f"{rating_series.median():.2f}"),
            ("评分范围", f"{rating_series.min():.1f} - {rating_series.max():.1f}"),
            ("评价人数合计", f"{int(count_series.sum()):,}"),
            ("评价人数中位数", f"{int(count_series.median()):,}"),
            (
                "评分与评价人数相关系数",
                "N/A" if pd.isna(correlation) else f"{correlation:.3f}",
            ),
            (
                "图书价格中位数（元）",
                "N/A" if pd.isna(clean["price_cny"].median()) else f"{clean['price_cny'].median():.2f}",
            ),
        ],
        columns=["指标", "数值"],
    )

    rating_report = distribution.copy()
    rating_report["share_pct"] = rating_report["share_pct"].map(lambda value: f"{value:.2f}%")

    top_report = top_books.head(10)[["rank", "title", "rating", "rating_count", "publisher"]]
    reviewed_report = most_reviewed.head(10)[["rank", "title", "rating", "rating_count"]]
    publisher_report = publisher_stats.rename(columns={"book_count": "入榜图书数"})

    if pd.isna(correlation):
        correlation_text = "评分与评价人数之间无法计算相关性。"
    elif abs(correlation) < 0.2:
        correlation_text = f"评分与评价人数的相关系数为 {correlation:.3f}，两者相关性较弱。"
    elif correlation > 0:
        correlation_text = f"评分与评价人数的相关系数为 {correlation:.3f}，呈正相关。"
    else:
        correlation_text = f"评分与评价人数的相关系数为 {correlation:.3f}，呈负相关。"

    price_median_text = (
        "N/A"
        if summary["median_price_cny"] is None
        else f"{summary['median_price_cny']:.2f}"
    )

    def display_path(value: Path) -> str:
        try:
            return str(value.relative_to(PROJECT_ROOT))
        except ValueError:
            return str(value)

    figure_section = ""
    if figures:
        figures_rel = Path(os.path.relpath(figures_dir, analysis_dir)).as_posix()
        figure_section = f"""## 7. 分析图表

![评分区间分布]({figures_rel}/rating_distribution.png)

![出版社分布]({figures_rel}/publisher_distribution.png)

![评分与评价人数关系]({figures_rel}/rating_vs_reviews.png)

"""

    report = f"""# 豆瓣读书 Top250 数据清洗与分析报告

- 生成时间：{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
- 原始数据：`{display_path(input_path)}`
- 清洗数据：`{display_path(clean_output)}`

## 1. 数据质量

{markdown_table(quality_rows, ['指标', '数值'])}

清洗规则：去除标题为空、完全重复和重复书名的记录；评分限制在 0-10；评价人数只保留数字并转成整数；评分和评价人数缺失或格式异常时使用中位数填补，同时在 `data_quality_flags` 字段中标记。

## 2. 总体统计

{markdown_table(overview_rows, ['指标', '数值'])}

## 3. 评分分布

{markdown_table(rating_report, ['rating_band', 'book_count', 'share_pct'])}

## 4. 评分最高的 10 本书

{markdown_table(top_report, ['rank', 'title', 'rating', 'rating_count', 'publisher'])}

## 5. 评价人数最多的 10 本书

{markdown_table(reviewed_report, ['rank', 'title', 'rating', 'rating_count'])}

## 6. 入榜图书最多的出版社

{markdown_table(publisher_report, ['publisher', '入榜图书数'])}

{figure_section}## 8. 分析结论

- 清洗后共有 **{len(clean)}** 本图书，平均评分 **{rating_series.mean():.2f}**，评分中位数 **{rating_series.median():.2f}**。
- 评分最高的是《{summary['top_rated_book']}》，评价人数最多的是《{summary['most_reviewed_book']}》。
- 评分最集中的区间是 **{summary['most_common_rating_band']}**，共有 **{int(common_band['book_count']) if common_band is not None else 0}** 本。
- {correlation_text}
- 入榜图书最多的出版社是 **{summary['top_publisher']}**；图书价格中位数为 **{price_median_text}** 元。
"""
    (analysis_dir / "report.md").write_text(report, encoding="utf-8")

    print(f"原始记录数: {original_rows}")
    print(f"清洗后记录数: {len(clean)}")
    print(f"重复记录删除: {exact_duplicates_removed + title_duplicates_removed}")
    print(f"缺失/异常评分填补: {int(rating_missing.sum()) + int(rating_invalid.sum())}")
    print(f"缺失/异常评价人数填补: {int(count_missing.sum()) + int(count_invalid.sum())}")
    print(f"平均评分: {rating_series.mean():.2f}")
    print(f"评分中位数: {rating_series.median():.2f}")
    print(f"评分与评价人数相关系数: {'N/A' if pd.isna(correlation) else f'{correlation:.3f}'}")
    print(f"清洗数据: {clean_output}")
    print(f"分析报告: {analysis_dir / 'report.md'}")
    if figures:
        print("图表已刷新:")
        for figure in figures.values():
            print(f"  {figure}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="清洗并分析豆瓣 Top250 原始 CSV")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="原始 CSV 路径")
    parser.add_argument(
        "--clean-output", type=Path, default=DEFAULT_CLEAN_OUTPUT, help="清洗后 CSV 路径"
    )
    parser.add_argument(
        "--analysis-dir", type=Path, default=DEFAULT_ANALYSIS_DIR, help="分析结果目录"
    )
    parser.add_argument(
        "--figures-dir", type=Path, default=None, help="图表输出目录，默认位于分析结果目录下"
    )
    parser.add_argument("--skip-figures", action="store_true", help="跳过图表生成")
    return parser.parse_args()


if __name__ == "__main__":
    main()
