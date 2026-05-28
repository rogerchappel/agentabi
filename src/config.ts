import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import type { AgentAbiConfig, AgentConfig, ProbeConfig, ToolCatalogConfig } from './types.js';

export async function loadConfig(configPath: string): Promise<AgentAbiConfig> {
  const raw = await readFile(configPath, 'utf8');
  const parsed = parse(raw) as unknown;
  return normalizeConfig(parsed, configPath);
}

export function normalizeConfig(value: unknown, source = 'config'): AgentAbiConfig {
  if (!isRecord(value)) {
    throw new Error(`${source} must contain a YAML object.`);
  }

  const agents = requireArray(value.agents, `${source}.agents`).map((agent, index) =>
    normalizeAgent(agent, `${source}.agents[${index}]`)
  );
  const toolCatalogs = optionalArray(value.toolCatalogs, `${source}.toolCatalogs`).map((catalog, index) =>
    normalizeToolCatalog(catalog, `${source}.toolCatalogs[${index}]`)
  );

  return {
    agents: agents.sort((left, right) => left.id.localeCompare(right.id)),
    toolCatalogs: toolCatalogs.sort((left, right) => left.id.localeCompare(right.id))
  };
}

export function resolveFromConfig(configPath: string, candidate: string): string {
  if (candidate === '-') {
    return candidate;
  }

  return path.resolve(path.dirname(configPath), candidate);
}

function normalizeAgent(value: unknown, label: string): AgentConfig {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const id = requireString(value.id, `${label}.id`);
  const command = requireString(value.command, `${label}.command`);

  return {
    id,
    command,
    version: optionalProbe(value.version, `${label}.version`),
    help: optionalProbe(value.help, `${label}.help`),
    smoke: optionalProbe(value.smoke, `${label}.smoke`),
    requiredEnv: optionalStringArray(value.requiredEnv, `${label}.requiredEnv`).sort(),
    permissionFlags: optionalStringArray(value.permissionFlags, `${label}.permissionFlags`).sort()
  };
}

function normalizeToolCatalog(value: unknown, label: string): ToolCatalogConfig {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    id: requireString(value.id, `${label}.id`),
    path: requireString(value.path, `${label}.path`)
  };
}

function optionalProbe(value: unknown, label: string): ProbeConfig | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    args: requireStringArray(value.args, `${label}.args`),
    timeoutMs: optionalPositiveInteger(value.timeoutMs, `${label}.timeoutMs`) ?? 5000
  };
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array.`);
  }

  return value;
}

function optionalArray(value: unknown, label: string): unknown[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array when provided.`);
  }

  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${label} must be a non-empty array of strings.`);
  }

  return [...value];
}

function optionalStringArray(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${label} must be an array of strings when provided.`);
  }

  return [...value];
}

function optionalPositiveInteger(value: unknown, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return Number(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
