import assert from 'node:assert/strict';
import test from 'node:test';
import { diffSnapshots } from '../diff.js';
import type { Snapshot } from '../types.js';

const baseline: Snapshot = {
  schemaVersion: 1,
  agents: [
    {
      id: 'codex',
      command: 'codex',
      resolvedPath: '/usr/local/bin/codex',
      probes: {
        version: {
          args: ['--version'],
          exitCode: 0,
          signal: null,
          stdout: 'codex 1.0.0',
          stderr: '',
          timedOut: false
        }
      },
      requiredEnv: { OPENAI_API_KEY: true },
      permissionFlags: ['--sandbox']
    }
  ],
  toolCatalogs: [
    {
      id: 'mcp',
      source: 'tools.json',
      tools: [{ name: 'read', inputSchemaHash: 'aaa' }]
    }
  ]
};

test('diffSnapshots reports breaking ABI changes', () => {
  const current: Snapshot = {
    ...baseline,
    agents: [
      {
        ...baseline.agents[0]!,
        probes: {
          version: {
            ...baseline.agents[0]!.probes.version!,
            exitCode: 2
          }
        },
        requiredEnv: { OPENAI_API_KEY: false }
      }
    ],
    toolCatalogs: [
      {
        id: 'mcp',
        source: 'tools.json',
        tools: [{ name: 'read', inputSchemaHash: 'bbb' }]
      }
    ]
  };

  const report = diffSnapshots(baseline, current);

  assert.equal(report.ok, false);
  assert.equal(report.summary.breaking, 3);
  assert.deepEqual(
    report.findings.map((finding) => finding.code),
    ['agent.requiredEnv.changed', 'agent.probe.exitCode.changed', 'tool.inputSchema.changed']
  );
});

test('diffSnapshots treats additions as informational', () => {
  const current: Snapshot = {
    ...baseline,
    agents: [
      ...baseline.agents,
      {
        ...baseline.agents[0]!,
        id: 'gemini',
        command: 'gemini'
      }
    ]
  };

  const report = diffSnapshots(baseline, current);

  assert.equal(report.ok, true);
  assert.equal(report.summary.info, 1);
  assert.equal(report.findings[0]?.code, 'agent.added');
});
