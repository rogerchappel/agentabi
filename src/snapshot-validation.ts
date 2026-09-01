import type { Snapshot } from './types.js';

export function validateSnapshot(value: unknown, source: string): Snapshot {
  const snapshot = object(value, source);
  if (snapshot.schemaVersion !== 1) fail(`${source}.schemaVersion`, 'must be 1');

  array(snapshot.agents, `${source}.agents`).forEach((entry, index) => {
    const path = `${source}.agents[${index}]`;
    const agent = object(entry, path);
    string(agent.id, `${path}.id`);
    string(agent.command, `${path}.command`);
    nullableString(agent.resolvedPath, `${path}.resolvedPath`);
    const probes = object(agent.probes, `${path}.probes`);
    for (const [name, resultValue] of Object.entries(probes)) {
      const resultPath = `${path}.probes.${name}`;
      const result = object(resultValue, resultPath);
      stringArray(result.args, `${resultPath}.args`);
      nullableNumber(result.exitCode, `${resultPath}.exitCode`);
      nullableString(result.signal, `${resultPath}.signal`);
      string(result.stdout, `${resultPath}.stdout`);
      string(result.stderr, `${resultPath}.stderr`);
      boolean(result.timedOut, `${resultPath}.timedOut`);
    }
    const requiredEnv = object(agent.requiredEnv, `${path}.requiredEnv`);
    for (const [name, present] of Object.entries(requiredEnv)) boolean(present, `${path}.requiredEnv.${name}`);
    stringArray(agent.permissionFlags, `${path}.permissionFlags`);
  });

  array(snapshot.toolCatalogs, `${source}.toolCatalogs`).forEach((entry, index) => {
    const path = `${source}.toolCatalogs[${index}]`;
    const catalog = object(entry, path);
    string(catalog.id, `${path}.id`);
    string(catalog.source, `${path}.source`);
    array(catalog.tools, `${path}.tools`).forEach((toolValue, toolIndex) => {
      const toolPath = `${path}.tools[${toolIndex}]`;
      const tool = object(toolValue, toolPath);
      string(tool.name, `${toolPath}.name`);
      optionalString(tool.description, `${toolPath}.description`);
      optionalString(tool.inputSchemaHash, `${toolPath}.inputSchemaHash`);
    });
  });

  return value as Snapshot;
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'must be an object');
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, 'must be an array');
  return value;
}

function string(value: unknown, path: string): void {
  if (typeof value !== 'string') fail(path, 'must be a string');
}

function optionalString(value: unknown, path: string): void {
  if (value !== undefined) string(value, path);
}

function nullableString(value: unknown, path: string): void {
  if (value !== null) string(value, path);
}

function nullableNumber(value: unknown, path: string): void {
  if (value !== null && (typeof value !== 'number' || !Number.isInteger(value))) fail(path, 'must be an integer or null');
}

function boolean(value: unknown, path: string): void {
  if (typeof value !== 'boolean') fail(path, 'must be a boolean');
}

function stringArray(value: unknown, path: string): void {
  array(value, path).forEach((entry, index) => string(entry, `${path}[${index}]`));
}

function fail(path: string, message: string): never {
  throw new Error(`${path} ${message}`);
}
