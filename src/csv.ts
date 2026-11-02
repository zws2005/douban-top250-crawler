import { RAW_BOOK_FIELDS, type RawBookRecord } from "./types";

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function booksToCsv(books: readonly RawBookRecord[]): string {
  const header = RAW_BOOK_FIELDS.map(({ header: name }) => name).join(",");
  const lines = books.map((book) =>
    RAW_BOOK_FIELDS.map(({ key }) => csvEscape(book[key])).join(",")
  );
  return `\ufeff${[header, ...lines].join("\n")}\n`;
}
