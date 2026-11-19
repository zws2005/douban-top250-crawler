import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { TraceWriter } from "../src/app/trace";

test("trace writer previews the latest JSONL file", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "dsh-trace-test-"));
  try {
    const writer = new TraceWriter(directory);
    await writer.record("websearch/start", { query: "test" });
    await writer.record("websearch/response", { results: 1 });
    const latest = await writer.latestPreview(5);
    assert.ok(latest);
    assert.match(latest.file, /\.jsonl$/);
    assert.equal(latest.lines.length, 2);
    assert.match(latest.lines[0]!, /websearch\/start/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
