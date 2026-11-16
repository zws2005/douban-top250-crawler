import { OpenAiCompatibleProvider } from "./openai-compatible";

export interface BailianOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Alibaba Cloud Bailian through its OpenAI-compatible Chat Completions API.
 * Official key env: DASHSCOPE_API_KEY.
 */
export class BailianProvider extends OpenAiCompatibleProvider {
  constructor(options: BailianOptions) {
    super({
      name: "bailian",
      apiKey: options.apiKey,
      baseUrl:
        options.baseUrl ??
        process.env.DASHSCOPE_BASE_URL ??
        process.env.BAILIAN_BASE_URL ??
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model:
        options.model ??
        process.env.DASHSCOPE_MODEL ??
        process.env.BAILIAN_MODEL ??
        "qwen-plus",
      maxTokens: options.maxTokens
    });
  }
}
