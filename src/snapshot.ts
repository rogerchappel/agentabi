import type { AgentAbiConfig, AgentSnapshot, ProbeConfig, Snapshot } from './types.js';
import { resolveFromConfig } from './config.js';
import { resolveCommand, runProbe } from './probe.js';
import { readToolCatalog } from './tools.js';

const DEFAULT_VERSION_PROBE: ProbeConfig = { args: ['--version'], timeoutMs: 5000 };
const DEFAULT_HELP_PROBE: ProbeConfig = { args: ['--help'], timeoutMs: 5000 };

export async function captureSnapshot(
  config: AgentAbiConfig,
  options: { configPath: string; stdin?: string }
): Promise<Snapshot> {
  const agents: AgentSnapshot[] = [];
  const catalogs = [];

  for (const agent of config.agents) {
    const resolvedPath = await resolveCommand(agent.command);
    const commandToRun = resolvedPath ?? agent.command;
    const probes: AgentSnapshot['probes'] = {};
    const configuredProbes: Record<string, ProbeConfig | undefined> = {
      version: agent.version ?? DEFAULT_VERSION_PROBE,
      help: agent.help ?? DEFAULT_HELP_PROBE,
      smoke: agent.smoke
    };

    for (const [name, probe] of Object.entries(configuredProbes)) {
      if (probe) {
        probes[name] = await runProbe(commandToRun, probe);
      }
    }

    agents.push({
      id: agent.id,
      command: agent.command,
      resolvedPath,
      probes,
      requiredEnv: Object.fromEntries(agent.requiredEnv?.map((name) => [name, process.env[name] !== undefined]) ?? []),
      permissionFlags: [...(agent.permissionFlags ?? [])].sort()
    });
  }

  for (const catalog of config.toolCatalogs ?? []) {
    const catalogPath = resolveFromConfig(options.configPath, catalog.path);
    catalogs.push(await readToolCatalog(catalog.id, catalogPath, options.stdin));
  }

  return {
    schemaVersion: 1,
    agents: agents.sort((left, right) => left.id.localeCompare(right.id)),
    toolCatalogs: catalogs.sort((left, right) => left.id.localeCompare(right.id))
  };
}
