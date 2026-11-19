import readline from "node:readline";
import type { AnalysisSummary } from "../runtime";
import type { AppRuntime } from "../runtime";

interface MenuItem {
  key: string;
  label: string;
  description: string;
  script?: string;
  action?: "websearch" | "trace";
}

const MENU: MenuItem[] = [
  { key: "1", label: "抓取 Top250", description: "抓取 10 页并写入 data/raw_books.csv", script: "crawl" },
  { key: "2", label: "清洗与分析", description: "刷新 clean CSV、报告、图表和看板", script: "analyze" },
  { key: "3", label: "完整流水线", description: "抓取 + 清洗 + 高级分析 + 看板", script: "pipeline" },
  { key: "4", label: "Agent 演示", description: "运行离线爬虫 Agent，不需要 API Key", script: "agent:demo" },
  { key: "5", label: "查看摘要", description: "读取 analysis/summary.json", script: undefined },
  { key: "6", label: "联网搜索", description: "输入关键词并调用 web_search", action: "websearch" },
  { key: "7", label: "查看 Trace", description: "显示最新 trace 文件前 20 行", action: "trace" }
];

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

function line(width: number, char = "─"): string {
  return char.repeat(Math.max(10, width));
}

function pad(text: string, width: number): string {
  const visible = text.replace(/\x1b\[[0-9;]*m/g, "");
  return text + " ".repeat(Math.max(0, width - visible.length));
}

export class Tui {
  private summary: AnalysisSummary | null = null;
  private status = "就绪";
  private busy = false;
  private lastOutput: string[] = [];
  private closed = false;
  private mode: "menu" | "search" = "menu";
  private searchInput = "";

  constructor(private readonly runtime: AppRuntime) {}

  async start(): Promise<void> {
    if (!process.stdin.isTTY) {
      this.printStaticMenu();
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
    this.render();
  }

  private printStaticMenu(): void {
    console.log("豆瓣 Top250 爬虫 TUI");
    console.log("请在真实终端中运行：npm run tui\n");
    for (const item of MENU) console.log(`  ${item.key}. ${item.label} - ${item.description}`);
    console.log("  q. 退出");
  }

  private async refreshSummary(): Promise<void> {
    this.summary = await this.runtime.readSummary();
  }

  private render(): void {
    if (this.closed) return;
    const width = Math.max(72, Math.min(process.stdout.columns ?? 90, 104));
    const s = this.summary;
    const out: string[] = [ANSI.clear];
    out.push(`${ANSI.bold}${ANSI.blue}  豆瓣读书 Top250 · 爬虫 Agent 控制台${ANSI.reset}`);
    out.push(`${ANSI.dim}  工作目录: ${this.runtime.config.projectRoot}${ANSI.reset}`);
    out.push(line(width));
    out.push(`${ANSI.bold}  数据摘要${ANSI.reset}`);
    if (s) {
      out.push(`  图书: ${s.clean_rows ?? "-"}   平均评分: ${Number(s.mean_rating ?? 0).toFixed(2)}   评分中位数: ${Number(s.median_rating ?? 0).toFixed(2)}`);
      out.push(`  评价人数合计: ${Number(s.total_rating_count ?? 0).toLocaleString("zh-CN")}   评分最高: ${s.top_rated_book ?? "-"}`);
      out.push(`  评价人数最多: ${s.most_reviewed_book ?? "-"}   头部出版社: ${s.top_publisher ?? "-"}`);
    } else {
      out.push("  暂无 analysis/summary.json，请先执行“清洗与分析”或“完整流水线”。");
    }
    out.push(line(width));
    out.push(`${ANSI.bold}  操作${ANSI.reset}`);
    for (const item of MENU) {
      out.push(`  ${ANSI.cyan}[${item.key}]${ANSI.reset} ${pad(item.label, 18)} ${ANSI.dim}${item.description}${ANSI.reset}`);
    }
    out.push(`  ${ANSI.cyan}[q]${ANSI.reset} 退出`);
    out.push(line(width));
    out.push(`  状态: ${this.busy ? ANSI.yellow + "运行中" + ANSI.reset : ANSI.green + this.status + ANSI.reset}`);
    if (this.mode === "search") {
      out.push(`${ANSI.bold}  联网搜索${ANSI.reset}`);
      out.push(`  关键词: ${this.searchInput}█`);
      out.push(`${ANSI.dim}  Enter 搜索 · Esc 返回菜单${ANSI.reset}`);
    } else if (this.lastOutput.length > 0) {
      out.push(`${ANSI.bold}  最近输出${ANSI.reset}`);
      for (const row of this.lastOutput.slice(0, 18)) out.push(`  ${row.slice(0, width - 4)}`);
    }
    out.push(`${ANSI.dim}  提示: 按 6 输入关键词执行 web_search。${ANSI.reset}`);
    process.stdout.write(out.join("\n") + "\n");
  }

  private async onKey(text: string, key: readline.Key): Promise<void> {
    if (key.ctrl && key.name === "c") {
      this.quit();
      return;
    }
    if (this.busy) return;
    if (this.mode === "search") {
      await this.onSearchKey(text, key);
      return;
    }
    if (text === "q" || key.name === "escape") {
      this.quit();
      return;
    }
    const item = MENU.find((entry) => entry.key === text);
    if (!item) return;
    if (item.action === "websearch") {
      this.mode = "search";
      this.searchInput = "";
      this.status = "等待输入搜索关键词";
      this.lastOutput = [];
      this.render();
      return;
    }
    if (item.action === "trace") {
      await this.showTrace();
      return;
    }
    if (!item.script) {
      await this.refreshSummary();
      this.status = "摘要已刷新";
      this.lastOutput = [];
      this.render();
      return;
    }
    await this.runScript(item.script);
  }

  private async onSearchKey(text: string, key: readline.Key): Promise<void> {
    if (key.name === "escape") {
      this.mode = "menu";
      this.status = "就绪";
      this.render();
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const query = this.searchInput.trim();
      if (query) await this.runWebSearch(query);
      return;
    }
    if (key.name === "backspace") {
      this.searchInput = this.searchInput.slice(0, -1);
      this.render();
      return;
    }
    if (text && !key.ctrl && !key.meta && !key.name?.startsWith("f")) {
      this.searchInput = (this.searchInput + text).slice(0, 100);
      this.render();
    }
  }

  private async showTrace(): Promise<void> {
    const latest = await this.runtime.latestTrace(20);
    if (!latest) {
      this.lastOutput = ["暂无 trace 文件"];
      this.status = "Trace 为空";
    } else {
      this.lastOutput = [`文件: ${latest.file}`, ...latest.lines];
      this.status = `已加载最新 Trace: ${latest.lines.length} 行`;
    }
    this.render();
  }

  private async runWebSearch(query: string): Promise<void> {
    this.mode = "menu";
    this.busy = true;
    this.status = `搜索: ${query}`;
    this.lastOutput = [];
    this.render();

    try {
      const { response, trace } = await this.runtime.searchWeb(query, 3);
      const lines = ["工具 trace:", ...trace.map((line) => `  ${line}`), "", `[${response.provider}] ${response.query}`];
      if (response.answer) lines.push(`回答: ${response.answer}`);
      response.results.forEach((result, index) => {
        lines.push(`${index + 1}. ${result.title}`);
        lines.push(`   ${result.url}`);
        if (result.snippet) lines.push(`   ${result.snippet}`);
      });
      this.lastOutput = lines;
      this.status = response.results.length
        ? `搜索完成: ${response.results.length} 条结果`
        : "搜索完成，但没有结果";
    } catch (error) {
      this.lastOutput = [error instanceof Error ? error.message : String(error)];
      this.status = "搜索失败";
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async runScript(script: string): Promise<void> {
    this.busy = true;
    this.status = `执行 npm run ${script}`;
    this.lastOutput = [];
    this.render();

    try {
      const { stdout, stderr } = await this.runtime.runScript(script);
      const output = `${stdout}\n${stderr}`.trim().split(/\r?\n/).filter(Boolean);
      this.lastOutput = output.length ? output : ["命令执行完成，无输出"];
      this.status = `完成: npm run ${script}`;
      await this.refreshSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastOutput = message.split(/\r?\n/).slice(-10);
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
