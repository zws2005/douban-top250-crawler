import { loadEnvFile } from "./app/env";
import { AppRuntime } from "./app/runtime";

async function main(): Promise<void> {
  loadEnvFile();
  const runtime = new AppRuntime();
  const latest = await runtime.latestTrace(20);
  if (!latest) {
    console.log("暂无 trace 文件");
    return;
  }
  console.log(`文件: ${latest.file}`);
  console.log(latest.lines.join("\n"));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
