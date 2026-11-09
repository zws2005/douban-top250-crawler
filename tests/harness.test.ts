import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { AgentLoop } from "../src/core/agent-loop";
import { ToolRegistry } from "../src/core/agent";
import { SessionLog, deriveMessages, deriveToolHistory } from "../src/core/session";
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
    assert.equal(deriveMessages(result.session.records).length, 4);
    assert.equal(deriveToolHistory(result.session.records)[0]?.result?.isError, false);
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

test("sessions can fork and repair interrupted turns", () => {
  const session = new SessionLog({ cwd: "/tmp" });
  session.append({ type: "turn/start", turnId: "turn-1", input: "hello" });
  const fork = session.fork();
  assert.notEqual(fork.id, session.id);
  assert.ok(fork.records.some((record) => record.type === "session/forked"));
  assert.equal(session.repair(), 2);
  assert.equal(session.records.at(-1)?.type, "session/repaired");
});
