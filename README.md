# 豆瓣读书 Top250 爬虫（简化版）

单文件 TypeScript 爬虫 + pandas 清洗分析，适合课程提交和快速阅读。

## 项目结构

```text
douban-top250-crawler-simple/
├── src/index.ts          # 请求、解析、抓取、CSV、命令行
├── tests/
│   ├── crawler.test.ts
│   └── test_clean_analyze.py
├── data/
│   ├── raw_books.csv
│   └── clean_books.csv
├── clean_analyze.py      # pandas 清洗与分析
├── report.md             # 分析报告
├── package.json
├── tsconfig.json
├── requirements.txt
└── README.md
```

## 运行

```bash
npm install
npm run test:all
npm run fetch:test
npm run crawl
npm run analyze
```

也可以一次完成抓取和分析：

```bash
npm run pipeline
```

抓取结果保存到 `data/raw_books.csv`，清洗结果保存到 `data/clean_books.csv`，分析报告保存到 `report.md`。
