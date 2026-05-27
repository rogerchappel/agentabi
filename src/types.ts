export type AgentAbiConfig = {
  agents: AgentConfig[];
  toolCatalogs?: ToolCatalogConfig[];
};

export type AgentConfig = {
  id: string;
  command: string;
  version?: ProbeConfig;
  help?: ProbeConfig;
  smoke?: ProbeConfig;
  requiredEnv?: string[];
  permissionFlags?: string[];
};

export type ProbeConfig = {
  args: string[];
  timeoutMs?: number;
};

export type ToolCatalogConfig = {
  id: string;
  path: string;
};

export type Snapshot = {
  schemaVersion: 1;
  agents: AgentSnapshot[];
  toolCatalogs: ToolCatalogSnapshot[];
};

export type AgentSnapshot = {
  id: string;
  command: string;
  resolvedPath: string | null;
  probes: Record<string, ProbeResult>;
  requiredEnv: Record<string, boolean>;
  permissionFlags: string[];
};

export type ProbeResult = {
  args: string[];
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type ToolCatalogSnapshot = {
  id: string;
  source: string;
  tools: ToolSchemaSummary[];
};

export type ToolSchemaSummary = {
  name: string;
  description?: string;
  inputSchemaHash?: string;
};

export type FindingSeverity = 'breaking' | 'warning' | 'info';

export type DiffFinding = {
  severity: FindingSeverity;
  code: string;
  path: string;
  message: string;
  before?: unknown;
  after?: unknown;
};

export type DiffReport = {
  ok: boolean;
  summary: Record<FindingSeverity, number>;
  findings: DiffFinding[];
};
