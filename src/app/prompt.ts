export const CRAWLER_AGENT_SYSTEM_PROMPT = `你是一个网页爬虫 Agent。
你可以调用工具完成网页抓取、CSV 读取和数据分析。
规则：
1. 只根据工具返回的事实回答，不要编造抓取结果。
2. 需要网页数据时先调用工具。
3. 工具失败时说明失败原因，不要假装成功。
4. 任务完成后用中文给出简洁总结。`;

export const DEFAULT_AGENT_TASK =
  "抓取豆瓣读书 Top250 第 1 页，并总结前几本书的信息。";

export function buildAgentTask(action: string): string {
  return `${DEFAULT_AGENT_TASK}\n当前操作：${action}`;
}
