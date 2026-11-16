import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface TraceRecord {
  at: string;
  type: string;
  data?: Record<string, unknown>;
}

export class TraceWriter {
  constructor(readonly directory: string) {}

  async record(type: string, data?: Record<string, unknown>): Promise<void> {
    try {
      await mkdir(this.directory, { recursive: true });
      const date = new Date().toISOString().slice(0, 10);
      const file = path.join(this.directory, `${date}.jsonl`);
      const record: TraceRecord = { at: new Date().toISOString(), type, data };
      await appendFile(file, JSON.stringify(record) + "\n", "utf8");
    } catch {
      // Tracing must never break the interactive application.
    }
  }
}
