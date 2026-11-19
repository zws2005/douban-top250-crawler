import assert from "node:assert/strict";
import test from "node:test";
import { ToolRegistry } from "../src/core/agent";
import { SessionLog } from "../src/core/session";
import { PluginRegistry } from "../src/core/plugins/providers/deepseek";
import { createWebSearchPlugin } from "../src/core/websearch";
import type { WebSearchService } from "../src/core/websearch";

test("web_search plugin records detailed trace events", async () => {
  const events: string[] = [];
  const fakeService = {
    name: "bing",
    async search(query: string) {
      return {
        query,
        provider: "bing",
        results: [{ title: "Example", url: "https://example.com", snippet: "snippet" }]
      };
    }
  } as unknown as WebSearchService;

  const tools = new ToolRegistry();
  const session = new SessionLog({ cwd: "/tmp" });
  const registry = new PluginRegistry(session, tools);
  await registry.setup([
    createWebSearchPlugin({
      service: fakeService,
      onTrace: (type) => events.push(type)
    })
  ]);

  const result = await tools.execute(
    { id: "search-1", name: "web_search", arguments: { query: "test", maxResults: 1 } },
    { sessionId: session.id, signal: new AbortController().signal }
  );

  assert.equal(result.isError, false);
  assert.deepEqual(events, [
    "websearch/start",
    "websearch/provider",
    "websearch/request",
    "websearch/response"
  ]);
  await registry.dispose();
});
