import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { loadConfig, type AppConfig } from "./config";
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

export class AppRuntime {
  readonly config: AppConfig;
  readonly trace: TraceWriter;

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
