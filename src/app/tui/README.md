# src/app/tui

这是项目的终端 UI（TUI）实现目录。

```bash
npm run tui
```

TUI 提供：

- 抓取 Top250
- 清洗与分析
- 完整流水线
- 离线 Agent 演示
- 查看最新数据摘要
- 联网搜索：按 `6` 输入关键词，Enter 执行 `web_search`

目录结构：

```text
src/app/tui/
├── index.ts     # 导出 Tui，不直接启动
├── tui.ts       # 界面、键盘输入和交互状态
├── README.md    # 使用说明
└── tui.md       # 模块设计说明
```

实际启动入口是 `src/app/index.ts`。TUI 通过 `AppRuntime` 调用现有 npm 脚本，不直接实现爬虫和清洗逻辑。

完整的模块职责、依赖图和扩展说明见 [tui.md](tui.md)。
