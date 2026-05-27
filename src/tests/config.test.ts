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
