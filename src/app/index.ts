import { loadEnvFile } from "./env";
import { AppRuntime } from "./runtime";
import { Tui } from "./tui";

loadEnvFile();
const runtime = new AppRuntime();
const tui = new Tui(runtime);

tui.start().catch((error: unknown) => {
  console.error(`TUI 启动失败: ${error instanceof Error ? error.message : String(error)}`);
  void runtime.trace.record("tui/fatal", {
    message: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
