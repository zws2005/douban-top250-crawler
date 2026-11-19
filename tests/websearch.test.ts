import assert from "node:assert/strict";
import test from "node:test";
import { BingSearchProvider } from "../src/core/websearch";

test("Bing provider parses search results", async () => {
  const html = `<ol>
    <li class="b_algo"><h2><a href="https://example.com/a">结果 A</a></h2><div class="b_caption"><p>摘要 A</p></div></li>
    <li class="b_algo"><h2><a href="https://example.com/b">结果 B</a></h2><div class="b_caption"><p>摘要 B</p></div></li>
  </ol>`;
  const fakeFetch = (async () => new Response(html, { status: 200 })) as typeof fetch;
  const response = await new BingSearchProvider("https://example.com/search", fakeFetch).search("test", { limit: 2 });
  assert.equal(response.provider, "bing");
  assert.equal(response.results.length, 2);
  assert.deepEqual(response.results[0], {
    title: "结果 A",
    url: "https://example.com/a",
    snippet: "摘要 A"
  });
});
