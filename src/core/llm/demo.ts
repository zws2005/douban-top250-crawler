import type { LlmProvider, LlmRequest, LlmResponse } from "./types";

/** Read-only provider for development without an API key. */
export class DemoCrawlerProvider implements LlmProvider {
  readonly name = "demo";

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const toolMessage = [...request.messages].reverse().find((message) => message.role === "tool");
    if (toolMessage) {
      return {
        content: `离线演示完成。工具返回结果：\n${toolMessage.content}`,
        toolCalls: []
      };
    }
    return {
      content: "",
      toolCalls: [
        { id: "demo-fetch-page-1", name: "fetch_top250_page", arguments: { page: 1 } }
      ]
    };
  }
}
