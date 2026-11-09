import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionEventPayload, SessionHeader, SessionRecord } from "./types";

export interface SessionLogOptions {
  id?: string;
  cwd?: string;
  onEvent?: (record: SessionRecord) => void;
}

function createSessionHeader(options: SessionLogOptions): SessionHeader {
  return {
    id: options.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    cwd: options.cwd ?? process.cwd()
  };
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
    const record = { ...event, at: new Date().toISOString() } as SessionRecord;
    this.records.push(record);
    this.onEvent?.(record);
    return record;
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
