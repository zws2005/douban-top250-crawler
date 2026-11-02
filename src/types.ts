export interface RawBookRecord {
  rank: number;
  title: string;
  subtitle: string;
  authorInfo: string;
  ratingRaw: string;
  ratingCountRaw: string;
  quote: string;
  url: string;
  coverUrl: string;
  fetchedAt: string;
}

export const RAW_BOOK_FIELDS = [
  { key: "rank", header: "rank" },
  { key: "title", header: "title" },
  { key: "subtitle", header: "subtitle" },
  { key: "authorInfo", header: "author_info" },
  { key: "ratingRaw", header: "rating_raw" },
  { key: "ratingCountRaw", header: "rating_count_raw" },
  { key: "quote", header: "quote" },
  { key: "url", header: "url" },
  { key: "coverUrl", header: "cover_url" },
  { key: "fetchedAt", header: "fetched_at" }
] as const satisfies ReadonlyArray<{
  key: keyof RawBookRecord;
  header: string;
}>;
