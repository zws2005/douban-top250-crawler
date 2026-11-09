import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatMessage } from "../llm/types";
import { forkSessionRecords } from "./fork";
import { isKnownEventType } from "./known-event-types";
import { createSessionHeader, type SessionPrepareOptions } from "./preparation";
import { repairSessionRecords } from "./repair";
import { deriveMessages } from "./surface";
import type { SessionEventPayload, SessionHeader, SessionRecord } from "./types";

export interface SessionLogOptions extends SessionPrepareOptions {
  onEvent?: (record: SessionRecord) => void;
}

export class SessionLog {
  readonly header: SessionHeader;
  readonly records: SessionRecord[] = [];
  private readonly onEvent?: (record: SessionRecord) => void;

  constructor(options: SessionLogOptions = {}) {
    this.header = createSessionHeader(options);
    this.onEvent = options.onEvent;
    this.append({ type: "session/created", header: this.header });
  }

  get id(): string {
    return this.header.id;
  }

  append(event: SessionEventPayload): SessionRecord {
    if (!isKnownEventType(event.type)) {
      throw new Error(`unknown session event: ${event.type}`);
    }
    const record = { ...event, at: new Date().toISOString() } as SessionRecord;
    this.records.push(record);
    this.onEvent?.(record);
    return record;
  }

  deriveMessages(): ChatMessage[] {
    return deriveMessages(this.records);
  }

  fork(): SessionLog {
    const child = new SessionLog({
      cwd: this.header.cwd,
      request: this.header.request,
      onEvent: this.onEvent
    });
    for (const event of forkSessionRecords(this.records)) child.append(event);
    child.append({ type: "session/forked", from: this.id });
    return child;
  }

  repair(): number {
    const repairs = repairSessionRecords(this.records);
    for (const event of repairs) this.append(event);
    return repairs.length;
  }

  async persist(
    directory = path.join(process.cwd(), "data", "agent-sessions")
  ): Promise<string> {
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, `${this.id}.jsonl`);
    await writeFile(
      file,
      this.records.map((record) => JSON.stringify(record)).join("\n") + "\n",
      "utf8"
    );
    return file;
  }
}

export * from "./types";
export * from "./known-event-types";
export * from "./request-header";
export * from "./preparation";
export * from "./surface";
export * from "./tool-history";
export * from "./fork";
export * from "./repair";
