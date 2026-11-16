import type { ToolRegistry } from "../../../agent";
import type { SessionLog } from "../../../session";
import type {
  AgentHook,
  AgentHookMap,
  AgentHookName,
  AgentPlugin,
  PluginContext
} from ".";

type AnyHook = (payload: unknown) => void | Promise<void>;

export class PluginRegistry {
  private readonly plugins: AgentPlugin[] = [];
  private readonly handlers = new Map<AgentHookName, Set<AnyHook>>();
  private disposed = false;

  constructor(
    private readonly session: SessionLog,
    private readonly tools: ToolRegistry
  ) {}

  async setup(plugins: readonly AgentPlugin[]): Promise<void> {
    const context: PluginContext = {
      session: this.session,
      tools: this.tools,
      on: (name, handler) => this.on(name, handler)
    };

    try {
      for (const plugin of plugins) {
        await plugin.setup(context);
        this.plugins.push(plugin);
      }
    } catch (error) {
      await this.dispose();
      throw error;
    }
  }

  on<K extends AgentHookName>(name: K, handler: AgentHook<K>): () => void {
    const handlers = this.handlers.get(name) ?? new Set<AnyHook>();
    const internal = handler as unknown as AnyHook;
    handlers.add(internal);
    this.handlers.set(name, handlers);
    return () => handlers.delete(internal);
  }

  async emit<K extends AgentHookName>(name: K, payload: AgentHookMap[K]): Promise<void> {
    if (this.disposed) return;
    const handlers = this.handlers.get(name);
    if (!handlers) return;
    for (const handler of handlers) {
      await handler(payload);
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    for (const plugin of [...this.plugins].reverse()) {
      await plugin.dispose?.();
    }
    this.plugins.length = 0;
    this.handlers.clear();
  }
}
