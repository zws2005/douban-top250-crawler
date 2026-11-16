import { Tui } from "./tui";

const tui = new Tui();

tui.start().catch((error: unknown) => {
  console.error(`TUI 启动失败: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
