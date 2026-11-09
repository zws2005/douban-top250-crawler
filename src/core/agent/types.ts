import type { ToolCall, ToolSchema } from "../llm/types";

export interface ToolExecutionResult {
  callId: string;
  name: string;
  content: string;
  isError: boolean;
  durationMs: number;
}

export interface ToolContext {
  sessionId: string;
  signal: AbortSignal;
}

export interface ToolDefinition extends ToolSchema {
  execute(
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<unknown> | unknown;
}

export interface AgentDescriptor {
  id: string;
  tools: readonly ToolSchema[];
  lastToolCall?: ToolCall;
}
