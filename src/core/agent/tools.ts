import type { ToolCall, ToolSchema } from "../llm/types";
import type {
  ToolContext,
  ToolDefinition,
  ToolExecutionResult
} from "./types";

const MAX_RESULT_CHARS = 12_000;

function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  schemas(): ToolSchema[] {
    return [...this.tools.values()].map(({ name, description, parameters }) => ({
      name,
      description,
      parameters
    }));
  }

  async execute(call: ToolCall, context: ToolContext): Promise<ToolExecutionResult> {
    const tool = this.tools.get(call.name);
    const startedAt = Date.now();
    if (!tool) {
      return {
        callId: call.id,
        name: call.name,
        content: `Unknown tool: ${call.name}`,
        isError: true,
        durationMs: 0
      };
    }

    try {
      if (context.signal.aborted) throw new Error("tool execution cancelled");
      const content = serialize(await tool.execute(call.arguments, context));
      return {
        callId: call.id,
        name: call.name,
        content:
          content.length > MAX_RESULT_CHARS
            ? `${content.slice(0, MAX_RESULT_CHARS)}\n...[truncated]`
            : content,
        isError: false,
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      return {
        callId: call.id,
        name: call.name,
        content: `Tool failed: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
        durationMs: Date.now() - startedAt
      };
    }
  }
}
