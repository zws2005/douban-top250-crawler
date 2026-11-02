import assert from "node:assert/strict";
import test from "node:test";
import { booksToCsv, csvEscape } from "../src/csv";
import { buildTop250Url } from "../src/normalize";
import { parseTop250Page } from "../src/parser";

const SAMPLE_HTML = `
<!doctype html>
<html><body>
<table><tr class="item">
  <td><a class="nbg" href="https://book.douban.com/subject/1/"><img src="https://img.example/1.jpg"></a></td>
  <td>
    <div class="pl2">
      <a href="https://book.douban.com/subject/1/" title="红楼梦">红楼梦</a>
    </div>
    <p class="pl">曹雪芹 / 人民文学出版社 / 1996-12 / 59.70元</p>
    <div class="star clearfix">
      <span class="rating_nums">9.7</span>
      <span class="pl">(
        470900人评价
      )</span>
    </div>
    <p class="quote"><span class="inq">满纸荒唐言</span></p>
  </td>
</tr></table>
<table><tr class="item">
  <td><a class="nbg" href="https://book.douban.com/subject/2/"><img src="https://img.example/2.jpg"></a></td>
  <td>
    <div class="pl2">
      <a href="https://book.douban.com/subject/2/" title="三体全集">三体全集 <span>: 地球往事三部曲</span></a>
    </div>
    <p class="pl">刘慈欣 / 重庆出版社 / 2012-1 / 168.00元</p>
    <div class="star clearfix">
      <span class="rating_nums">9.5</span>
      <span class="pl">(221109人评价)</span>
    </div>
    <p class="quote"><span class="inq">地球往事三部曲</span></p>
  </td>
</tr></table>
</body></html>
`;

test("parses title, rating and review count from a Top250 page", () => {
  const books = parseTop250Page(SAMPLE_HTML, 25, "2026-11-02T00:00:00.000Z");

  assert.equal(books.length, 2);
  assert.deepEqual(books[0], {
    rank: 26,
    title: "红楼梦",
    subtitle: "",
    authorInfo: "曹雪芹 / 人民文学出版社 / 1996-12 / 59.70元",
    ratingRaw: "9.7",
    ratingCountRaw: "( 470900人评价 )",
    quote: "满纸荒唐言",
    url: "https://book.douban.com/subject/1/",
    coverUrl: "https://img.example/1.jpg",
    fetchedAt: "2026-11-02T00:00:00.000Z"
  });
  assert.equal(books[1]?.title, "三体全集");
  assert.equal(books[1]?.subtitle, "地球往事三部曲");
  assert.equal(books[1]?.ratingCountRaw, "(221109人评价)");
});

test("returns an empty array for empty or unrelated HTML", () => {
  assert.deepEqual(parseTop250Page(""), []);
  assert.deepEqual(parseTop250Page("<html><body><p>blocked</p></body></html>"), []);
});

test("builds paginated URLs", () => {
  assert.equal(buildTop250Url(0), "https://book.douban.com/top250?start=0");
  assert.equal(buildTop250Url(2), "https://book.douban.com/top250?start=50");
});

test("escapes commas, quotes and newlines in CSV output", () => {
  assert.equal(csvEscape('a,b'), '"a,b"');
  assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
  assert.equal(csvEscape("line\nbreak"), '"line\nbreak"');

  const csv = booksToCsv([
    {
      rank: 1,
      title: '书,名"测试"',
      subtitle: "",
      authorInfo: "作者",
      ratingRaw: "9.0",
      ratingCountRaw: "(10人评价)",
      quote: "",
      url: "https://example.com/1",
      coverUrl: "",
      fetchedAt: "2026-11-02T00:00:00.000Z"
    }
  ]);
  assert.match(csv, /^\ufeffrank,title,subtitle,author_info,rating_raw/);
  assert.ok(
    csv.includes('1,"书,名""测试""",,作者,9.0,(10人评价),,https://example.com/1,,2026-')
  );
});
