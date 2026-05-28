import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { ToolCatalogSnapshot, ToolSchemaSummary } from './types.js';
import { sortValue } from './stable-json.js';

export async function readToolCatalog(id: string, source: string, stdin?: string): Promise<ToolCatalogSnapshot> {
  const raw = source === '-' ? stdin ?? await readAllStdin() : await readFile(source, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return {
    id,
    source,
    tools: normalizeTools(parsed)
  };
}

export function normalizeTools(value: unknown): ToolSchemaSummary[] {
  const tools = extractToolArray(value);
  const normalized = tools
    .map((tool, index) => normalizeTool(tool, index))
    .sort((left, right) => left.name.localeCompare(right.name));
  assertUniqueToolNames(normalized);
  return normalized;
}

function extractToolArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value) && Array.isArray(value.tools)) {
    return value.tools;
  }

  if (isRecord(value) && isRecord(value.result) && Array.isArray(value.result.tools)) {
    return value.result.tools;
  }

  throw new Error('Tool catalog must be a JSON array, {"tools": [...]}, or MCP list_tools result.');
}

function normalizeTool(value: unknown, index: number): ToolSchemaSummary {
  if (!isRecord(value)) {
    throw new Error(`Tool at index ${index} must be an object.`);
  }

  const name = typeof value.name === 'string' ? value.name : undefined;
  if (!name) {
    throw new Error(`Tool at index ${index} is missing string field "name".`);
  }

  const summary: ToolSchemaSummary = { name };
  if (typeof value.description === 'string' && value.description.trim()) {
    summary.description = value.description;
  }

  const inputSchema = value.inputSchema ?? value.input_schema;
  if (inputSchema !== undefined) {
    summary.inputSchemaHash = hashJson(inputSchema);
  }

  return summary;
}

function hashJson(value: unknown): string {
  const canonical = JSON.stringify(sortValue(value));
  return createHash('sha256').update(canonical).digest('hex');
}

async function readAllStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertUniqueToolNames(tools: ToolSchemaSummary[]): void {
  const seen = new Set<string>();
  for (const tool of tools) {
    if (seen.has(tool.name)) {
      throw new Error(`Tool catalog contains duplicate tool name "${tool.name}".`);
    }
    seen.add(tool.name);
  }
}
