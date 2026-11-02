export const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 DoubanTop250LearningCrawler/1.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7"
};

export interface FetchPageOptions {
  attempts?: number;
  timeoutMs?: number;
  retryBaseMs?: number;
  headers?: Record<string, string>;
}

export interface FetchPageResult {
  html: string;
  status: number;
  finalUrl: string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "HttpError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function fetchPage(
  url: string,
  options: FetchPageOptions = {}
): Promise<FetchPageResult> {
  const attempts = Math.max(1, options.attempts ?? 4);
  const timeoutMs = Math.max(1_000, options.timeoutMs ?? 20_000);
  const retryBaseMs = Math.max(100, options.retryBaseMs ?? 1_000);
  const headers = { ...DEFAULT_HEADERS, ...options.headers };

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers,
        redirect: "follow",
        signal: controller.signal
      });

      if (!response.ok) {
        const error = new HttpError(
          `HTTP ${response.status} ${response.statusText} while fetching ${url}`,
          response.status
        );
        if (!isRetryableStatus(response.status)) {
          throw error;
        }
        lastError = error;
      } else {
        const html = await response.text();
        if (!html.trim()) {
          throw new Error(`Empty response body while fetching ${url}`);
        }
        return { html, status: response.status, finalUrl: response.url || url };
      }
    } catch (error) {
      lastError = error;
      if (error instanceof HttpError && !isRetryableStatus(error.status)) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt < attempts) {
      const backoffMs = retryBaseMs * 2 ** (attempt - 1);
      console.warn(
        `[fetch] attempt ${attempt}/${attempts} failed: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }; retrying in ${backoffMs}ms`
      );
      await sleep(backoffMs);
    }
  }

  throw new Error(
    `Failed to fetch ${url} after ${attempts} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
