import { spawn } from 'node:child_process';
import { delimiter, isAbsolute } from 'node:path';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import type { ProbeConfig, ProbeResult } from './types.js';

const SAFE_ARGS = new Set(['--version', '-v', '--help', '-h']);
const TERMINATION_GRACE_MS = 250;

export async function resolveCommand(command: string, env = process.env): Promise<string | null> {
  if (command.includes('/') || isAbsolute(command)) {
    return await isExecutable(command) ? command : null;
  }

  for (const entry of (env.PATH ?? '').split(delimiter)) {
    if (!entry) {
      continue;
    }

    const candidate = `${entry}/${command}`;
    if (await isExecutable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function runProbe(command: string, probe: ProbeConfig): Promise<ProbeResult> {
  assertSafeProbe(probe);

  const timeoutMs = probe.timeoutMs ?? 5000;
  return await new Promise<ProbeResult>((resolve) => {
    const child = spawn(command, probe.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      detached: process.platform !== 'win32'
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let terminationTimer: NodeJS.Timeout | undefined;

    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') {
        terminateWindowsTree(child.pid);
      } else {
        terminatePosixTree(child.pid, 'SIGTERM');
      }

      terminationTimer = setTimeout(() => {
        const signal =
          process.platform === 'win32'
            ? 'SIGKILL'
            : terminatePosixTree(child.pid, 'SIGKILL')
              ? 'SIGKILL'
              : 'SIGTERM';
        child.stdout.destroy();
        child.stderr.destroy();
        finish({
          args: probe.args,
          exitCode: null,
          signal,
          stdout: normalizeOutput(stdout),
          stderr: normalizeOutput(stderr),
          timedOut: true
        });
      }, TERMINATION_GRACE_MS);
    }, timeoutMs);

    const finish = (result: ProbeResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (terminationTimer) {
        clearTimeout(terminationTimer);
      }
      resolve(result);
    };

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled || timedOut) {
        return;
      }
      finish({
        args: probe.args,
        exitCode: null,
        signal: null,
        stdout: '',
        stderr: error.message,
        timedOut
      });
    });
    child.on('close', (exitCode, signal) => {
      if (settled || timedOut) {
        return;
      }
      finish({
        args: probe.args,
        exitCode,
        signal,
        stdout: normalizeOutput(stdout),
        stderr: normalizeOutput(stderr),
        timedOut
      });
    });
  });
}

export function assertSafeProbe(probe: ProbeConfig): void {
  if (probe.args.length === 0) {
    throw new Error('Probe args must include --version, -v, --help, or -h.');
  }

  for (const arg of probe.args) {
    if (!SAFE_ARGS.has(arg)) {
      throw new Error(`Unsafe probe arg "${arg}". agentabi only runs --version/-v/--help/-h probes.`);
    }
  }
}

function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function terminatePosixTree(pid: number | undefined, signal: NodeJS.Signals): boolean {
  if (pid === undefined) {
    return false;
  }

  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
      return false;
    }
    try {
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  }
}

function terminateWindowsTree(pid: number | undefined): void {
  if (pid === undefined) {
    return;
  }

  const taskkill = spawn('taskkill.exe', ['/pid', String(pid), '/t', '/f'], {
    stdio: 'ignore',
    windowsHide: true
  });
  taskkill.on('error', () => {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // The process already exited.
    }
  });
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}
