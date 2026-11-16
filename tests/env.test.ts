import assert from "node:assert/strict";
import test from "node:test";
import { parseEnvFile } from "../src/app/env";

test("parses .env values and ignores comments", () => {
  const values = parseEnvFile(`
# comment
DASHSCOPE_API_KEY=sk-test
DASHSCOPE_MODEL="qwen-plus"
export DEEPSEEK_MODEL='deepseek-chat'
EMPTY=
`);
  assert.deepEqual(values, {
    DASHSCOPE_API_KEY: "sk-test",
    DASHSCOPE_MODEL: "qwen-plus",
    DEEPSEEK_MODEL: "deepseek-chat",
    EMPTY: ""
  });
});
