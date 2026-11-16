import { OpenAiCompatibleProvider } from "./openai-compatible";

export interface DeepSeekOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
}

export class DeepSeekProvider extends OpenAiCompatibleProvider {
  constructor(options: DeepSeekOptions) {
    super({
      name: "deepseek",
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      model: options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      maxTokens: options.maxTokens
    });
  }
}
