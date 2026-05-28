import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeConfig } from '../config.js';

test('normalizeConfig validates and sorts config entities', () => {
  const config = normalizeConfig({
    agents: [
      { id: 'zeta', command: 'node', requiredEnv: ['ZED', 'ALPHA'] },
      { id: 'alpha', command: 'node' }
    ],
    toolCatalogs: [
      { id: 'tools-b', path: 'b.json' },
      { id: 'tools-a', path: 'a.json' }
    ]
  });

  assert.deepEqual(
    config.agents.map((agent) => agent.id),
    ['alpha', 'zeta']
  );
  assert.deepEqual(config.agents[1]?.requiredEnv, ['ALPHA', 'ZED']);
  assert.deepEqual(
    config.toolCatalogs?.map((catalog) => catalog.id),
    ['tools-a', 'tools-b']
  );
});

test('normalizeConfig rejects explicitly empty probe args', () => {
  assert.throws(
    () =>
      normalizeConfig({
        agents: [{ id: 'codex', command: 'codex', version: { args: [] } }]
      }),
    /version\.args must be a non-empty array of strings/
  );
});

test('normalizeConfig rejects probe configs without args', () => {
  assert.throws(
    () =>
      normalizeConfig({
        agents: [{ id: 'codex', command: 'codex', help: { timeoutMs: 1000 } }]
      }),
    /help\.args must be a non-empty array of strings/
  );
});

test('normalizeConfig rejects duplicate agent ids', () => {
  assert.throws(
    () =>
      normalizeConfig({
        agents: [
          { id: 'codex', command: 'codex' },
          { id: 'codex', command: 'codex-next' }
        ]
      }),
    /agents contains duplicate id "codex"/
  );
});

test('normalizeConfig rejects duplicate tool catalog ids', () => {
  assert.throws(
    () =>
      normalizeConfig({
        agents: [{ id: 'codex', command: 'codex' }],
        toolCatalogs: [
          { id: 'mcp', path: 'tools.json' },
          { id: 'mcp', path: 'other-tools.json' }
        ]
      }),
    /toolCatalogs contains duplicate id "mcp"/
  );
});
