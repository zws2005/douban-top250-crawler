#!/usr/bin/env python3
"""高级分析：历史趋势、中文文本挖掘、多维统计和相似图书推荐。"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

try:
    import jieba
except ImportError:
    jieba = None
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
except ImportError:
    plt = None
    font_manager = None
try:
    from wordcloud import WordCloud
except ImportError:
    WordCloud = None
try:
    from snownlp import SnowNLP
except ImportError:
    SnowNLP = None
try:
    from sklearn.decomposition import LatentDirichletAllocation
    from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    LatentDirichletAllocation = None
    CountVectorizer = None
    TfidfVectorizer = None
    cosine_similarity = None

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CLEAN = ROOT / "data/clean_books.csv"
DEFAULT_ANALYSIS_DIR = ROOT / "analysis"
DEFAULT_FIGURES_DIR = ROOT / "analysis/figures"
DEFAULT_SNAPSHOT_DIR = ROOT / "data/snapshots"
REPORT_MARKER = "<!-- advanced-analysis:start -->"
REPORT_END = "<!-- advanced-analysis:end -->"

STOPWORDS = set("""
的 了 和 是 我 你 他 她 它 我们 你们 他们 这 那 一个 一种 一部 一本 以及 但是 因为 所以
如果 没有 就是 不是 可以 自己 什么 怎么 这个 那个 中国 世界 生活 人生 时间 故事 小说 作品
""".split())

COUNTRIES = {
    "英": "英国", "美": "美国", "法": "法国", "德": "德国", "俄": "俄罗斯", "苏": "苏联",
    "日": "日本", "韩": "韩国", "加": "加拿大", "澳": "澳大利亚", "意": "意大利",
    "西班牙": "西班牙", "瑞典": "瑞典", "瑞士": "瑞士", "奥地利": "奥地利",
    "爱尔兰": "爱尔兰", "印度": "印度", "巴西": "巴西", "哥伦比亚": "哥伦比亚",
    "智利": "智利", "以色列": "以色列", "波兰": "波兰", "捷克": "捷克",
    "丹麦": "丹麦", "挪威": "挪威", "荷兰": "荷兰", "土耳其": "土耳其",
    "希腊": "希腊", "阿根廷": "阿根廷", "秘鲁": "秘鲁", "尼日利亚": "尼日利亚",
    "南非": "南非", "埃及": "埃及", "古": "古希腊", "清": "中国", "明": "中国",
    "宋": "中国", "唐": "中国", "汉": "中国", "民国": "中国",
}

GENRE_RULES = [
    ("小说", ["小说", "长篇", "短篇", "故事", "三部曲", "全集", "村上", "马尔克斯"]),
    ("历史", ["历史", "史记", "资治通鉴", "万历", "明朝", "中国历代", "国史"]),
    ("哲学", ["哲学", "理想国", "存在", "伦理", "形而上学", "庄子", "论语"]),
    ("诗歌", ["诗", "词", "诗经", "唐诗", "宋词", "楚辞", "野草"]),
    ("社会科学", ["社会", "政治", "经济", "文化", "人类学", "社会学", "城乡"]),
    ("传记", ["传", "回忆录", "自传", "人物"]),
    ("科普", ["科学", "数学", "物理", "生物", "宇宙", "时间简史"]),
    ("心理", ["心理", "焦虑", "孤独", "情绪", "自卑"]),
    ("艺术", ["艺术", "设计", "音乐", "摄影", "绘画"]),
]


def find_cjk_font() -> str | None:
    if font_manager is None:
        return None
    for name in ["Noto Sans CJK SC", "WenQuanYi Micro Hei", "Microsoft YaHei", "SimHei"]:
        try:
            return font_manager.findfont(name, fallback_to_default=False)
        except Exception:
            continue
    return None


def setup_plot_font() -> None:
    if plt is None:
        return
    for name in ["Noto Sans CJK SC", "WenQuanYi Micro Hei", "Microsoft YaHei", "SimHei"]:
        if font_manager and name in {font.name for font in font_manager.fontManager.ttflist}:
            plt.rcParams["font.sans-serif"] = [name]
            break
    plt.rcParams["axes.unicode_minus"] = False


def tokenize(text: Any) -> list[str]:
    value = "" if pd.isna(text) else str(text)
    if jieba is not None:
        tokens = jieba.lcut(value)
    else:
        tokens = re.findall(r"[\u4e00-\u9fff]{2,4}", value)
    return [
        token.strip()
        for token in tokens
        if len(token.strip()) >= 2
        and token.strip() not in STOPWORDS
        and re.search(r"[\u4e00-\u9fff]", token)
    ]


def infer_country(author: Any) -> str:
    if pd.isna(author):
        return "未知"
    text = str(author)
    match = re.search(r"[\[【（(]\s*([^\]】）)]+)\s*[\]】）)]", text)
    if match:
        label = match.group(1)
        for key in sorted(COUNTRIES, key=len, reverse=True):
            if key in label:
                return COUNTRIES[key]
        return label
    if re.search(r"[\u4e00-\u9fff]", text):
        return "中国"
    return "未知"


def infer_genre(row: pd.Series) -> str:
    text = " ".join(str(row.get(column, "")) for column in ["title", "subtitle", "quote"])
    best, best_score = "文学", 0
    for genre, keywords in GENRE_RULES:
        score = sum(1 for keyword in keywords if keyword in text)
        if score > best_score:
            best, best_score = genre, score
    return best


def enrich(clean: pd.DataFrame) -> pd.DataFrame:
    df = clean.copy()
    df["country"] = df["author"].map(infer_country)
    df["genre"] = df.apply(infer_genre, axis=1)
    df["search_text"] = df.apply(
        lambda row: " ".join(
            str(row.get(column, ""))
            for column in ["title", "subtitle", "author", "publisher", "quote", "country", "genre"]
        ),
        axis=1,
    )
    return df


def save_snapshot(enriched: pd.DataFrame, snapshot_dir: Path) -> None:
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    date = datetime.now().astimezone().strftime("%Y-%m-%d")
    snapshot = enriched.copy()
    snapshot["snapshot_date"] = date
    snapshot.to_csv(snapshot_dir / f"{date}.csv", index=False, encoding="utf-8-sig")


def build_trends(snapshot_dir: Path, analysis_dir: Path, figures_dir: Path) -> dict[str, Any]:
    files = sorted(snapshot_dir.glob("*.csv"))
    if not files:
        return {}
    frames = [pd.read_csv(file, encoding="utf-8-sig") for file in files]
    history = pd.concat(frames, ignore_index=True)
    history["snapshot_date"] = history["snapshot_date"].astype(str)

    daily = (
        history.groupby("snapshot_date", as_index=False)
        .agg(
            book_count=("title", "count"),
            mean_rating=("rating", "mean"),
            median_rating=("rating", "median"),
            total_rating_count=("rating_count", "sum"),
            median_rating_count=("rating_count", "median"),
        )
        .sort_values("snapshot_date")
    )
    daily.to_csv(analysis_dir / "trend_summary.csv", index=False, encoding="utf-8-sig")

    latest = history[history["snapshot_date"] == history["snapshot_date"].max()]
    top_titles = latest.sort_values("rank").head(10)["title"].tolist()
    top_history = history[history["title"].isin(top_titles)].sort_values(
        ["snapshot_date", "rank"]
    )
    top_history.to_csv(analysis_dir / "trend_top_books.csv", index=False, encoding="utf-8-sig")

    if plt is not None:
        setup_plot_font()
        figures_dir.mkdir(parents=True, exist_ok=True)
        fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
        axes[0].plot(daily["snapshot_date"], daily["mean_rating"], marker="o", color="#2563EB")
        axes[0].set_title("平均评分变化")
        axes[0].set_ylim(max(0, daily["mean_rating"].min() - 0.2), min(10, daily["mean_rating"].max() + 0.2))
        axes[0].grid(axis="y", linestyle="--", alpha=0.25)
        axes[0].tick_params(axis="x", rotation=20)
        axes[1].plot(daily["snapshot_date"], daily["total_rating_count"], marker="o", color="#0EA5E9")
        axes[1].set_title("评价人数总量变化")
        axes[1].grid(axis="y", linestyle="--", alpha=0.25)
        axes[1].tick_params(axis="x", rotation=20)
        if len(daily) == 1:
            fig.text(0.5, 0.01, "当前仅 1 个快照，后续运行会自动形成趋势", ha="center", fontsize=9, color="#64748B")
        fig.tight_layout(rect=(0, 0.04, 1, 1))
        fig.savefig(figures_dir / "trend_overview.png", dpi=220, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        if len(top_titles) > 0:
            fig, ax = plt.subplots(figsize=(9, 4.8))
            for title in top_titles[:8]:
                series = top_history[top_history["title"] == title]
                ax.plot(series["snapshot_date"], series["rank"], marker="o", label=title)
            ax.invert_yaxis()
            ax.set_title("头部图书排名变化")
            ax.set_ylabel("排名")
            ax.grid(axis="y", linestyle="--", alpha=0.25)
            ax.legend(fontsize=7, ncol=2, loc="best")
            ax.tick_params(axis="x", rotation=20)
            fig.tight_layout()
            fig.savefig(figures_dir / "rank_trend.png", dpi=220, bbox_inches="tight", facecolor="white")
            plt.close(fig)

    return {
        "snapshot_count": int(daily.shape[0]),
        "latest_date": str(daily.iloc[-1]["snapshot_date"]),
        "latest_mean_rating": round(float(daily.iloc[-1]["mean_rating"]), 4),
        "latest_total_rating_count": int(daily.iloc[-1]["total_rating_count"]),
    }


def build_text_analysis(
    enriched: pd.DataFrame,
    analysis_dir: Path,
    figures_dir: Path,
    topic_count: int,
) -> dict[str, Any]:
    quotes = enriched[enriched["quote"].notna()].copy()
    if quotes.empty:
        return {}
    token_docs = [tokenize(text) for text in quotes["quote"]]
    frequencies = Counter(token for doc in token_docs for token in doc)
    word_freq = pd.DataFrame(frequencies.most_common(100), columns=["word", "count"])
    word_freq.to_csv(analysis_dir / "quote_word_freq.csv", index=False, encoding="utf-8-sig")

    figures_dir.mkdir(parents=True, exist_ok=True)
    if WordCloud is not None and frequencies:
        font_path = find_cjk_font()
        cloud = WordCloud(
            width=1400,
            height=800,
            background_color="white",
            font_path=font_path,
            max_words=100,
            colormap="viridis",
        ).generate_from_frequencies(dict(frequencies))
        cloud.to_file(figures_dir / "quote_wordcloud.png")

    sentiment_data: list[dict[str, Any]] = []
    if SnowNLP is not None:
        for _, row in quotes.iterrows():
            try:
                score = float(SnowNLP(str(row["quote"])).sentiments)
            except Exception:
                continue
            sentiment_data.append(
                {"title": row["title"], "quote": row["quote"], "sentiment": round(score, 4)}
            )
    sentiment = pd.DataFrame(sentiment_data)
    sentiment_summary: dict[str, Any] = {}
    if not sentiment.empty:
        sentiment.to_csv(analysis_dir / "quote_sentiment.csv", index=False, encoding="utf-8-sig")
        sentiment["label"] = pd.cut(
            sentiment["sentiment"], [-0.01, 0.4, 0.6, 1.01], labels=["负面", "中性", "正面"]
        )
        sentiment_summary = {
            "mean": round(float(sentiment["sentiment"].mean()), 4),
            "positive_share": round(float((sentiment["sentiment"] > 0.6).mean()), 4),
            "negative_share": round(float((sentiment["sentiment"] < 0.4).mean()), 4),
            "count": int(len(sentiment)),
        }
        if plt is not None:
            setup_plot_font()
            fig, ax = plt.subplots(figsize=(8, 4.2))
            ax.hist(sentiment["sentiment"], bins=20, color="#60A5FA", edgecolor="white")
            ax.set_title("短评情感得分分布")
            ax.set_xlabel("情感得分（0 负面 - 1 正面）")
            ax.set_ylabel("短评数量")
            ax.grid(axis="y", linestyle="--", alpha=0.25)
            ax.spines[["top", "right"]].set_visible(False)
            fig.tight_layout()
            fig.savefig(figures_dir / "sentiment_distribution.png", dpi=220, bbox_inches="tight", facecolor="white")
            plt.close(fig)

    topics = pd.DataFrame()
    if LatentDirichletAllocation is not None and CountVectorizer is not None and len(token_docs) >= 2:
        vectorizer = CountVectorizer(analyzer=lambda doc: doc, min_df=1, max_features=500)
        matrix = vectorizer.fit_transform(token_docs)
        if matrix.shape[1] > 0:
            n_topics = min(topic_count, max(1, matrix.shape[0]))
            model = LatentDirichletAllocation(
                n_components=n_topics, random_state=42, learning_method="batch"
            )
            model.fit(matrix)
            terms = vectorizer.get_feature_names_out()
            rows = []
            for topic_id, weights in enumerate(model.components_):
                words = [terms[index] for index in weights.argsort()[-8:][::-1]]
                rows.append(
                    {
                        "topic": f"主题{topic_id + 1}",
                        "keywords": "、".join(words),
                        "weight": round(float(weights.sum()), 4),
                    }
                )
            topics = pd.DataFrame(rows)
            topics.to_csv(analysis_dir / "quote_topics.csv", index=False, encoding="utf-8-sig")

    return {
        "quote_count": int(len(quotes)),
        "top_words": ", ".join(word_freq.head(10)["word"].tolist()),
        "sentiment": sentiment_summary,
        "topic_count": int(len(topics)),
        "topic_keywords": topics["keywords"].tolist() if not topics.empty else [],
    }


def build_dimension_analysis(
    enriched: pd.DataFrame,
    analysis_dir: Path,
    figures_dir: Path,
) -> dict[str, Any]:
    country = (
        enriched.groupby("country", as_index=False)
        .agg(book_count=("title", "count"), mean_rating=("rating", "mean"), total_rating_count=("rating_count", "sum"))
        .sort_values(["book_count", "mean_rating"], ascending=False)
    )
    genre = (
        enriched.groupby("genre", as_index=False)
        .agg(book_count=("title", "count"), mean_rating=("rating", "mean"), total_rating_count=("rating_count", "sum"))
        .sort_values(["book_count", "mean_rating"], ascending=False)
    )
    authors = (
        enriched["author"].dropna().value_counts().head(15).rename_axis("author").reset_index(name="book_count")
    )
    country.to_csv(analysis_dir / "country_stats.csv", index=False, encoding="utf-8-sig")
    genre.to_csv(analysis_dir / "genre_stats.csv", index=False, encoding="utf-8-sig")
    authors.to_csv(analysis_dir / "author_stats.csv", index=False, encoding="utf-8-sig")

    if plt is not None:
        setup_plot_font()
        figures_dir.mkdir(parents=True, exist_ok=True)
        fig, axes = plt.subplots(2, 2, figsize=(12, 9))
        country.head(8).sort_values("book_count").plot.barh(
            x="country", y="book_count", ax=axes[0, 0], color="#60A5FA", legend=False
        )
        axes[0, 0].set_title("国家/地区分布")
        genre.head(8).sort_values("book_count").plot.barh(
            x="genre", y="book_count", ax=axes[0, 1], color="#34D399", legend=False
        )
        axes[0, 1].set_title("题材分布")
        authors.head(8).sort_values("book_count").plot.barh(
            x="author", y="book_count", ax=axes[1, 0], color="#F59E0B", legend=False
        )
        axes[1, 0].set_title("作者入榜数量")
        publisher = enriched["publisher"].dropna().value_counts().head(8).sort_values()
        publisher.plot.barh(ax=axes[1, 1], color="#A78BFA", legend=False)
        axes[1, 1].set_title("出版社入榜数量")
        for ax in axes.flat:
            ax.grid(axis="x", linestyle="--", alpha=0.2)
            ax.spines[["top", "right"]].set_visible(False)
        fig.tight_layout()
        fig.savefig(figures_dir / "multidim_stats.png", dpi=220, bbox_inches="tight", facecolor="white")
        plt.close(fig)

    return {
        "top_country": str(country.iloc[0]["country"]) if not country.empty else None,
        "top_genre": str(genre.iloc[0]["genre"]) if not genre.empty else None,
        "top_author": str(authors.iloc[0]["author"]) if not authors.empty else None,
    }


def build_similarity(enriched: pd.DataFrame) -> tuple[pd.DataFrame, Any, Any]:
    token_docs = [tokenize(text) for text in enriched["search_text"]]
    if TfidfVectorizer is None or cosine_similarity is None:
        return pd.DataFrame(), None, None
    vectorizer = TfidfVectorizer(analyzer=lambda doc: doc, min_df=1, max_features=2500)
    matrix = vectorizer.fit_transform(token_docs)
    similarity = cosine_similarity(matrix)
    return enriched, similarity, token_docs


def build_recommendations(enriched: pd.DataFrame, analysis_dir: Path, top_n: int = 5) -> pd.DataFrame:
    _, similarity, _ = build_similarity(enriched)
    if similarity is None:
        return pd.DataFrame()
    rows = []
    titles = enriched["title"].tolist()
    ratings = enriched["rating"].tolist()
    for index, title in enumerate(titles):
        order = similarity[index].argsort()[::-1]
        count = 0
        for other in order:
            if other == index or ratings[other] < 9.0:
                continue
            rows.append(
                {
                    "title": title,
                    "recommended_title": titles[other],
                    "similarity": round(float(similarity[index][other]), 4),
                    "rating": round(float(ratings[other]), 1),
                }
            )
            count += 1
            if count >= top_n:
                break
    result = pd.DataFrame(rows, columns=["title", "recommended_title", "similarity", "rating"])
    result.to_csv(analysis_dir / "similar_books.csv", index=False, encoding="utf-8-sig")
    return result


def markdown_table(frame: pd.DataFrame) -> str:
    lines = ["| " + " | ".join(frame.columns) + " |", "| " + " | ".join("---" for _ in frame.columns) + " |"]
    for _, row in frame.iterrows():
        cells = ["" if pd.isna(value) else (f"{value:.2f}" if isinstance(value, float) else str(value)) for value in row]
        lines.append("| " + " | ".join(cell.replace("|", "\\|") for cell in cells) + " |")
    return "\n".join(lines)


def append_report(
    analysis_dir: Path,
    trend: dict[str, Any],
    text: dict[str, Any],
    dimensions: dict[str, Any],
    recommendations: pd.DataFrame,
) -> None:
    report_path = analysis_dir / "report.md"
    original = report_path.read_text(encoding="utf-8") if report_path.exists() else ""
    if REPORT_MARKER in original:
        original = original.split(REPORT_MARKER)[0].rstrip() + "\n"
    top_rec = (
        recommendations[recommendations["title"] == "红楼梦"].head(5)
        if "title" in recommendations.columns
        else recommendations
    )
    if top_rec.empty:
        top_rec = recommendations.head(5)

    text_lines = []
    if text:
        sentiment = text.get("sentiment", {})
        text_lines.append(f"- 有效短评：**{text.get('quote_count', 0)}** 条")
        text_lines.append(f"- 高频词：{text.get('top_words', '')}")
        if sentiment:
            text_lines.append(
                f"- 情感均值：**{sentiment.get('mean', 0):.3f}**；正面占比 **{sentiment.get('positive_share', 0) * 100:.1f}%**；负面占比 **{sentiment.get('negative_share', 0) * 100:.1f}%**"
            )
        if text.get("topic_keywords"):
            text_lines.append("- 主题关键词：" + "；".join(text["topic_keywords"][:5]))

    section = f"""{REPORT_MARKER}
