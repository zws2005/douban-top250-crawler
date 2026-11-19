import assert from "node:assert/strict";
import test from "node:test";
import { PresetRegistry } from "../src/core/presets";
import type { AgentPreset } from "../src/core/presets";

const preset: AgentPreset = {
  id: "test",
  name: "Test",
  description: "test preset",
  systemPrompt: "test prompt",
  plugins: []
};

test("preset registry registers and selects presets", () => {
  const registry = new PresetRegistry([preset]);
  assert.equal(registry.get("test").systemPrompt, "test prompt");
  assert.deepEqual(registry.list(), [
    { id: "test", name: "Test", description: "test preset", pluginCount: 0 }
  ]);
});

test("preset registry rejects duplicate ids", () => {
  const registry = new PresetRegistry([preset]);
  assert.throws(() => registry.register(preset), /already registered/);
});
