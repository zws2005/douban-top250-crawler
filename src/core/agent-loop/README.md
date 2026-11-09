# core/agent-loop

这是最小化的 Agent 驱动器。

- `index.ts`：执行“模型调用 → 工具调用 → 工具结果 → 下一轮模型调用”的循环，记录会话事件，限制最大步数，传递取消信号，并持久化会话日志。
- `crawler-tools.ts`：把本项目的网页抓取、批量爬取、CSV 读取和 pandas 分析封装成 Agent 工具。

该循环遵循 DeepSeek Harness core 的基本模式：模型返回工具调用后，程序执行工具并把结果回填给模型，直到模型给出最终回答。
