# DeepSeek Harness Core 来源说明

本目录是对 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 核心设计的最小化适配实现。DeepSeek Harness 使用 MIT 许可证。

本项目参考并重新实现了以下核心概念：

- 追加式会话事件日志（append-only session event log）
- 工具注册与受控执行
- 在模型调用和工具调用之间循环的 Agent Loop
- 可替换的模型 Provider 抽象与取消机制
- turn / tool-call / tool-result 生命周期事件

本项目没有逐字复制上游源代码。这里的实现刻意保持最小化，便于在豆瓣 Top250 爬虫项目中继续扩展自己的爬虫 Agent。
