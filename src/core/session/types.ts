import type { ToolExecutionResult } from "../agent/types";
import type { ChatMessage, ToolCall } from "../llm/types";

export interface SessionHeader {
  id: string;
  createdAt: string;
  cwd: string;
}

export type SessionEventPayload =
  | { type: "session/created"; header: SessionHeader }
  | { type: "turn/start"; turnId: string; input: string }
  | { type: "user/message"; message: ChatMessage }
  | { type: "assistant/message"; message: ChatMessage }
  | { type: "tool/call"; call: ToolCall }
  | { type: "tool/result"; result: ToolExecutionResult }
  | { type: "turn/end"; turnId: string; output: string; steps: number };

export type SessionRecord = SessionEventPayload & { at: string };
