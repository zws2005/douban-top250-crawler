# 豆瓣读书 Top250 爬虫（最简版）

一个 TypeScript 爬虫文件和一个 Python 清洗脚本，完成抓取、原始 CSV、清洗 CSV 和分析报告。

## 项目结构

```text
douban-top250-crawler-simple/
├── crawler.ts          # 请求、解析、抓取、CSV、命令行
├── clean.py            # pandas 清洗与分析
├── data/
│   ├── raw_books.csv
│   └── clean_books.csv
├── report.md
├── package.json
├── tsconfig.json
├── requirements.txt
└── README.md
```

## 运行

```bash
npm install
npm run fetch:test
npm run crawl
npm run analyze
```

或者一次完成抓取和分析：

```bash
npm run pipeline
```

输出文件：

- `data/raw_books.csv`：原始抓取结果
- `data/clean_books.csv`：清洗后的数据
- `report.md`：分析报告
