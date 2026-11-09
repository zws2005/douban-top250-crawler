import type { SessionEventPayload, SessionRecord } from "./types";

/** Close turns that did not receive a turn/end event after a crash. */
export function repairSessionRecords(records: readonly SessionRecord[]): SessionEventPayload[] {
  const open = new Set<string>();
  for (const record of records) {
    if (record.type === "turn/start") open.add(record.turnId);
    if (record.type === "turn/end") open.delete(record.turnId);
  }
  if (open.size === 0) return [];

  const repairs: SessionEventPayload[] = [...open].map((turnId) => ({
    type: "turn/end",
    turnId,
    output: "[repaired: missing turn/end]",
    steps: 0
  }));
  repairs.push({
    type: "session/repaired",
    reason: `closed ${open.size} unfinished turn(s)`
  });
  return repairs;
}
