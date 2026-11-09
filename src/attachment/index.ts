import { randomUUID } from "node:crypto";

export interface Attachment {
  id: string;
  name: string;
  mediaType: string;
  path?: string;
}

export function createAttachment(
  input: Omit<Attachment, "id"> & { id?: string }
): Attachment {
  return { id: input.id ?? randomUUID(), ...input };
}
