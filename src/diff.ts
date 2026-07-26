import type { AgentSnapshot, DiffFinding, DiffReport, FindingSeverity, Snapshot, ToolCatalogSnapshot } from './types.js';

export function diffSnapshots(baseline: Snapshot, current: Snapshot): DiffReport {
  const findings: DiffFinding[] = [];
  validateSnapshotIdentity(baseline, 'baseline');
  validateSnapshotIdentity(current, 'current');

  if (baseline.schemaVersion !== current.schemaVersion) {
    findings.push({
      severity: 'breaking',
      code: 'schema.version.changed',
      path: 'schemaVersion',
      message: 'Snapshot schema version changed.',
      before: baseline.schemaVersion,
      after: current.schemaVersion
    });
  }

  compareAgents(indexById(baseline.agents), indexById(current.agents), findings);
  compareToolCatalogs(indexById(baseline.toolCatalogs), indexById(current.toolCatalogs), findings);

  const summary = summarize(findings);
  return {
    ok: summary.breaking === 0,
    summary,
    findings
  };
}

function validateSnapshotIdentity(snapshot: Snapshot, label: string): void {
  assertUnique(snapshot.agents, 'id', `${label}.agents`);
  assertUnique(snapshot.toolCatalogs, 'id', `${label}.toolCatalogs`);
  snapshot.toolCatalogs.forEach((catalog, index) =>
    assertUnique(catalog.tools, 'name', `${label}.toolCatalogs[${index}].tools`)
  );
}

function assertUnique<T extends { id?: string; name?: string }>(
  items: T[],
  key: 'id' | 'name',
  label: string
): void {
  const firstIndex = new Map<string, number>();
  items.forEach((item, index) => {
    const identity = item[key] ?? '';
    const first = firstIndex.get(identity);
    if (first !== undefined) {
      throw new Error(`${label} has duplicate ${key} "${identity}" at entries [${first}] and [${index}].`);
    }
    firstIndex.set(identity, index);
  });
}

function compareAgents(
  baselineAgents: Map<string, AgentSnapshot>,
  currentAgents: Map<string, AgentSnapshot>,
  findings: DiffFinding[]
): void {
  for (const [id, before] of baselineAgents) {
    const after = currentAgents.get(id);
    if (!after) {
      findings.push({
        severity: 'breaking',
        code: 'agent.removed',
        path: `agents.${id}`,
        message: `Agent "${id}" was removed.`,
        before,
        after: undefined
      });
      continue;
    }

    compareScalar(findings, `agents.${id}.command`, 'warning', 'agent.command.changed', before.command, after.command);
    compareScalar(
      findings,
      `agents.${id}.resolvedPath`,
      'warning',
      'agent.resolvedPath.changed',
      before.resolvedPath,
      after.resolvedPath
    );
    compareStringArray(
      findings,
      `agents.${id}.permissionFlags`,
      'breaking',
      'agent.permissionFlags.changed',
      before.permissionFlags,
      after.permissionFlags
    );
    compareEnv(findings, id, before.requiredEnv, after.requiredEnv);
    compareProbes(findings, id, before.probes, after.probes);
  }

  for (const [id, after] of currentAgents) {
    if (!baselineAgents.has(id)) {
      findings.push({
        severity: 'info',
        code: 'agent.added',
        path: `agents.${id}`,
        message: `Agent "${id}" was added.`,
        before: undefined,
        after
      });
    }
  }
}

function compareToolCatalogs(
  baselineCatalogs: Map<string, ToolCatalogSnapshot>,
  currentCatalogs: Map<string, ToolCatalogSnapshot>,
  findings: DiffFinding[]
): void {
  for (const [id, before] of baselineCatalogs) {
    const after = currentCatalogs.get(id);
    if (!after) {
      findings.push({
        severity: 'breaking',
        code: 'toolCatalog.removed',
        path: `toolCatalogs.${id}`,
        message: `Tool catalog "${id}" was removed.`,
        before,
        after: undefined
      });
      continue;
    }

    compareScalar(
      findings,
      `toolCatalogs.${id}.source`,
      'info',
      'toolCatalog.source.changed',
      before.source,
      after.source
    );

    const beforeTools = indexById(before.tools);
    const afterTools = indexById(after.tools);

    for (const [toolName, beforeTool] of beforeTools) {
      const afterTool = afterTools.get(toolName);
      if (!afterTool) {
        findings.push({
          severity: 'breaking',
          code: 'tool.removed',
          path: `toolCatalogs.${id}.tools.${toolName}`,
          message: `Tool "${toolName}" was removed from catalog "${id}".`,
          before: beforeTool,
          after: undefined
        });
        continue;
      }

      compareScalar(
        findings,
        `toolCatalogs.${id}.tools.${toolName}.inputSchemaHash`,
        'breaking',
        'tool.inputSchema.changed',
        beforeTool.inputSchemaHash,
        afterTool.inputSchemaHash
      );
      compareScalar(
        findings,
        `toolCatalogs.${id}.tools.${toolName}.description`,
        'info',
        'tool.description.changed',
        beforeTool.description,
        afterTool.description
      );
    }

    for (const [toolName, afterTool] of afterTools) {
      if (!beforeTools.has(toolName)) {
        findings.push({
          severity: 'info',
          code: 'tool.added',
          path: `toolCatalogs.${id}.tools.${toolName}`,
          message: `Tool "${toolName}" was added to catalog "${id}".`,
          before: undefined,
          after: afterTool
        });
      }
    }
  }

  for (const [id, after] of currentCatalogs) {
    if (!baselineCatalogs.has(id)) {
      findings.push({
        severity: 'info',
        code: 'toolCatalog.added',
        path: `toolCatalogs.${id}`,
        message: `Tool catalog "${id}" was added.`,
        before: undefined,
        after
      });
    }
  }
}

