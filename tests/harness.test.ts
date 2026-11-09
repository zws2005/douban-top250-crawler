import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { AgentLoop } from "../src/core/agent-loop";
import { ToolRegistry } from "../src/core/agent";
import { SessionLog } from "../src/core/session";
import type { LlmProvider, LlmRequest, LlmResponse } from "../src/core/llm";

class MockProvider implements LlmProvider {
  readonly name = "mock";
  calls = 0;

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.calls += 1;
    if (this.calls === 1) {
      assert.equal(request.tools[0]?.name, "echo");
      return {
        content: "",
        toolCalls: [{ id: "call-1", name: "echo", arguments: { text: "hello" } }]
      };
    }
    assert.ok(request.messages.some((message) => message.role === "tool"));
    return { content: "finished", toolCalls: [] };
  }
}

test("agent loop runs model -> tool -> model and persists a session", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "dsh-agent-test-"));
  try {
    const tools = new ToolRegistry().register({
      name: "echo",
      description: "echo input",
      parameters: { type: "object", properties: { text: { type: "string" } } },
      execute(args) {
        return { echoed: args.text };
      }
    });
    const provider = new MockProvider();
    const loop = new AgentLoop({ provider, tools, maxSteps: 3, sessionDirectory: directory });
    const result = await loop.run("run echo");
    assert.equal(result.output, "finished");
    assert.equal(result.steps, 2);
    assert.equal(provider.calls, 2);
    assert.ok(existsSync(result.logPath));
    assert.deepEqual(
      result.session.records.map((record) => record.type),
      [
        "session/created",
        "turn/start",
        "user/message",
        "assistant/message",
        "tool/call",
        "tool/result",
        "assistant/message",
        "turn/end"
      ]
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("unknown tools are returned as error results instead of crashing", async () => {
  const tools = new ToolRegistry();
  const result = await tools.execute(
    { id: "missing-1", name: "missing", arguments: {} },
    { sessionId: "test", signal: new AbortController().signal }
  );
  assert.equal(result.isError, true);
  assert.match(result.content, /Unknown tool/);
});

test("session persists core events", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "dsh-session-test-"));
  try {
    const session = new SessionLog({ cwd: "/tmp" });
    session.append({ type: "turn/start", turnId: "turn-1", input: "hello" });
    session.append({
      type: "turn/end",
      turnId: "turn-1",
      output: "ok",
      steps: 1
    });
    const file = await session.persist(directory);
    assert.ok(existsSync(file));
    assert.deepEqual(
      session.records.map((record) => record.type),
      ["session/created", "turn/start", "turn/end"]
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
