import { PresetRegistry, type AgentPreset } from "../core/presets";
import { createWebSearchPlugin, type WebSearchService } from "../core/websearch";
import { CRAWLER_AGENT_SYSTEM_PROMPT, RESEARCH_AGENT_SYSTEM_PROMPT } from "./prompt";

export const crawlerPreset: AgentPreset = {
  id: "crawler",
  name: "爬虫任务",
  description: "抓取、读取和分析豆瓣 Top250 数据",
  systemPrompt: CRAWLER_AGENT_SYSTEM_PROMPT,
  plugins: []
};

export const researchPreset: AgentPreset = {
  id: "research",
  name: "联网研究",
  description: "在爬虫工具之外增加互联网搜索",
  systemPrompt: RESEARCH_AGENT_SYSTEM_PROMPT,
  plugins: [createWebSearchPlugin()]
};

export interface AppPresetOptions {
  webSearchService?: WebSearchService;
  onWebSearchTrace?: (type: string, data?: Record<string, unknown>) => void;
}

export function createAppPresetRegistry(options: AppPresetOptions = {}): PresetRegistry {
  const research: AgentPreset = {
    ...researchPreset,
    plugins: [
      createWebSearchPlugin({
        service: options.webSearchService,
        onTrace: options.onWebSearchTrace
      })
    ]
  };
  return new PresetRegistry([crawlerPreset, research]);
}

let cachedRegistry: PresetRegistry | undefined;

export function getAppPresetRegistry(options: AppPresetOptions = {}): PresetRegistry {
  cachedRegistry ??= createAppPresetRegistry(options);
  return cachedRegistry;
}