function compareEnv(
  findings: DiffFinding[],
  agentId: string,
  before: Record<string, boolean>,
  after: Record<string, boolean>
): void {
  for (const name of new Set([...Object.keys(before), ...Object.keys(after)].sort())) {
    if (before[name] !== after[name]) {
      findings.push({
        severity: 'breaking',
        code: 'agent.requiredEnv.changed',
        path: `agents.${agentId}.requiredEnv.${name}`,
        message: `Required environment variable "${name}" presence changed for agent "${agentId}".`,
        before: before[name],
        after: after[name]
      });
    }
  }
}

function compareProbes(
  findings: DiffFinding[],
  agentId: string,
  before: AgentSnapshot['probes'],
  after: AgentSnapshot['probes']
): void {
  for (const name of new Set([...Object.keys(before), ...Object.keys(after)].sort())) {
    const beforeProbe = before[name];
    const afterProbe = after[name];
    if (!beforeProbe || !afterProbe) {
      findings.push({
        severity: 'warning',
        code: 'agent.probe.changed',
        path: `agents.${agentId}.probes.${name}`,
        message: `Probe "${name}" changed for agent "${agentId}".`,
        before: beforeProbe,
        after: afterProbe
      });
      continue;
    }

    compareStringArray(
      findings,
      `agents.${agentId}.probes.${name}.args`,
      'breaking',
      'agent.probe.args.changed',
      beforeProbe.args,
      afterProbe.args
    );
    compareScalar(
      findings,
      `agents.${agentId}.probes.${name}.exitCode`,
      'breaking',
      'agent.probe.exitCode.changed',
      beforeProbe.exitCode,
      afterProbe.exitCode
    );
    compareScalar(
      findings,
      `agents.${agentId}.probes.${name}.signal`,
      'breaking',
      'agent.probe.signal.changed',
      beforeProbe.signal,
      afterProbe.signal
    );
    compareScalar(
      findings,
      `agents.${agentId}.probes.${name}.timedOut`,
      'breaking',
      'agent.probe.timeout.changed',
      beforeProbe.timedOut,
      afterProbe.timedOut
    );
    compareScalar(
      findings,
      `agents.${agentId}.probes.${name}.stdout`,
      'warning',
      'agent.probe.stdout.changed',
      beforeProbe.stdout,
      afterProbe.stdout
    );
    compareScalar(
      findings,
      `agents.${agentId}.probes.${name}.stderr`,
      'warning',
      'agent.probe.stderr.changed',
      beforeProbe.stderr,
      afterProbe.stderr
    );
  }
}

function compareScalar(
  findings: DiffFinding[],
  path: string,
  severity: FindingSeverity,
  code: string,
  before: unknown,
  after: unknown
): void {
  if (before !== after) {
    findings.push({
      severity,
      code,
      path,
      message: `${path} changed.`,
      before,
      after
    });
  }
}

function compareStringArray(
  findings: DiffFinding[],
  path: string,
  severity: FindingSeverity,
  code: string,
  before: string[],
  after: string[]
): void {
  if (before.join('\n') !== after.join('\n')) {
    findings.push({
      severity,
      code,
      path,
      message: `${path} changed.`,
      before,
      after
    });
  }
}

function summarize(findings: DiffFinding[]): Record<FindingSeverity, number> {
  return findings.reduce<Record<FindingSeverity, number>>(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { breaking: 0, warning: 0, info: 0 }
  );
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T>;
function indexById<T extends { name: string }>(items: T[]): Map<string, T>;
function indexById<T extends { id?: string; name?: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id ?? item.name ?? '', item]));
}
