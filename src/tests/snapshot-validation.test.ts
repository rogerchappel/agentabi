import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSnapshot } from '../snapshot-validation.js';

const validSnapshot = {
  schemaVersion: 1,
  agents: [{
    id: 'codex',
    command: 'codex',
    resolvedPath: null,
    probes: {
      version: { args: ['--version'], exitCode: 0, signal: null, stdout: '1.0', stderr: '', timedOut: false }
    },
    requiredEnv: { OPENAI_API_KEY: true },
    permissionFlags: ['--sandbox']
  }],
  toolCatalogs: [{
    id: 'mcp',
    source: 'tools.json',
    tools: [{ name: 'read', description: 'Read a file', inputSchemaHash: 'abc' }]
  }]
};

test('validateSnapshot accepts a complete snapshot', () => {
  assert.deepEqual(validateSnapshot(validSnapshot, 'baseline.json'), validSnapshot);
});

test('validateSnapshot reports missing and wrong-typed top-level fields', () => {
  assert.throws(
    () => validateSnapshot({ schemaVersion: 1, agents: [] }, 'baseline.json'),
    /baseline\.json\.toolCatalogs must be an array/
  );
  assert.throws(
    () => validateSnapshot({ ...validSnapshot, schemaVersion: '1' }, 'current.json'),
    /current\.json\.schemaVersion must be 1/
  );
  assert.throws(
    () => validateSnapshot({ ...validSnapshot, agents: {} }, 'current.json'),
    /current\.json\.agents must be an array/
  );
});

test('validateSnapshot reports representative malformed nested fields', () => {
  assert.throws(
    () => validateSnapshot({ ...validSnapshot, agents: [{ ...validSnapshot.agents[0], probes: [] }] }, 'baseline.json'),
    /baseline\.json\.agents\[0\]\.probes must be an object/
  );
  assert.throws(
    () => validateSnapshot({ ...validSnapshot, agents: [{ ...validSnapshot.agents[0], requiredEnv: { TOKEN: 'yes' } }] }, 'baseline.json'),
    /baseline\.json\.agents\[0\]\.requiredEnv\.TOKEN must be a boolean/
  );
  assert.throws(
    () => validateSnapshot({ ...validSnapshot, toolCatalogs: [{ ...validSnapshot.toolCatalogs[0], tools: [{ name: 42 }] }] }, 'current.json'),
    /current\.json\.toolCatalogs\[0\]\.tools\[0\]\.name must be a string/
  );
});
