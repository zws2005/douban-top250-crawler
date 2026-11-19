import type { AgentPreset, PresetSummary } from "./types";

export class PresetRegistry {
  private readonly presets = new Map<string, AgentPreset>();

  constructor(presets: readonly AgentPreset[] = []) {
    for (const preset of presets) this.register(preset);
  }

  register(preset: AgentPreset): this {
    if (this.presets.has(preset.id)) {
      throw new Error(`preset already registered: ${preset.id}`);
    }
    this.presets.set(preset.id, preset);
    return this;
  }

  get(id: string): AgentPreset {
    const preset = this.presets.get(id);
    if (!preset) throw new Error(`unknown preset: ${id}`);
    return preset;
  }

  has(id: string): boolean {
    return this.presets.has(id);
  }

  list(): PresetSummary[] {
    return [...this.presets.values()].map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      pluginCount: preset.plugins.length
    }));
  }
}
