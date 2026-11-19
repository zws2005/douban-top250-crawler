import readline from "node:readline";
import type { AgentRunSummary, AnalysisSummary, AppRuntime } from "../runtime";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  clear: "\x1b[2J\x1b[H",
  enterAlt: "\x1b[?1049h",
  exitAlt: "\x1b[?1049l",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h"
};

const HELP = [
  "/help              显示帮助",
  "/summary           查看数据摘要",
  "/search <关键词>   调用 web_search",
  "/trace             查看最新 trace 最近 20 行",
  "/crawl             抓取 Top250",
  "/analyze           清洗、分析、刷新图表和看板",
  "/pipeline          抓取 + 分析",
  "/session           显示最近一次 Agent 会话路径",
  "/clear             清空当前对话",
  "/quit              退出"
];

const COMMANDS = new Set([
  "/help", "/summary", "/search", "/trace", "/crawl", "/analyze",
  "/pipeline", "/session", "/clear", "/quit"
]);

function line(width: number, char = "─"): string {
  return char.repeat(Math.max(10, width));
}

export class Tui {
  private summary: AnalysisSummary | null = null;
  private transcript: string[] = [];
  private input = "";
  private status = "就绪";
  private busy = false;
  private closed = false;
  private providerLabel = "provider: auto";
  private sessionPath = "";

  constructor(private readonly runtime: AppRuntime) {}

  async start(): Promise<void> {
    if (!process.stdin.isTTY) {
      this.printStaticHelp();
      return;
    }

    process.stdout.write(ANSI.enterAlt + ANSI.hideCursor);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("keypress", (text, key) => {
      void this.onKey(text, key);
    });

    await this.refreshSummary();
    this.transcript.push(
      "DOUBAN AGENT",
      "输入任务开始对话；/help 查看命令；Esc 清空输入；Ctrl+C 退出。",
      ""
    );
    this.appendSummary();
    this.render();
  }

  private printStaticHelp(): void {
    console.log("DOUBAN AGENT");
    console.log("请在真实终端中运行：npm run tui\n");
    console.log(HELP.join("\n"));
  }

  private async refreshSummary(): Promise<void> {
    this.summary = await this.runtime.readSummary();
  }

  private appendSummary(): void {
    const s = this.summary;
    if (!s) {
      this.transcript.push("暂无 analysis/summary.json，可输入 /analyze 或 /pipeline 生成。", "");
      return;
    }
    this.transcript.push(
      `数据: ${s.clean_rows ?? "-"} 本 · 平均评分 ${Number(s.mean_rating ?? 0).toFixed(2)} · 评价人数 ${Number(s.total_rating_count ?? 0).toLocaleString("zh-CN")}`,
      `头部: ${s.top_rated_book ?? "-"} · ${s.most_reviewed_book ?? "-"} · ${s.top_publisher ?? "-"}`,
      ""
    );
  }

  private render(): void {
    if (this.closed) return;
    const width = Math.max(72, Math.min(process.stdout.columns ?? 100, 120));
    const rows = Math.max(24, process.stdout.rows ?? 40);
    const visible = Math.max(8, rows - 13);
    const out: string[] = [ANSI.clear];
    out.push(`${ANSI.bold}${ANSI.blue}  DOUBAN AGENT${ANSI.reset}  ${ANSI.dim}${this.providerLabel} · ${this.status} · 待处理 ${this.busy ? 1 : 0}${ANSI.reset}`);
    out.push(`${ANSI.dim}  /help 帮助 · Esc 清空输入 · Ctrl+C 取消或退出${ANSI.reset}`);
    out.push(line(width));
    for (const row of this.transcript.slice(-visible)) {
      out.push(this.colorLine(row, width));
    }
    out.push(line(width));
    out.push(`${ANSI.cyan}> ${this.input}█${ANSI.reset}`);
    out.push(`${ANSI.dim}  ${this.sessionPath ? `session: ${this.sessionPath}` : "session: 尚未运行 Agent"}${ANSI.reset}`);
    process.stdout.write(out.join("\n") + "\n");
  }

  private colorLine(row: string, width: number): string {
    const text = row.slice(0, width - 2);
    if (text.startsWith("●")) return `${ANSI.yellow}${text}${ANSI.reset}`;
    if (text.startsWith("✔")) return `${ANSI.green}${text}${ANSI.reset}`;
    if (text.startsWith("✖")) return `${ANSI.red}${text}${ANSI.reset}`;
    if (text.startsWith(">")) return `${ANSI.cyan}${text}${ANSI.reset}`;
    if (text === "本轮完成") return `${ANSI.green}${text}${ANSI.reset}`;
    return text;
  }

  private append(text: string): void {
    for (const row of String(text).split(/\r?\n/)) this.transcript.push(row);
  }

