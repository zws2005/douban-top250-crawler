import type { ToolExecutionResult } from "../agent/types";
import type { ChatMessage, ToolCall } from "../llm/types";

export interface RequestHeader {
  provider: string;
  model: string;
  reasoningEffort?: string;
}

export interface SessionHeader {
  id: string;
  createdAt: string;
  cwd: string;
  request?: RequestHeader;
}

export type SessionEventPayload =
  | { type: "session/created"; header: SessionHeader }
  | { type: "session/forked"; from: string }
  | { type: "session/repaired"; reason: string }
  | { type: "turn/start"; turnId: string; input: string }
  | { type: "user/message"; message: ChatMessage }
  | { type: "assistant/message"; message: ChatMessage }
  | { type: "tool/call"; call: ToolCall }
  | { type: "tool/result"; result: ToolExecutionResult }
  | { type: "request/header"; header: RequestHeader }
  | { type: "turn/end"; turnId: string; output: string; steps: number };

export type SessionRecord = SessionEventPayload & { at: string };
