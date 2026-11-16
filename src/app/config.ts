import path from "node:path";

export interface AppConfig {
  projectRoot: string;
  dataDir: string;
  analysisDir: string;
  sessionDir: string;
  traceDir: string;
  deepSeekApiKey?: string;
  deepSeekBaseUrl: string;
  deepSeekModel: string;
  bailianApiKey?: string;
  bailianBaseUrl: string;
  bailianModel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const projectRoot = path.resolve(__dirname, "../../..");
  const dataDir = path.join(projectRoot, "data");
  return {
    projectRoot,
    dataDir,
    analysisDir: path.join(projectRoot, "analysis"),
    sessionDir: path.join(dataDir, "agent-sessions"),
    traceDir: path.join(dataDir, "app-traces"),
    deepSeekApiKey: env.DEEPSEEK_API_KEY,
    deepSeekBaseUrl: env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    deepSeekModel: env.DEEPSEEK_MODEL ?? "deepseek-chat",
    bailianApiKey: env.DASHSCOPE_API_KEY ?? env.BAILIAN_API_KEY,
    bailianBaseUrl:
      env.DASHSCOPE_BASE_URL ??
      env.BAILIAN_BASE_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1",
    bailianModel: env.DASHSCOPE_MODEL ?? env.BAILIAN_MODEL ?? "qwen-plus"
  };
}
