# 豆瓣读书 Top250 爬虫与数据分析

一个可复现的 **TypeScript 爬虫 + Python/pandas 清洗分析** 项目。爬虫抓取豆瓣读书 Top250 的书名、评分、评价人数、作者信息、出版社、出版日期、价格、简介、详情链接等字段，并输出原始数据与清洗分析结果。

## 环境要求

- Node.js >= 18.17（使用内置 `fetch`）
- Python >= 3.10
- pandas、matplotlib、jieba、wordcloud、snownlp、scikit-learn

## 快速开始

```bash
cd 数据爬虫/douban-top250-crawler

# 安装 TypeScript 依赖
npm install

# 单元与清洗测试（不访问网络）
npm run test:all

# 真实网页 fetch 测试（访问第一页并验证解析结果）
npm run fetch:test

# 抓取全部 10 页，共 250 条，默认页间隔 1.5 秒
npm run crawl

# 创建 Python 虚拟环境并安装分析依赖
python3 -m venv --system-site-packages .venv
python -m pip install -r requirements.txt

# 清洗数据、生成高级分析、图表和看板
npm run analyze
```

也可以一次执行抓取、清洗、高级分析和看板生成：

```bash
npm run pipeline
```

高级分析包含：

- 历史快照与评分/评价人数/排名趋势
- 短评中文分词、词云、情感分析和 LDA 主题模型
- 国家/地区、题材、作者、出版社多维统计
- 静态交互式 Web 看板
- 基于 TF-IDF 的相似高分书推荐

```bash
# 生成并刷新静态看板
npm run dashboard

# 启动本地看板服务
npm run dashboard:serve

# 查询相似高分书
npm run recommend -- 红楼梦 --top 5
```

趋势数据保存在 `data/snapshots/`，每次运行 `npm run analyze` 会保存当天快照。只有持续多天运行后，趋势图才会形成真正的长期曲线。

只抓取前两页、调整请求间隔或输出位置：

```bash
npm run crawl -- --pages 2 --delay-ms 2000
npm run crawl -- --pages 10 --output data/raw_books.csv
npm run crawl -- --help
```

## 爬虫 Agent（DeepSeek Harness Core 精简版）

项目内新增了 `src/core/`，按 DeepSeek Harness 的 core 目录组织，并用最小实现移植其关键模式：

- `SessionLog`：append-only JSONL 事件日志
- `ToolRegistry`：工具注册、Schema 和统一错误处理
- `AgentLoop`：模型调用、工具调用、结果回填和最大步数限制
- `LlmProvider`：可替换的模型提供方接口
- DeepSeek Provider：兼容 DeepSeek Chat Completions API
- 默认工具：`fetch_top250_page`、`crawl_top250`、`read_books_csv`、`analyze_books`

无 API Key 时运行离线演示（只抓取第一页，不修改数据）：

```bash
npm run agent:demo
```

使用 DeepSeek 模型运行：

```bash
export DEEPSEEK_API_KEY="你的 API Key"
npm run agent -- "抓取豆瓣 Top250 前 2 页，保存原始数据并分析"
```

可选环境变量：

```bash
export DEEPSEEK_BASE_URL="https://api.deepseek.com"
export DEEPSEEK_MODEL="deepseek-chat"
```

每次 Agent 运行都会保存会话事件到 `data/agent-sessions/<session-id>.jsonl`。来源和许可证说明见 `src/core/NOTICE.md`。

## 模块文档

`docs/llm/` 提供 Core 各模块的最简使用示例：

- `docs/llm/agent.md`
- `docs/llm/agent-loop.md`
- `docs/llm/deepseek.md`
- `docs/llm/demo.md`
- `docs/llm/session.md`
- `docs/llm/scope.md`
- `docs/llm/attachment.md`

## 输出文件

| 文件 | 说明 |
| --- | --- |
| `data/raw_books.csv` | 原始抓取结果，保留评分和评价人数的网页原始文本 |
| `data/clean_books.csv` | pandas 清洗后的结构化数据 |
| `analysis/report.md` | 数据质量、总体统计、排名和分析结论 |
| `analysis/summary.json` | 机器可读的统计摘要 |
| `analysis/top_books.csv` | 评分最高的 20 本书 |
| `analysis/most_reviewed_books.csv` | 评价人数最多的 20 本书 |
| `analysis/rating_distribution.csv` | 评分区间分布 |
| `analysis/publisher_stats.csv` | 入榜图书最多的出版社 |
| `analysis/figures/rating_distribution.png` | 评分区间分布图，分析时自动刷新 |
| `analysis/figures/publisher_distribution.png` | 出版社分布图，分析时自动刷新 |
| `analysis/figures/rating_vs_reviews.png` | 评分与评价人数关系图，分析时自动刷新 |
| `analysis/books_enriched.csv` | 增加国家、题材和检索文本的增强数据 |
| `analysis/country_stats.csv` | 国家/地区统计 |
| `analysis/genre_stats.csv` | 题材规则分类统计 |
| `analysis/quote_word_freq.csv` | 短评高频词 |
| `analysis/quote_sentiment.csv` | 每条短评的情感得分 |
| `analysis/quote_topics.csv` | LDA 主题关键词 |
| `analysis/similar_books.csv` | 每本书的相似高分书推荐 |
| `data/snapshots/` | 每次分析保存的日期快照 |
| `dashboard/index.html` | 静态交互式数据看板 |

