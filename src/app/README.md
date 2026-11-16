# src/app

应用层负责终端交互、运行配置、Agent 提示词、运行时控制和追踪日志。

```text
src/app/
├── config.ts     # 环境变量与项目路径
├── env.ts        # .env 文件读取
├── index.ts      # 应用启动入口
├── prompt.ts     # Agent 系统提示词与默认任务
├── runtime.ts    # 摘要读取、npm 脚本执行、追踪
├── trace.ts      # JSONL 运行追踪
├── tui/          # 终端交互界面
└── README.md
```

运行：

```bash
npm run tui
```

应用层不直接实现爬虫和清洗逻辑，而是通过 `runtime.ts` 调用项目现有脚本。运行追踪保存到 `data/app-traces/`。
