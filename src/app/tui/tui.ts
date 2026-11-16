import readline from "node:readline";
import type { AnalysisSummary } from "../runtime";
import type { AppRuntime } from "../runtime";

interface MenuItem {
  key: string;
  label: string;
  description: string;
  script?: string;
}

const MENU: MenuItem[] = [
  { key: "1", label: "抓取 Top250", description: "抓取 10 页并写入 data/raw_books.csv", script: "crawl" },
  { key: "2", label: "清洗与分析", description: "刷新 clean CSV、报告、图表和看板", script: "analyze" },
  { key: "3", label: "完整流水线", description: "抓取 + 清洗 + 高级分析 + 看板", script: "pipeline" },
  { key: "4", label: "Agent 演示", description: "运行离线爬虫 Agent，不需要 API Key", script: "agent:demo" },
  { key: "5", label: "查看摘要", description: "读取 analysis/summary.json", script: undefined }
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
    if (this.lastOutput.length > 0) {
      out.push(`${ANSI.bold}  最近输出${ANSI.reset}`);
      for (const row of this.lastOutput.slice(-10)) out.push(`  ${row.slice(0, width - 4)}`);
    }
    out.push(`${ANSI.dim}  提示: 操作执行期间不会阻塞终端界面。${ANSI.reset}`);
    process.stdout.write(out.join("\n") + "\n");
  }

  private async onKey(text: string, key: readline.Key): Promise<void> {
    if (key.ctrl && key.name === "c") {
      this.quit();
      return;
    }
    if (this.busy) return;
    if (text === "q" || key.name === "escape") {
      this.quit();
      return;
    }
    const item = MENU.find((entry) => entry.key === text);
    if (!item) return;
    if (!item.script) {
      await this.refreshSummary();
      this.status = "摘要已刷新";
      this.lastOutput = [];
      this.render();
      return;
    }
    await this.runScript(item.script);
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
