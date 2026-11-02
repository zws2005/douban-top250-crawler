export const DEFAULT_TOP250_URL = "https://book.douban.com/top250";
export const DEFAULT_PAGE_SIZE = 25;

export function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTop250Url(
  pageIndex: number,
  pageSize = DEFAULT_PAGE_SIZE,
  baseUrl = DEFAULT_TOP250_URL
): string {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new RangeError(`pageIndex must be a non-negative integer, got ${pageIndex}`);
  }
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new RangeError(`pageSize must be a positive integer, got ${pageSize}`);
  }

  const url = new URL(baseUrl);
  url.searchParams.set("start", String(pageIndex * pageSize));
  return url.toString();
}
