#!/usr/bin/env python3
"""查询相似高分书推荐。"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from advanced_analysis import ROOT, build_similarity

DEFAULT_ENRICHED = ROOT / "analysis/books_enriched.csv"


def main() -> None:
    parser = argparse.ArgumentParser(description="相似高分书推荐")
    parser.add_argument("title", help="书名，例如：红楼梦")
    parser.add_argument("--top", type=int, default=5)
    parser.add_argument("--enriched", type=Path, default=DEFAULT_ENRICHED)
    args = parser.parse_args()

    if not args.enriched.exists():
        raise SystemExit("缺少 analysis/books_enriched.csv，请先运行 npm run analyze")
    enriched = pd.read_csv(args.enriched, encoding="utf-8-sig")
    matches = enriched[enriched["title"].astype(str).str.contains(args.title, regex=False)]
    if matches.empty:
        raise SystemExit(f"没有找到书名包含“{args.title}”的图书")
    index = int(matches.index[0])
    title = enriched.loc[index, "title"]
    _, similarity, _ = build_similarity(enriched)
    if similarity is None:
        raise SystemExit("缺少 scikit-learn，无法计算相似推荐")

    order = similarity[index].argsort()[::-1]
    rows = []
    for other in order:
        if other == index or float(enriched.loc[other, "rating"]) < 9.0:
            continue
        rows.append(
            {
                "书名": enriched.loc[other, "title"],
                "评分": enriched.loc[other, "rating"],
                "相似度": round(float(similarity[index][other]), 4),
                "出版社": enriched.loc[other, "publisher"],
            }
        )
        if len(rows) >= args.top:
            break
    print(f"与《{title}》相似的高分书：")
    print(pd.DataFrame(rows).to_string(index=False))


if __name__ == "__main__":
    main()
