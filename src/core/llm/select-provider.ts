import { BailianProvider } from "./bailian";
import { DeepSeekProvider } from "./deepseek";
import { DemoCrawlerProvider } from "./demo";
import type { LlmProvider } from "./types";

export type ProviderName = "bailian" | "deepseek" | "demo";

export interface SelectProviderOptions {
  provider?: string;
  model?: string;
  demo?: boolean;
  env?: NodeJS.ProcessEnv;
}

export function selectProvider(options: SelectProviderOptions = {}): LlmProvider {
  const env = options.env ?? process.env;
  if (options.demo || options.provider === "demo") {
    return new DemoCrawlerProvider();
  }

  const bailianKey = env.DASHSCOPE_API_KEY ?? env.BAILIAN_API_KEY;
  const deepseekKey = env.DEEPSEEK_API_KEY;
  const provider = options.provider ?? (bailianKey ? "bailian" : deepseekKey ? "deepseek" : "demo");

  if (provider === "bailian") {
    if (!bailianKey) {
      throw new Error("缺少 DASHSCOPE_API_KEY（阿里云百炼 API Key）");
    }
    return new BailianProvider({ apiKey: bailianKey, model: options.model });
  }
  if (provider === "deepseek") {
    if (!deepseekKey) {
      throw new Error("缺少 DEEPSEEK_API_KEY（DeepSeek API Key）");
    }
    return new DeepSeekProvider({ apiKey: deepseekKey, model: options.model });
  }
  if (provider === "demo") {
    return new DemoCrawlerProvider();
  }
  throw new Error(`未知 LLM Provider: ${provider}`);
}
