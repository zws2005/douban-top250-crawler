import type { ChatMessage } from "../llm/types";
import type { SessionRecord } from "./types";

/** Derive the model-visible message surface from the append-only event log. */
export function deriveMessages(records: readonly SessionRecord[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const record of records) {
    if (record.type === "user/message" || record.type === "assistant/message") {
      messages.push(record.message);
    } else if (record.type === "tool/result") {
      messages.push({
        role: "tool",
        content: record.result.content,
        toolCallId: record.result.callId,
        name: record.result.name
      });
    }
  }
  return messages;
}
