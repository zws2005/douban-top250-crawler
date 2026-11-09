import type { ChatMessage, LlmProvider, LlmRequest, LlmResponse, ToolCall } from "./types";

interface DeepSeekOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
}

interface ApiToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

interface ApiMessage {
  content?: string | null;
  tool_calls?: ApiToolCall[];
}

interface ApiResponse {
  choices?: Array<{ message?: ApiMessage }>;
  error?: { message?: string };
}

function parseArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { value };
  } catch {
    return { raw };
  }
}

function toApiMessage(message: ChatMessage): Record<string, unknown> {
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.arguments) }
      }))
    };
  }
  return { role: message.role, content: message.content };
}

export class DeepSeekProvider implements LlmProvider {
  readonly name = "deepseek";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens?: number;

  constructor(options: DeepSeekOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "");
    this.model = options.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
    this.maxTokens = options.maxTokens;
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages.map(toApiMessage),
        tools: request.tools.length
          ? request.tools.map((tool) => ({
              type: "function",
              function: { name: tool.name, description: tool.description, parameters: tool.parameters }
            }))
          : undefined,
        tool_choice: request.tools.length ? "auto" : undefined,
        stream: false,
        max_tokens: this.maxTokens
      }),
      signal: request.signal
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`DeepSeek API HTTP ${response.status}: ${raw.slice(0, 500)}`);
    }

    const data = JSON.parse(raw) as ApiResponse;
    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error(data.error?.message ?? "DeepSeek API returned no message");
    }

    const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((call, index) => ({
      id: call.id ?? `call_${index + 1}`,
      name: call.function?.name ?? "unknown_tool",
      arguments: parseArguments(call.function?.arguments)
    }));

    return { content: message.content ?? "", toolCalls };
  }
}
