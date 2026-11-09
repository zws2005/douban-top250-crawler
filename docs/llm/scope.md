# scope：作用域

路径：`src/core/scope`

`scope` 提供最小作用域标识，用于后续隔离不同 Agent 的工具和状态。

```ts
import { createScope } from "../../src/core/scope";

const scope = createScope("crawler-agent");

console.log(scope.id); // crawler-agent
```

当前 Core 只实现标识和校验，后续可以在 `ToolRegistry`、Session 和缓存中按 scope 进行隔离。
