export interface ScopeKey {
  readonly id: string;
}

export function createScope(id: string): ScopeKey {
  if (!id.trim()) throw new Error("scope id cannot be empty");
  return { id };
}
