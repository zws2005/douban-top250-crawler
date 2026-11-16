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
    deepSeekModel: env.DEEPSEEK_MODEL ?? "deepseek-chat"
  };
}
