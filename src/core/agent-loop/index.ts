import { randomUUID } from "node:crypto";
import type { ToolRegistry } from "../agent";
import type { LlmProvider } from "../llm";
import type { ChatMessage, ToolCall } from "../llm/types";
import { SessionLog } from "../session";
import type { SessionRecord } from "../session/types";

export interface AgentLoopOptions {
  provider: LlmProvider;
  tools: ToolRegistry;
  systemPrompt?: string;
  maxSteps?: number;
  sessionDirectory?: string;
  onEvent?: (record: SessionRecord) => void;
}

export interface AgentRunResult {
  output: string;
  steps: number;
  session: SessionLog;
  logPath: string;
}

const DEFAULT_SYSTEM_PROMPT = `你是一个网页爬虫 Agent。
你可以调用工具完成网页抓取、CSV 读取和数据分析。
规则：
1. 只根据工具返回的事实回答，不要编造抓取结果。
2. 需要网页数据时先调用工具。
3. 工具失败时说明失败原因，不要假装成功。
4. 任务完成后用中文给出简洁总结。`;

export class AgentLoop {
  private readonly provider: LlmProvider;
  private readonly tools: ToolRegistry;
  private readonly systemPrompt: string;
  private readonly maxSteps: number;
  private readonly sessionDirectory?: string;
  private readonly onEvent?: (record: SessionRecord) => void;

  constructor(options: AgentLoopOptions) {
    this.provider = options.provider;
    this.tools = options.tools;
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.maxSteps = Math.max(1, options.maxSteps ?? 8);
    this.sessionDirectory = options.sessionDirectory;
    this.onEvent = options.onEvent;
  }

  async run(
    input: string,
    signal = new AbortController().signal
  ): Promise<AgentRunResult> {
    const turnId = randomUUID();
    const session = new SessionLog({ cwd: process.cwd(), onEvent: this.onEvent });
    const messages: ChatMessage[] = [
      { role: "system", content: this.systemPrompt },
      { role: "user", content: input }
    ];

    session.append({ type: "turn/start", turnId, input });
    session.append({ type: "user/message", message: messages[1]! });

    for (let step = 1; step <= this.maxSteps; step += 1) {
      if (signal.aborted) throw new Error("agent run cancelled");

      const response = await this.provider.complete({
        messages,
        tools: this.tools.schemas(),
        signal
      });
      const assistant: ChatMessage = {
        role: "assistant",
        content: response.content,
        ...(response.toolCalls.length > 0 ? { toolCalls: [...response.toolCalls] } : {})
      };
      messages.push(assistant);
      session.append({ type: "assistant/message", message: assistant });

      if (response.toolCalls.length === 0) {
        session.append({ type: "turn/end", turnId, output: response.content, steps: step });
        const logPath = await session.persist(this.sessionDirectory);
        return { output: response.content, steps: step, session, logPath };
      }

      for (const call of response.toolCalls) {
        await this.executeCall(call, session, messages, signal);
      }
    }

    throw new Error(`agent exceeded maximum steps: ${this.maxSteps}`);
  }

  private async executeCall(
    call: ToolCall,
    session: SessionLog,
    messages: ChatMessage[],
    signal: AbortSignal
  ): Promise<void> {
    session.append({ type: "tool/call", call });
    const result = await this.tools.execute(call, { sessionId: session.id, signal });
    session.append({ type: "tool/result", result });
    messages.push({
      role: "tool",
      content: result.content,
      toolCallId: call.id,
      name: call.name
    });
  }
}
