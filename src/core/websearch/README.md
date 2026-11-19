# core/websearch

Web Search 工具和 Provider 适配层。

## Provider

| Provider | 是否需要 Key | 默认 |
| --- | --- | --- |
| `bing` | 否 | 是 |
| `duckduckgo` | 否 | 可选 |
| `tavily` | 是 | 有 Key 时优先 |

选择规则：

```text
WEB_SEARCH_PROVIDER 显式指定
  ↓
存在 TAVILY_API_KEY → tavily
  ↓
默认 bing
```

可用环境变量：

```bash
WEB_SEARCH_PROVIDER=bing
TAVILY_API_KEY=
```

## Agent 工具

`createWebSearchPlugin()` 注册工具 `web_search`：

```ts
import { createWebSearchPlugin } from "../../src/core/websearch";

const plugin = createWebSearchPlugin();
```

调用参数：

```json
{ "query": "豆瓣读书 Top250", "maxResults": 5 }
```

返回：

```json
{
  "query": "豆瓣读书 Top250",
  "provider": "bing",
  "results": [
    { "title": "...", "url": "...", "snippet": "..." }
  ]
}
```

## 直接调用

```ts
import { WebSearchService } from "../../src/core/websearch";

const service = new WebSearchService();
const response = await service.search("豆瓣读书 Top250", { limit: 5 });
console.log(response);
```