原始数据字段：

- `rank`：Top250 排名
- `title` / `subtitle`：书名 / 副标题
- `author_info`：页面中的作者、译者、出版社、日期、价格原文
- `rating_raw`：评分原文，例如 `9.7`
- `rating_count_raw`：评价人数原文，例如 `( 470903人评价 )`
- `quote`：页面短评
- `url` / `cover_url`：详情页 / 封面
- `fetched_at`：抓取时间（ISO 8601）

清洗后新增或规范化字段：

- `author`、`publisher`、`publish_date`、`price_cny`
- 数值型 `rating`、`rating_count`
- `data_quality_flags`：缺失填补或字段缺失标记

## 清洗规则

`analysis/clean_analyze.py` 使用 pandas 完成以下处理：

1. 去除首尾空白、合并连续空白、空字符串转换为缺失值。
2. 删除标题为空、完全重复和重复书名的记录；重复书名保留评价人数更多的一条。
3. 评分只接受 0-10 的数字；评价人数只保留数字并转换为整数。
4. 缺失或异常评分使用评分中位数填补；缺失或异常评价人数使用中位数填补。
5. 从 `author_info` 中解析作者、出版社、出版日期和人民币价格。
6. 在 `data_quality_flags` 中记录 `missing_price`、`invalid_rating_imputed` 等质量标记，避免静默修改数据。
7. 输出总体统计、评分区间分布、评分榜、评价人数榜和出版社榜。
8. 自动刷新 `analysis/figures/` 下的基础图表。
9. 生成国家、题材、作者、短评词频、情感、主题和相似推荐等高级结果。
10. 自动生成 `dashboard/index.html` 交互式看板。

## 测试

```bash
npm run test:all
```

- `npm test`：TypeScript 单元测试，覆盖页面解析、分页 URL、CSV 转义和空 HTML。
- `npm run test:python`：pandas 端到端清洗测试，覆盖空标题、内容重复、重复书名、异常评分/人数、缺失排名和报告输出。
- `npm run fetch:test`：独立的联网 smoke test，检查 HTTP 200、HTML 大小、解析条数和首条记录。

## 项目结构

```text
数据爬虫/douban-top250-crawler/
├── src/
│   ├── agent-cli.ts      # 爬虫 Agent 命令行入口
│   ├── cli.ts            # 爬虫命令行入口
│   ├── crawler.ts        # 分页抓取与原始 CSV 写出
│   ├── fetch.ts          # fetch 超时、重试与退避
│   ├── parser.ts         # Cheerio 页面解析
│   ├── csv.ts            # CSV 序列化
│   ├── normalize.ts      # 文本与 URL 工具
│   ├── fetch-check.ts    # 联网 fetch 测试
│   ├── types.ts
│   ├── attachment/       # 附件类型
│   └── core/             # DeepSeek Harness Core 最小适配层
│       ├── agent/        # Agent 契约与 ToolRegistry
│       ├── agent-loop/   # Agent 循环与爬虫工具
│       ├── llm/          # DeepSeek / Demo Provider
│       ├── scope/        # 作用域
│       └── session/      # SessionLog 与事件日志
├── tests/
│   ├── parser.test.ts
│   └── harness.test.ts
├── analysis/
│   ├── clean_analyze.py   # 基础清洗与分析
│   ├── advanced_analysis.py # 趋势、文本、多维和推荐
│   ├── recommend.py       # 相似书查询
│   ├── run_analysis.sh    # 完整分析入口
│   ├── run_python.sh      # 自动使用 .venv
│   └── figures/           # 自动刷新图表
├── dashboard/
│   ├── generate_dashboard.py
│   ├── index.html
│   └── figures/
├── data/
│   ├── raw_books.csv
│   ├── clean_books.csv
│   └── snapshots/         # 日期快照
├── package.json
├── tsconfig.json
└── requirements.txt
```

## 注意事项

- 本项目用于课程学习和数据分析演示。抓取前请遵守目标网站的服务条款、robots.txt 和访问频率限制。
- 默认每次请求间隔 1.5 秒，请勿提高频率或用于商业采集。
- 豆瓣页面结构可能变化；解析器测试和 `fetch:test` 可用于快速发现问题。
- 原始数据中的 `rating_raw`、`rating_count_raw` 保留网页原文，清洗后的数值字段在 `data/clean_books.csv` 中。
