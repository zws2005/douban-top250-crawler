import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { AgentLoop } from "../core/agent-loop";
import { createCrawlerTools } from "../core/agent-loop/crawler-tools";
import { selectProvider } from "../core/llm";
import type { SessionRecord } from "../core/session/types";
import { WebSearchService, type SearchResponse } from "../core/websearch";
import { loadConfig, type AppConfig } from "./config";
import { getAppPresetRegistry } from "./presets";
import { TraceWriter } from "./trace";

const execFileAsync = promisify(execFile);

export interface AnalysisSummary {
  clean_rows?: number;
  mean_rating?: number;
  median_rating?: number;
  total_rating_count?: number;
  median_rating_count?: number;
  rating_count_correlation?: number | null;
  top_rated_book?: string;
  most_reviewed_book?: string;
  top_publisher?: string;
}

export interface ScriptResult {
  stdout: string;
  stderr: string;
}

export interface WebSearchRunResult {
  response: SearchResponse;
  trace: string[];
}

export interface AgentRunSummary {
  output: string;
  steps: number;
  sessionPath: string;
  provider: string;
  model: string;
}

export type AgentTraceHandler = (line: string) => void;

export class AppRuntime {
  readonly config: AppConfig;
  readonly trace: TraceWriter;
  readonly webSearch = new WebSearchService();

  constructor(config = loadConfig()) {
    this.config = config;
    this.trace = new TraceWriter(config.traceDir);
  }

  async readSummary(): Promise<AnalysisSummary | null> {
    try {
      const file = path.join(this.config.analysisDir, "summary.json");
      return JSON.parse(await readFile(file, "utf8")) as AnalysisSummary;
    } catch {
      return null;
    }
  }

  async runAgent(task: string, onTrace?: AgentTraceHandler): Promise<AgentRunSummary> {
    const provider = selectProvider();
    const preset = getAppPresetRegistry().get("research");
    const tools = createCrawlerTools();
    const model =
      provider.name === "bailian"
        ? process.env.DASHSCOPE_MODEL ?? process.env.BAILIAN_MODEL ?? "qwen-plus"
        : provider.name === "deepseek"
          ? process.env.DEEPSEEK_MODEL ?? "deepseek-chat"
          : "demo";

    await this.trace.record("agent/start", {
      task,
      provider: provider.name,
      model,
      preset: preset.id
    });

    try {
      const loop = new AgentLoop({
        provider,
        tools,
        systemPrompt: preset.systemPrompt,
        plugins: preset.plugins,
        maxSteps: 6,
        onEvent: (event: SessionRecord) => {
          if (event.type === "tool/call") {
            onTrace?.(`● ${event.call.name} ${JSON.stringify(event.call.arguments)}`);
          } else if (event.type === "tool/result") {
            onTrace?.(
              `${event.result.isError ? "✖" : "✔"} ${event.result.name} ${event.result.durationMs} ms`
            );
          }
        }
      });
      const result = await loop.run(task);
      await this.trace.record("agent/end", {
        provider: provider.name,
        model,
        steps: result.steps,
        session: result.logPath
      });
      return {
        output: result.output,
        steps: result.steps,
        sessionPath: result.logPath,
        provider: provider.name,
        model
      };
    } catch (error) {
      await this.trace.record("agent/error", {
        provider: provider.name,
        model,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async searchWeb(query: string, limit = 3): Promise<WebSearchRunResult> {
    const trace: string[] = [
      `websearch/start query="${query}" limit=${limit}`,
      `websearch/provider provider=${this.webSearch.name}`
    ];
    await this.trace.record("websearch/start", { query, limit });
    await this.trace.record("websearch/provider", { provider: this.webSearch.name });
    const startedAt = Date.now();

    try {
      trace.push(`websearch/request query="${query}" limit=${limit}`);
      await this.trace.record("websearch/request", { query, limit });
      const response = await this.webSearch.search(query, { limit });
      const durationMs = Date.now() - startedAt;
      trace.push(
        `websearch/response provider=${response.provider} results=${response.results.length} durationMs=${durationMs}`
      );
      response.results.forEach((result, index) => {
        trace.push(`websearch/result #${index + 1} ${result.title}`);
      });
      await this.trace.record("websearch/response", {
        query,
        provider: response.provider,
        results: response.results.length,
        durationMs
      });
      return { response, trace };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      trace.push(`websearch/error durationMs=${durationMs}`);
      await this.trace.record("websearch/error", {
        query,
        durationMs,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async latestTrace(limit = 20): Promise<{ file: string; lines: string[] } | null> {
    return this.trace.latestPreview(limit);
  }

  async runScript(script: string): Promise<ScriptResult> {
    await this.trace.record("script/start", { script });
    try {
      const result = await execFileAsync("npm", ["run", script], {
        cwd: this.config.projectRoot,
        maxBuffer: 20 * 1024 * 1024,
        env: process.env
      });
      await this.trace.record("script/end", { script });
      return result;
    } catch (error) {
      await this.trace.record("script/error", {
        script,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
