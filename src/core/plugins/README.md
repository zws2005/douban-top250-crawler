# core/plugins

`core/plugins` 提供最小插件系统，用于在不修改 AgentLoop 的情况下扩展工具和行为。

## 文件

| 文件 | 作用 |
| --- | --- |
| `types.ts` | 插件、Hook 和 PluginContext 类型 |
| `registry.ts` | 插件安装、Hook 分发和清理 |
| `index.ts` | 统一导出 |
| `README.md` | 模块说明 |

## 插件生命周期

```text
PluginRegistry.setup(plugins)
  → plugin.setup(context)
  → 注册工具
  → 订阅 Hook
  → AgentLoop 运行
  → emit before-step / after-tool / after-turn
  → PluginRegistry.dispose()
  → plugin.dispose()
```

## 最小插件示例

```ts
import type { AgentPlugin } from "../../src/core/plugins";

const echoPlugin: AgentPlugin = {
  name: "echo-plugin",

  setup(context) {
    context.tools.register({
      name: "echo",
      description: "返回输入文本",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } }
      },
      execute(args) {
        return { echoed: args.text };
      }
    });

    context.on("after-tool", ({ call, result }) => {
      console.log(`工具 ${call.name} 完成，错误=${result.isError}`);
    });

    context.on("after-turn", ({ output, steps }) => {
      console.log(`turn 完成，steps=${steps}，output=${output}`);
    });
  },

  dispose() {
    console.log("plugin disposed");
  }
};
```

## 在 AgentLoop 中使用

```ts
import { AgentLoop } from "../../src/core/agent-loop";
import { DemoCrawlerProvider } from "../../src/core/llm";
import { createCrawlerTools } from "../../src/core/agent-loop/crawler-tools";

const loop = new AgentLoop({
  provider: new DemoCrawlerProvider(),
  tools: createCrawlerTools(),
  plugins: [echoPlugin],
  maxSteps: 4
});

const result = await loop.run("抓取第一页");
```

## 可用 Hook

| Hook | 参数 | 执行时机 |
| --- | --- | --- |
| `before-step` | `{ step, messages }` | 每次模型调用前 |
| `after-tool` | `{ call, result }` | 每个工具执行完成后 |
| `after-turn` | `{ output, steps }` | turn 结束前 |

Hook 可以异步执行；插件异常会终止当前 Agent 运行，并触发已安装插件的 `dispose()`。

## 边界

当前插件系统不包含：

- 插件市场。
- 动态加载远程包。
- 权限审批。
- 插件之间的依赖解析。
- 插件热更新。

后续可以在现有 Hook 和 PluginContext 上扩展这些能力。
