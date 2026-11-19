import type { AgentPlugin } from "../plugins/providers/deepseek";

export interface AgentPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systemPrompt: string;
  readonly plugins: readonly AgentPlugin[];
}

export interface PresetSummary {
  id: string;
  name: string;
  description: string;
  pluginCount: number;
}
