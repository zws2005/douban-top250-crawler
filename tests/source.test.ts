import assert from "node:assert/strict";
import test from "node:test";
import { doubanBooksSource } from "../src/sources";

const HTML = `<table><tr class="item">
  <td><a class="nbg" href="https://book.douban.com/subject/1/"><img src="cover.jpg"></a></td>
  <td>
    <div class="pl2"><a href="https://book.douban.com/subject/1/" title="测试图书">测试图书</a></div>
    <p class="pl">作者 / 出版社 / 2026-1 / 10.00元</p>
    <div class="star"><span class="rating_nums">9.1</span><span class="pl">(100人评价)</span></div>
    <p class="quote"><span class="inq">测试短评</span></p>
  </td>
</tr></table>`;

test("douban source exposes its crawl contract", () => {
  assert.equal(doubanBooksSource.name, "douban-books-top250");
  assert.equal(doubanBooksSource.pageSize, 25);
  assert.equal(doubanBooksSource.maxPages, 10);
  assert.equal(
    doubanBooksSource.buildPageUrl(2),
    "https://book.douban.com/top250?start=50"
  );
});

test("douban source parses and serializes items", () => {
  const parsed = doubanBooksSource.parsePage(HTML, 0);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0]?.title, "测试图书");
  const csv = doubanBooksSource.serialize(parsed.items);
  assert.match(csv, /^\ufeffrank,title/);
  assert.match(csv, /测试图书/);
});
