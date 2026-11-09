import type { SessionEventPayload, SessionRecord } from "./types";

/** Copy reusable events into a new branch, excluding the old session identity. */
export function forkSessionRecords(records: readonly SessionRecord[]): SessionEventPayload[] {
  const copied: SessionEventPayload[] = [];
  for (const record of records) {
    if (record.type === "session/created" || record.type === "session/forked") continue;
    const { at: _at, ...event } = record;
    copied.push(event as SessionEventPayload);
  }
  return copied;
}
