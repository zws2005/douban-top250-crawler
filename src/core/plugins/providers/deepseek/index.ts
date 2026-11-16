import type { ToolRegistry, ToolExecutionResult } from "../../../agent";
import type { ChatMessage, ToolCall } from "../../../llm";
import type { SessionLog } from "../../../session";

export interface AgentHookMap {
  "before-step": {
    step: number;
    messages: readonly ChatMessage[];
  };
  "after-tool": {
    call: ToolCall;
    result: ToolExecutionResult;
  };
  "after-turn": {
    output: string;
    steps: number;
  };
}

export type AgentHookName = keyof AgentHookMap;

export type AgentHook<K extends AgentHookName> = (
  payload: AgentHookMap[K]
) => void | Promise<void>;

export interface PluginContext {
  readonly session: SessionLog;
  readonly tools: ToolRegistry;
  on<K extends AgentHookName>(name: K, handler: AgentHook<K>): () => void;
}

export interface AgentPlugin {
  readonly name: string;
  setup(context: PluginContext): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

export { PluginRegistry } from "./adapter";
