import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('diff CLI identifies the malformed snapshot file and field', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'agentabi-invalid-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const baseline = join(directory, 'baseline.json');
  const current = join(directory, 'current.json');
  await writeFile(baseline, JSON.stringify({ schemaVersion: 1, agents: [] }));
  await writeFile(current, JSON.stringify({ schemaVersion: 1, agents: [], toolCatalogs: [] }));

  const result = spawnSync(process.execPath, ['dist/cli.js', 'diff', baseline, current, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, new RegExp(`${escapeRegExp(baseline)}\\.toolCatalogs must be an array`));
  assert.doesNotMatch(result.stderr, /TypeError|Cannot read properties/);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