  private async onKey(text: string, key: readline.Key): Promise<void> {
    if (key.ctrl && key.name === "c") {
      this.quit();
      return;
    }
    if (this.busy) return;
    if (key.name === "escape") {
      this.input = "";
      this.status = "已清空输入";
      this.render();
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      await this.submit();
      return;
    }
    if (key.name === "backspace") {
      this.input = this.input.slice(0, -1);
      this.render();
      return;
    }
    if (text && !key.ctrl && !key.meta) {
      this.input = (this.input + text).slice(0, 500);
      this.render();
    }
  }

  private async submit(): Promise<void> {
    const value = this.input.trim();
    if (!value) return;
    this.input = "";
    this.append(`> ${value}`);
    if (value.startsWith("/")) {
      await this.runCommand(value);
    } else {
      await this.runAgent(value);
    }
  }

  private async runCommand(commandLine: string): Promise<void> {
    const [command, ...rest] = commandLine.split(/\s+/);
    const argument = rest.join(" ").trim();

    if (!COMMANDS.has(command!)) {
      this.append(`未知命令: ${command}`);
      this.append(HELP.join("\n"));
      this.render();
      return;
    }
    if (command === "/quit") {
      this.quit();
      return;
    }
    if (command === "/help") {
      this.append(HELP.join("\n"));
      this.render();
      return;
    }
    if (command === "/clear") {
      this.transcript = ["DOUBAN AGENT", ""];
      this.render();
      return;
    }
    if (command === "/session") {
      this.append(this.sessionPath || "尚未运行 Agent");
      this.render();
      return;
    }
    if (command === "/summary") {
      await this.refreshSummary();
      this.appendSummary();
      this.render();
      return;
    }
    if (command === "/trace") {
      const latest = await this.runtime.latestTrace(20);
      if (!latest) {
        this.append("暂无 trace 文件");
      } else {
        this.append(`文件: ${latest.file}`);
        this.append(latest.lines.join("\n"));
      }
      this.render();
      return;
    }
    if (command === "/search") {
      if (!argument) {
        this.append("用法: /search <关键词>");
        this.render();
        return;
      }
      await this.runWebSearch(argument);
      return;
    }
    if (["/crawl", "/analyze", "/pipeline"].includes(command!)) {
      await this.runScript(command!.slice(1));
      return;
    }
  }

  private async runAgent(task: string): Promise<void> {
    this.busy = true;
    this.status = "Agent 运行中";
    this.render();
    try {
      const result = await this.runtime.runAgent(task, (trace) => {
        this.append(trace);
        this.render();
      });
      this.providerLabel = `${result.provider}/${result.model}`;
      this.sessionPath = result.sessionPath;
      this.append("");
      this.append(result.output);
      this.append("本轮完成");
      this.append("输入 /trace 可查看最新 20 条工具 trace。");
      this.status = "就绪";
    } catch (error) {
      this.append(`Agent 失败: ${error instanceof Error ? error.message : String(error)}`);
      this.status = "失败";
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async runWebSearch(query: string): Promise<void> {
    this.busy = true;
    this.status = `搜索: ${query}`;
    this.render();
    try {
      const { response, trace } = await this.runtime.searchWeb(query, 3);
      this.append("工具 trace:");
      this.append(trace.map((row) => `  ${row}`).join("\n"));
      this.append("");
      this.append(`[${response.provider}] ${response.query}`);
      if (response.answer) this.append(`回答: ${response.answer}`);
      response.results.forEach((result, index) => {
        this.append(`${index + 1}. ${result.title}`);
        this.append(`   ${result.url}`);
        if (result.snippet) this.append(`   ${result.snippet}`);
      });
      this.append("本轮完成");
      this.status = `搜索完成: ${response.results.length} 条结果`;
    } catch (error) {
      this.append(`搜索失败: ${error instanceof Error ? error.message : String(error)}`);
      this.status = "搜索失败";
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async runScript(script: string): Promise<void> {
    this.busy = true;
    this.status = `执行 npm run ${script}`;
    this.render();
    try {
      const { stdout, stderr } = await this.runtime.runScript(script);
      const output = `${stdout}\n${stderr}`.trim().split(/\r?\n/).filter(Boolean);
      this.append(output.slice(-12).join("\n") || "命令执行完成，无输出");
      await this.refreshSummary();
      this.status = `完成: npm run ${script}`;
    } catch (error) {
      this.append(`命令失败: ${error instanceof Error ? error.message : String(error)}`);
      this.status = `失败: npm run ${script}`;
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private quit(): void {
    if (this.closed) return;
    this.closed = true;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write(ANSI.showCursor + ANSI.exitAlt);
    }
    process.exitCode = 0;
  }
}
