import { randomUUID } from "node:crypto";
import type { RequestHeader, SessionHeader } from "./types";

export interface SessionPrepareOptions {
  id?: string;
  cwd?: string;
  request?: RequestHeader;
}

export function createSessionHeader(options: SessionPrepareOptions = {}): SessionHeader {
  return {
    id: options.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    cwd: options.cwd ?? process.cwd(),
    ...(options.request ? { request: options.request } : {})
  };
}
