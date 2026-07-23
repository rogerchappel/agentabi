import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runProbe } from '../probe.js';

const POSIX_ONLY = { skip: process.platform === 'win32' };

test('runProbe preserves successful probe output', async () => {
  const result = await runProbe(process.execPath, { args: ['--version'], timeoutMs: 2_000 });

  assert.equal(result.exitCode, 0);
  assert.equal(result.signal, null);
  assert.match(result.stdout, /^v\d+\./);
  assert.equal(result.stderr, '');
  assert.equal(result.timedOut, false);
});

test('runProbe reports spawn failures without waiting for the deadline', async () => {
  const startedAt = Date.now();
  const result = await runProbe(join(tmpdir(), 'agentabi-command-that-does-not-exist'), {
    args: ['--help'],
    timeoutMs: 2_000
  });

  assert.equal(result.exitCode, null);
  assert.equal(result.signal, null);
  assert.match(result.stderr, /ENOENT/);
  assert.equal(result.timedOut, false);
  assert.ok(Date.now() - startedAt < 1_000);
});

test('runProbe terminates descendants without waiting for inherited pipes', POSIX_ONLY, async (t) => {
  const fixture = await createProbeFixture(false);
  t.after(fixture.cleanup);

  const startedAt = Date.now();
  const result = await runProbe(fixture.command, { args: ['--help'], timeoutMs: 500 });

  assert.equal(result.timedOut, true);
  assert.equal(result.signal, 'SIGTERM');
  assert.ok(Date.now() - startedAt < 1_200, 'probe should respect its timeout and termination grace');
  await assertProcessGone(await fixture.descendantPid());
});

test('runProbe escalates SIGTERM-resistant process trees without leaking children', POSIX_ONLY, async (t) => {
  const fixture = await createProbeFixture(true);
  t.after(fixture.cleanup);

  const startedAt = Date.now();
  const result = await runProbe(fixture.command, { args: ['--help'], timeoutMs: 500 });

  assert.equal(result.timedOut, true);
  assert.equal(result.signal, 'SIGKILL');
  assert.ok(Date.now() - startedAt < 1_200, 'probe should bound resistant-process cleanup');
  await assertProcessGone(await fixture.descendantPid());
});

async function createProbeFixture(resistSigterm: boolean): Promise<{
  command: string;
  cleanup: () => Promise<void>;
  descendantPid: () => Promise<number>;
}> {
  const directory = await mkdtemp(join(tmpdir(), 'agentabi-probe-'));
  const command = join(directory, 'probe.mjs');
  const pidFile = join(directory, 'descendant.pid');
  const signalHandler = resistSigterm ? "process.on('SIGTERM', () => {});" : '';
  const descendantSource = `${signalHandler} setTimeout(() => process.exit(0), 4000);`;
  const fixtureSource = `#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
${signalHandler}
const descendant = spawn(process.execPath, ['-e', ${JSON.stringify(descendantSource)}], {
  stdio: ['ignore', 'inherit', 'inherit']
});
writeFileSync(${JSON.stringify(pidFile)}, String(descendant.pid));
setTimeout(() => process.exit(0), 4000);
`;

  await writeFile(command, fixtureSource);
  await chmod(command, 0o755);

  return {
    command,
    cleanup: () => rm(directory, { recursive: true, force: true }),
    descendantPid: async () => Number(await readFile(pidFile, 'utf8'))
  };
}

async function assertProcessGone(pid: number): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        return;
      }
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  assert.fail(`descendant process ${pid} is still running`);
}
