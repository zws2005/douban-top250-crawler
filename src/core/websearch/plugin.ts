import type { AgentPlugin } from "../plugins/providers/deepseek";
import { WebSearchService } from "./service";

export interface WebSearchPluginOptions {
  service?: WebSearchService;
  onTrace?: (type: string, data?: Record<string, unknown>) => void;
}

export function createWebSearchPlugin(options: WebSearchPluginOptions = {}): AgentPlugin {
  const service = options.service ?? new WebSearchService();
  const onTrace = options.onTrace;
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
          const startedAt = Date.now();
          onTrace?.("websearch/start", { query, limit: maxResults });
          onTrace?.("websearch/provider", { provider: service.name });
          onTrace?.("websearch/request", { query, limit: maxResults });
          try {
            const response = await service.search(query, {
              limit: maxResults,
              signal: execution.signal
            });
            onTrace?.("websearch/response", {
              query,
              provider: response.provider,
              results: response.results.length,
              durationMs: Date.now() - startedAt
            });
            return response;
          } catch (error) {
            onTrace?.("websearch/error", {
              query,
              durationMs: Date.now() - startedAt,
              message: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        }
      });
    }
  };
}
