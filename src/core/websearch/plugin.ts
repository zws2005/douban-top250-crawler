import type { AgentPlugin } from "../plugins/providers/deepseek";
import { WebSearchService } from "./service";

export interface WebSearchPluginOptions {
  service?: WebSearchService;
}

export function createWebSearchPlugin(options: WebSearchPluginOptions = {}): AgentPlugin {
  const service = options.service ?? new WebSearchService();
  return {
    name: "web-search",
    setup(context) {
      context.tools.register({
        name: "web_search",
        description: "搜索互联网并返回标题、链接和摘要。",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "搜索关键词" },
            maxResults: { type: "integer", minimum: 1, maximum: 10 }
          },
          required: ["query"]
        },
        async execute(args, execution) {
          if (execution.signal.aborted) throw new Error("cancelled");
          const query = String(args.query ?? "").trim();
          const maxResults = Number(args.maxResults ?? 5);
          return service.search(query, {
            limit: maxResults,
            signal: execution.signal
          });
        }
      });
    }
  };
}
