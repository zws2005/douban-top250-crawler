#!/usr/bin/env python3
"""Generate a dependency-free static dashboard from the analysis outputs."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ANALYSIS = ROOT / "analysis"
DEFAULT_OUTPUT = ROOT / "dashboard"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def main() -> None:
    parser = argparse.ArgumentParser(description="生成豆瓣 Top250 静态数据看板")
    parser.add_argument("--analysis-dir", type=Path, default=DEFAULT_ANALYSIS)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    analysis = args.analysis_dir.resolve()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    figure_target = output / "figures"
    figure_target.mkdir(parents=True, exist_ok=True)

    for name in [
        "rating_distribution.png",
        "publisher_distribution.png",
        "rating_vs_reviews.png",
        "trend_overview.png",
        "rank_trend.png",
        "quote_wordcloud.png",
        "sentiment_distribution.png",
        "multidim_stats.png",
    ]:
        source = analysis / "figures" / name
        if source.exists():
            shutil.copy2(source, figure_target / name)

    books_path = analysis / "books_enriched.csv"
    if not books_path.exists():
        raise SystemExit("缺少 analysis/books_enriched.csv，请先运行 npm run analyze")
    books = pd.read_csv(books_path, encoding="utf-8-sig").fillna("")
    books["rating"] = pd.to_numeric(books["rating"], errors="coerce").fillna(0)
    books["rating_count"] = pd.to_numeric(books["rating_count"], errors="coerce").fillna(0).astype(int)
    books = books.sort_values("rank")

    recommendations = pd.read_csv(analysis / "similar_books.csv", encoding="utf-8-sig").fillna("") if (analysis / "similar_books.csv").exists() else pd.DataFrame()
    rec_map: dict[str, list[dict]] = {}
    for _, row in recommendations.iterrows():
        rec_map.setdefault(str(row["title"]), []).append(
            {
                "title": str(row["recommended_title"]),
                "similarity": float(row["similarity"]),
                "rating": float(row["rating"]),
            }
        )

    rating_dist = pd.read_csv(analysis / "rating_distribution.csv", encoding="utf-8-sig").fillna("")
    country = pd.read_csv(analysis / "country_stats.csv", encoding="utf-8-sig").fillna("") if (analysis / "country_stats.csv").exists() else pd.DataFrame()
    genre = pd.read_csv(analysis / "genre_stats.csv", encoding="utf-8-sig").fillna("") if (analysis / "genre_stats.csv").exists() else pd.DataFrame()
    topics = pd.read_csv(analysis / "quote_topics.csv", encoding="utf-8-sig").fillna("") if (analysis / "quote_topics.csv").exists() else pd.DataFrame()
    trend = pd.read_csv(analysis / "trend_summary.csv", encoding="utf-8-sig").fillna("") if (analysis / "trend_summary.csv").exists() else pd.DataFrame()
    summary = read_json(analysis / "summary.json")
    advanced = read_json(analysis / "advanced_summary.json")

    payload = {
        "summary": summary,
        "advanced": advanced,
        "books": books[
            ["rank", "title", "author", "publisher", "country", "genre", "rating", "rating_count", "quote", "url"]
        ].to_dict(orient="records"),
        "recommendations": rec_map,
        "ratingDistribution": rating_dist.to_dict(orient="records"),
        "countries": country.head(10).to_dict(orient="records"),
        "genres": genre.head(10).to_dict(orient="records"),
        "topics": topics.to_dict(orient="records"),
        "trend": trend.to_dict(orient="records"),
    }
    data_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    html = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>豆瓣读书 Top250 数据看板</title>
<style>
:root {{ --bg:#f5f7fb; --card:#fff; --text:#172033; --muted:#64748b; --line:#e2e8f0; --brand:#2563eb; --brand2:#0ea5e9; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; font-family:system-ui,-apple-system,"Noto Sans CJK SC","Microsoft YaHei",sans-serif; background:var(--bg); color:var(--text); }}
header {{ padding:34px clamp(18px,5vw,72px) 24px; background:linear-gradient(130deg,#0f172a,#1e3a8a); color:white; }}
h1 {{ margin:0 0 8px; font-size:clamp(25px,4vw,42px); }}
header p {{ margin:0; color:#cbd5e1; }}
nav {{ position:sticky; top:0; z-index:2; background:rgba(255,255,255,.96); border-bottom:1px solid var(--line); padding:10px clamp(18px,5vw,72px); display:flex; gap:18px; overflow:auto; }}
nav a {{ color:#334155; text-decoration:none; white-space:nowrap; font-size:14px; }}
nav a:hover {{ color:var(--brand); }}
main {{ padding:24px clamp(18px,5vw,72px) 60px; max-width:1400px; margin:auto; }}
section {{ margin:0 0 42px; scroll-margin-top:65px; }}
h2 {{ margin:0 0 16px; font-size:23px; }}
.stats {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-top:-45px; position:relative; z-index:1; }}
.stat {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; box-shadow:0 8px 24px rgba(15,23,42,.06); }}
.stat b {{ display:block; font-size:26px; color:var(--brand); margin-bottom:5px; }}
.stat span {{ color:var(--muted); font-size:13px; }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(310px,1fr)); gap:18px; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; }}
.card h3 {{ margin:0 0 14px; font-size:17px; }}
.bar-row {{ display:grid; grid-template-columns:115px 1fr 38px; gap:10px; align-items:center; margin:9px 0; font-size:13px; }}
.bar-track {{ height:10px; background:#e8eef8; border-radius:999px; overflow:hidden; }}
.bar-fill {{ height:100%; background:linear-gradient(90deg,var(--brand2),var(--brand)); border-radius:999px; }}
table {{ width:100%; border-collapse:collapse; font-size:13px; }}
th,td {{ padding:10px 8px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }}
th {{ color:var(--muted); font-weight:600; background:#f8fafc; position:sticky; top:50px; }}
tbody tr:hover {{ background:#f8fbff; }}
input,select {{ padding:10px 12px; border:1px solid #cbd5e1; border-radius:9px; font:inherit; background:white; }}
.search {{ display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }}
.search input {{ min-width:260px; flex:1; }}
.gallery {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:16px; }}
.gallery img,.wide-img {{ width:100%; border:1px solid var(--line); border-radius:12px; background:white; }}
.insight {{ color:var(--muted); line-height:1.8; }}
.pill {{ display:inline-block; padding:4px 9px; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-size:12px; margin:3px 4px 3px 0; }}
.muted {{ color:var(--muted); }}
</style>
</head>
<body>
<header>
  <h1>豆瓣读书 Top250 数据看板</h1>
  <p>抓取、清洗、文本挖掘、趋势与相似推荐 · 生成时间：<span id="generated"></span></p>
</header>
<nav>
  <a href="#overview">总览</a><a href="#trend">历史趋势</a><a href="#text">文本分析</a>
  <a href="#dimensions">多维统计</a><a href="#books">图书检索</a><a href="#recommend">相似推荐</a>
</nav>
<main>
  <div class="stats" id="stats"></div>
  <section id="overview">
    <h2>数据总览</h2>
    <div class="grid">
      <div class="card"><h3>评分区间分布</h3><div id="rating-bars"></div></div>
      <div class="card"><h3>国家/地区分布</h3><div id="country-bars"></div></div>
      <div class="card"><h3>题材分布</h3><div id="genre-bars"></div></div>
    </div>
    <div class="card" style="margin-top:18px"><h3>核心结论</h3><div class="insight" id="insights"></div></div>
  </section>
  <section id="trend">
    <h2>历史趋势</h2>
    <p class="insight">每次运行 analyze 会把当天数据加入 data/snapshots，重复运行会形成长期趋势。</p>
    <img class="wide-img" src="figures/trend_overview.png" alt="历史趋势">
    <img class="wide-img" src="figures/rank_trend.png" alt="排名变化" style="margin-top:16px">
  </section>
  <section id="text">
    <h2>短评文本分析</h2>
    <div class="grid">
      <div class="card"><h3>中文词云</h3><img class="wide-img" src="figures/quote_wordcloud.png" alt="词云"></div>
      <div class="card"><h3>情感分布</h3><img class="wide-img" src="figures/sentiment_distribution.png" alt="情感分布"><div id="sentiment" class="insight" style="margin-top:12px"></div></div>
    </div>
    <div class="card" style="margin-top:18px"><h3>主题模型</h3><div id="topics"></div></div>
  </section>
  <section id="dimensions">
    <h2>多维统计</h2>
    <img class="wide-img" src="figures/multidim_stats.png" alt="多维统计">
  </section>
  <section id="books">
    <h2>图书检索</h2>
    <div class="search">
      <input id="book-search" placeholder="输入书名、作者、出版社、国家或题材">
      <span class="muted" id="book-count"></span>
    </div>
    <div class="card" style="overflow:auto;max-height:650px">
      <table><thead><tr><th>排名</th><th>书名</th><th>作者</th><th>出版社</th><th>国家</th><th>题材</th><th>评分</th><th>评价人数</th><th>短评</th></tr></thead><tbody id="book-body"></tbody></table>
    </div>
  </section>
  <section id="recommend">
    <h2>相似高分书推荐</h2>
    <div class="search"><select id="recommend-select"></select><span class="muted">基于书名、作者、出版社、短评、国家和题材的 TF-IDF 余弦相似度</span></div>
    <div class="card"><table><thead><tr><th>推荐图书</th><th>评分</th><th>相似度</th></tr></thead><tbody id="recommend-body"></tbody></table></div>
  </section>
  <section id="figures">
    <h2>分析图表</h2>
    <div class="gallery">
      <img src="figures/rating_distribution.png" alt="评分分布">
      <img src="figures/publisher_distribution.png" alt="出版社分布">
      <img src="figures/rating_vs_reviews.png" alt="评分与评价人数">
    </div>
  </section>
</main>
<script>
const D = {data_json};
const fmt = n => Number(n || 0).toLocaleString('zh-CN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}}[c]));
document.getElementById('generated').textContent = D.advanced.generated_at || D.summary.generated_at || '未知';
document.getElementById('stats').innerHTML = [
  [fmt(D.summary.clean_rows), '清洗后图书'],
  [Number(D.summary.mean_rating || 0).toFixed(2), '平均评分'],
  [fmt(D.summary.total_rating_count), '评价人数合计'],
  [fmt(D.advanced.trend?.snapshot_count || 0), '历史快照'],
  [fmt(D.advanced.text?.quote_count || 0), '有效短评'],
].map(([v,l]) => `<div class="stat"><b>${{v}}</b><span>${{l}}</span></div>`).join('');
function bars(target, rows, labelKey, valueKey, limit=8) {{
  const data = rows.slice(0,limit); const max = Math.max(1,...data.map(r=>Number(r[valueKey]||0)));
  document.getElementById(target).innerHTML = data.map(r => `<div class="bar-row"><span>${{esc(r[labelKey])}}</span><div class="bar-track"><div class="bar-fill" style="width:${{Math.max(2,Number(r[valueKey])/max*100)}}%"></div></div><span>${{fmt(r[valueKey])}}</span></div>`).join('');
}}
bars('rating-bars', D.ratingDistribution, 'rating_band', 'book_count');
bars('country-bars', D.countries, 'country', 'book_count');
bars('genre-bars', D.genres, 'genre', 'book_count');
const t = D.advanced.text || {{}}; const s = t.sentiment || {{}};
document.getElementById('insights').innerHTML = `
  <p>评分最集中区间：<b>${{esc(D.summary.most_common_rating_band || 'N/A')}}</b>；评分最高：<b>《${{esc(D.summary.top_rated_book || 'N/A')}}》</b>；评价人数最多：<b>《${{esc(D.summary.most_reviewed_book || 'N/A')}}》</b>。</p>
  <p>入榜最多国家/地区：<b>${{esc(D.advanced.dimensions?.top_country || 'N/A')}}</b>；最常见题材：<b>${{esc(D.advanced.dimensions?.top_genre || 'N/A')}}</b>；入榜最多作者：<b>${{esc(D.advanced.dimensions?.top_author || 'N/A')}}</b>。</p>`;
document.getElementById('sentiment').innerHTML = s.mean == null ? '暂无情感结果' : `情感均值 <b>${{Number(s.mean).toFixed(3)}}</b>；正面占比 <b>${{(Number(s.positive_share)*100).toFixed(1)}}%</b>；负面占比 <b>${{(Number(s.negative_share)*100).toFixed(1)}}%</b>`;
document.getElementById('topics').innerHTML = (D.topics||[]).map(r=>`<p><span class="pill">${{esc(r.topic)}}</span>${{esc(r.keywords)}}</p>`).join('') || '<span class="muted">暂无主题结果</span>';
const books = D.books || [];
const bookBody = document.getElementById('book-body');
function renderBooks(q='') {{
  const needle = q.trim().toLowerCase();
  const rows = books.filter(b => !needle || ['title','author','publisher','country','genre','quote'].some(k=>String(b[k]||'').toLowerCase().includes(needle))).slice(0,80);
  document.getElementById('book-count').textContent = `显示 ${{rows.length}} / ${{books.length}} 本`;
  bookBody.innerHTML = rows.map(b=>`<tr><td>${{b.rank}}</td><td><a href="${{esc(b.url)}}" target="_blank" rel="noreferrer">${{esc(b.title)}}</a></td><td>${{esc(b.author)}}</td><td>${{esc(b.publisher)}}</td><td>${{esc(b.country)}}</td><td>${{esc(b.genre)}}</td><td>${{Number(b.rating).toFixed(1)}}</td><td>${{fmt(b.rating_count)}}</td><td>${{esc(b.quote)}}</td></tr>`).join('');
}}
renderBooks();
document.getElementById('book-search').addEventListener('input', e => renderBooks(e.target.value));
const select = document.getElementById('recommend-select');
select.innerHTML = books.filter(b=>D.recommendations[b.title]?.length).map(b=>`<option value="${{esc(b.title)}}">${{esc(b.title)}}</option>`).join('');
function renderRecs(title) {{
  const rows = D.recommendations[title] || [];
  document.getElementById('recommend-body').innerHTML = rows.map(r=>`<tr><td>《${{esc(r.title)}}》</td><td>${{Number(r.rating).toFixed(1)}}</td><td>${{Number(r.similarity).toFixed(4)}}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">暂无推荐</td></tr>';
}}
renderRecs(select.value); select.addEventListener('change', e=>renderRecs(e.target.value));
</script>
</body>
</html>
"""
    (output / "index.html").write_text(html, encoding="utf-8")
    print(f"看板: {output / 'index.html'}")


if __name__ == "__main__":
    main()