## 9. 高级分析

### 9.1 历史趋势

- 已记录快照：**{trend.get('snapshot_count', 0)}** 个
- 最新快照日期：**{trend.get('latest_date', 'N/A')}**
- 最新平均评分：**{trend.get('latest_mean_rating', 0):.2f}**
- 最新评价人数合计：**{trend.get('latest_total_rating_count', 0):,}**

![历史趋势](figures/trend_overview.png)

![排名变化](figures/rank_trend.png)

### 9.2 短评文本分析

{chr(10).join(text_lines) if text_lines else '- 当前没有可分析的短评文本。'}

![短评词云](figures/quote_wordcloud.png)

![情感分布](figures/sentiment_distribution.png)

### 9.3 多维统计

- 入榜最多的国家/地区：**{dimensions.get('top_country', 'N/A')}**
- 最常见的题材：**{dimensions.get('top_genre', 'N/A')}**
- 入榜最多的作者：**{dimensions.get('top_author', 'N/A')}**

![多维统计](figures/multidim_stats.png)

### 9.4 相似高分书推荐

根据书名、作者、出版社、短评、国家和题材构建 TF-IDF 特征，并按余弦相似度推荐评分不低于 9.0 的图书。

{markdown_table(top_rec[['title', 'recommended_title', 'similarity', 'rating']]) if not top_rec.empty else '当前没有推荐结果。'}

