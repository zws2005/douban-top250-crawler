# src/app/tui

这是项目的聊天式终端 UI（TUI）。

```bash
npm run tui
```

界面结构：

```text
DOUBAN AGENT  provider/model · 状态 · 待处理数
/help 帮助 · Esc 清空输入 · Ctrl+C 取消或退出
────────────────────────────────────────────
会话记录、工具 trace、Agent 回复
────────────────────────────────────────────
> 输入框
session: 最近一次 Agent JSONL 路径
```

## 输入方式

- 直接输入任务：使用 `research` Preset 启动 Agent，模型从 `.env` 自动选择。
- `/help`：显示命令。
- `/summary`：查看数据摘要。
- `/search <关键词>`：直接调用 `web_search`。
- `/trace`：查看最新 trace 文件前 20 行。
- `/crawl`：抓取 Top250。
- `/analyze`：清洗、分析和刷新看板。
- `/pipeline`：抓取 + 分析。
- `/session`：显示最近一次 Agent 会话路径。
- `/clear`：清空当前会话记录。
- `/quit` 或 `Ctrl+C`：退出。
- `Esc`：清空当前输入。

Agent 运行时，工具调用会实时显示：

```text
● web_search {"query":"豆瓣读书 Top250","maxResults":3}
✔ web_search 643 ms
```

完整模块设计见 [tui.md](tui.md)。
