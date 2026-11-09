import type { RequestHeader } from "./types";

export function createRequestHeader(
  provider: string,
  model: string,
  reasoningEffort?: string
): RequestHeader {
  if (!provider.trim() || !model.trim()) {
    throw new Error("provider and model are required");
  }
  return reasoningEffort
    ? { provider, model, reasoningEffort }
    : { provider, model };
}

export function normalizeRequestHeader(header: RequestHeader): RequestHeader {
  return createRequestHeader(header.provider, header.model, header.reasoningEffort);
}
