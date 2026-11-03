import assert from "node:assert/strict";
import test from "node:test";
import { booksToCsv, buildTop250Url, csvEscape, parseTop250Page } from "../src/index";

const HTML = `<table><tr class="item"><td><a class="nbg" href="https://book.douban.com/subject/1/"><img src="1.jpg"></a></td>
<td><div class="pl2"><a href="https://book.douban.com/subject/1/" title="红楼梦">红楼梦</a></div>
<p class="pl">曹雪芹 / 人民文学出版社 / 1996-12 / 59.70元</p>
<div class="star"><span class="rating_nums">9.7</span><span class="pl">(470900人评价)</span></div>
<p class="quote"><span class="inq">满纸荒唐言</span></p></td></tr></table>`;

test("parses one book", () => {
  const books = parseTop250Page(HTML, 25);
  assert.equal(books.length, 1);
  assert.equal(books[0]?.rank, 26);
  assert.equal(books[0]?.title, "红楼梦");
  assert.equal(books[0]?.ratingRaw, "9.7");
  assert.equal(books[0]?.ratingCountRaw, "(470900人评价)");
});

test("builds page URLs", () => {
  assert.equal(buildTop250Url(0), "https://book.douban.com/top250?start=0");
  assert.equal(buildTop250Url(2), "https://book.douban.com/top250?start=50");
});

test("escapes CSV values", () => {
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('a"b'), '"a""b"');
  const csv = booksToCsv([{
    rank: 1, title: "a,b", subtitle: "", authorInfo: "", ratingRaw: "9", ratingCountRaw: "",
    quote: "", url: "", coverUrl: "", fetchedAt: ""
  }]);
  assert.match(csv, /^﻿rank,title/);
  assert.match(csv, /1,"a,b"/);
});
