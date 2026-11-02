# 豆瓣读书 Top250 爬虫与数据分析

一个可复现的 **TypeScript 爬虫 + Python/pandas 清洗分析** 项目。爬虫抓取豆瓣读书 Top250 的书名、评分、评价人数、作者信息、出版社、出版日期、价格、简介、详情链接等字段，并输出原始数据与清洗分析结果。

## 环境要求

- Node.js >= 18.17（使用内置 `fetch`）
- Python >= 3.10
- pandas >= 2.0

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

# 安装 Python 依赖（当前环境已有 pandas 时可跳过）
python3 -m pip install -r requirements.txt

# 清洗原始数据并生成分析报告
npm run analyze
```

也可以一次执行抓取和清洗分析：

```bash
npm run pipeline
```

只抓取前两页、调整请求间隔或输出位置：

```bash
npm run crawl -- --pages 2 --delay-ms 2000
npm run crawl -- --pages 10 --output data/raw_books.csv
npm run crawl -- --help
```

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
│   ├── cli.ts            # 爬虫命令行入口
│   ├── crawler.ts        # 分页抓取与原始 CSV 写出
│   ├── fetch.ts          # fetch 超时、重试与退避
│   ├── parser.ts         # Cheerio 页面解析
│   ├── csv.ts            # CSV 序列化
│   ├── normalize.ts      # 文本与 URL 工具
│   ├── fetch-check.ts    # 联网 fetch 测试
│   └── types.ts
├── tests/
│   └── parser.test.ts
├── analysis/
│   └── clean_analyze.py
├── data/
│   ├── raw_books.csv
│   └── clean_books.csv
├── package.json
├── tsconfig.json
└── requirements.txt
```

## 注意事项

- 本项目用于课程学习和数据分析演示。抓取前请遵守目标网站的服务条款、robots.txt 和访问频率限制。
- 默认每次请求间隔 1.5 秒，请勿提高频率或用于商业采集。
- 豆瓣页面结构可能变化；解析器测试和 `fetch:test` 可用于快速发现问题。
- 原始数据中的 `rating_raw`、`rating_count_raw` 保留网页原文，清洗后的数值字段在 `data/clean_books.csv` 中。
