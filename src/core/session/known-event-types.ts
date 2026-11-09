export const KNOWN_EVENT_TYPES = [
  "session/created",
  "session/forked",
  "session/repaired",
  "turn/start",
  "user/message",
  "assistant/message",
  "tool/call",
  "tool/result",
  "request/header",
  "turn/end"
] as const;

export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number];

export function isKnownEventType(value: string): value is KnownEventType {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(value);
}
