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

test('normalizeConfig rejects duplicate IDs with source-qualified entry locations', () => {
  assert.throws(
    () => normalizeConfig({ agents: [{ id: 'same', command: 'node' }, { id: 'same', command: 'other' }] }, 'agentabi.yml'),
    /agentabi\.yml\.agents has duplicate id "same" at entries \[0\] and \[1\]/
  );
  assert.throws(
    () => normalizeConfig({
      agents: [{ id: 'agent', command: 'node' }],
      toolCatalogs: [{ id: 'same', path: 'a.json' }, { id: 'same', path: 'b.json' }]
    }, 'agentabi.yml'),
    /agentabi\.yml\.toolCatalogs has duplicate id "same" at entries \[0\] and \[1\]/
  );
});

test('normalizeConfig rejects configured probes without args', () => {
  for (const probe of ['version', 'help', 'smoke']) {
    for (const configuredProbe of [{}, { args: [] }]) {
      assert.throws(
        () => normalizeConfig({
          agents: [{ id: 'agent', command: 'node', [probe]: configuredProbe }]
        }, 'agentabi.yml'),
        new RegExp(`agentabi\\.yml\\.agents\\[0\\]\\.${probe}\\.args must be a non-empty array`)
      );
    }
  }
});

test('normalizeConfig accepts explicit safe probe args', () => {
  const config = normalizeConfig({
    agents: [{
      id: 'agent',
      command: 'node',
      version: { args: ['-v'] },
      help: { args: ['-h'] },
      smoke: { args: ['--version', '--help'] }
    }]
  });

  assert.deepEqual(config.agents[0]?.version?.args, ['-v']);
  assert.deepEqual(config.agents[0]?.help?.args, ['-h']);
  assert.deepEqual(config.agents[0]?.smoke?.args, ['--version', '--help']);
});
