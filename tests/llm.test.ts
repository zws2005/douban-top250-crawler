import assert from "node:assert/strict";
import test from "node:test";
import { selectProvider } from "../src/core/llm";

test("selects Bailian by default when DASHSCOPE_API_KEY is present", () => {
  const provider = selectProvider({
    env: { DASHSCOPE_API_KEY: "test-key" }
  });
  assert.equal(provider.name, "bailian");
});

test("selects DeepSeek when only DEEPSEEK_API_KEY is present", () => {
  const provider = selectProvider({
    env: { DEEPSEEK_API_KEY: "test-key" }
  });
  assert.equal(provider.name, "deepseek");
});

test("explicit provider requires its API key", () => {
  assert.throws(
    () => selectProvider({ provider: "bailian", env: {} }),
    /DASHSCOPE_API_KEY/
  );
  assert.throws(
    () => selectProvider({ provider: "deepseek", env: {} }),
    /DEEPSEEK_API_KEY/
  );
});

test("falls back to demo without an API key", () => {
  const provider = selectProvider({ env: {} });
  assert.equal(provider.name, "demo");
});