{REPORT_END}
"""
    report_path.write_text(original + "\n\n" + section, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="豆瓣 Top250 高级分析")
    parser.add_argument("--clean", type=Path, default=DEFAULT_CLEAN)
    parser.add_argument("--analysis-dir", type=Path, default=DEFAULT_ANALYSIS_DIR)
    parser.add_argument("--figures-dir", type=Path, default=DEFAULT_FIGURES_DIR)
    parser.add_argument("--snapshot-dir", type=Path, default=DEFAULT_SNAPSHOT_DIR)
    parser.add_argument("--topics", type=int, default=5)
    parser.add_argument("--top-n", type=int, default=5)
    args = parser.parse_args()

    analysis_dir = args.analysis_dir.resolve()
    figures_dir = args.figures_dir.resolve()
    snapshot_dir = args.snapshot_dir.resolve()
    if not args.clean.exists():
        raise SystemExit(f"清洗数据不存在: {args.clean}，请先运行 npm run analyze")
    analysis_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    enriched = enrich(pd.read_csv(args.clean, encoding="utf-8-sig"))
    enriched.to_csv(analysis_dir / "books_enriched.csv", index=False, encoding="utf-8-sig")
    save_snapshot(enriched, snapshot_dir)

    trend = build_trends(snapshot_dir, analysis_dir, figures_dir)
    text = build_text_analysis(enriched, analysis_dir, figures_dir, args.topics)
    dimensions = build_dimension_analysis(enriched, analysis_dir, figures_dir)
    recommendations = build_recommendations(enriched, analysis_dir, args.top_n)
    append_report(analysis_dir, trend, text, dimensions, recommendations)

    summary = {
        "generated_at": datetime.now().astimezone().isoformat(),
        "trend": trend,
        "text": text,
        "dimensions": dimensions,
        "recommendation_rows": int(len(recommendations)),
        "recommendation_file": "analysis/similar_books.csv",
    }
    (analysis_dir / "advanced_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"增强数据: {analysis_dir / 'books_enriched.csv'}")
    print(f"趋势快照: {snapshot_dir}")
    print(f"词频: {analysis_dir / 'quote_word_freq.csv'}")
    print(f"情感: {analysis_dir / 'quote_sentiment.csv'}")
    print(f"主题: {analysis_dir / 'quote_topics.csv'}")
    print(f"多维统计: {analysis_dir / 'country_stats.csv'}, {analysis_dir / 'genre_stats.csv'}")
    print(f"推荐: {analysis_dir / 'similar_books.csv'}")
    print(f"图表: {figures_dir}")


if __name__ == "__main__":
    main()
