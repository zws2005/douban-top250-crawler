import type { ToolCall } from "../llm/types";
import type { ToolExecutionResult } from "../agent/types";
import type { SessionRecord } from "./types";

export interface ToolHistoryEntry {
  call: ToolCall;
  result?: ToolExecutionResult;
}

export function deriveToolHistory(records: readonly SessionRecord[]): ToolHistoryEntry[] {
  const entries = new Map<string, ToolHistoryEntry>();
  for (const record of records) {
    if (record.type === "tool/call") {
      entries.set(record.call.id, { call: record.call });
    } else if (record.type === "tool/result") {
      const existing = entries.get(record.result.callId);
      if (existing) {
        existing.result = record.result;
      } else {
        entries.set(record.result.callId, {
          call: {
            id: record.result.callId,
            name: record.result.name,
            arguments: {}
          },
          result: record.result
        });
      }
    }
  }
  return [...entries.values()];
}
