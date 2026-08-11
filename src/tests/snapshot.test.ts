import assert from 'node:assert/strict';
import test from 'node:test';
import { captureSnapshot } from '../snapshot.js';

test('captureSnapshot uses default version and help probes when they are omitted', async () => {
  const snapshot = await captureSnapshot({
    agents: [{ id: 'node', command: process.execPath }]
  }, { configPath: 'agentabi.yml' });

  assert.deepEqual(snapshot.agents[0]?.probes.version?.args, ['--version']);
  assert.deepEqual(snapshot.agents[0]?.probes.help?.args, ['--help']);
  assert.equal(snapshot.agents[0]?.probes.version?.exitCode, 0);
  assert.equal(snapshot.agents[0]?.probes.help?.exitCode, 0);
});

test('captureSnapshot runs valid explicit probes', async () => {
  const snapshot = await captureSnapshot({
    agents: [{
      id: 'node',
      command: process.execPath,
      version: { args: ['-v'] },
      help: { args: ['-h'] }
    }]
  }, { configPath: 'agentabi.yml' });

  assert.deepEqual(snapshot.agents[0]?.probes.version?.args, ['-v']);
  assert.deepEqual(snapshot.agents[0]?.probes.help?.args, ['-h']);
  assert.equal(snapshot.agents[0]?.probes.version?.exitCode, 0);
  assert.equal(snapshot.agents[0]?.probes.help?.exitCode, 0);
});
