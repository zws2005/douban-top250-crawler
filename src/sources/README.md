# src/sources

数据源适配层负责隔离不同网站的差异。爬虫主体只依赖 `CrawlSource<T>`，不直接知道 URL、HTML 结构或 CSV 字段。

## 接口

```ts
export interface CrawlSource<T> {
  readonly name: string;
  readonly pageSize: number;
  readonly maxPages: number;
  buildPageUrl(pageIndex: number, pageSize?: number): string;
  parsePage(html: string, pageStart: number): ParsedPage<T>;
  serialize(items: readonly T[]): string;
}
```

## 内置数据源

`douban-books.ts` 实现豆瓣读书 Top250：

- 页大小：25
- 最大页数：10
- 分页参数：`?start=`
- 解析器：Cheerio 定位 `tr.item`
- 输出：`booksToCsv`

## 添加新数据源

```ts
import type { CrawlSource } from "../../src/sources";

interface NewsItem {
  title: string;
  url: string;
}

export const newsSource: CrawlSource<NewsItem> = {
  name: "example-news",
  pageSize: 20,
  maxPages: 5,
  buildPageUrl(page, pageSize = 20) {
    return `https://example.com/news?page=${page + 1}&size=${pageSize}`;
  },
  parsePage(html, pageStart) {
    // 使用 Cheerio 或正则解析 html
    return { items: [], malformedRows: 0 };
  },
  serialize(items) {
    return items.map((item) => `${item.title},${item.url}`).join("\n");
  }
};
```

然后通过 `crawlSource(source, options)` 调用，而不用修改爬虫循环。
