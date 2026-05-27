import { spawn } from 'node:child_process';
import { delimiter, isAbsolute } from 'node:path';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import type { ProbeConfig, ProbeResult } from './types.js';

const SAFE_ARGS = new Set(['--version', '-v', '--help', '-h']);

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
      env: process.env
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        args: probe.args,
        exitCode: null,
        signal: null,
        stdout: '',
        stderr: error.message,
        timedOut
      });
    });
    child.on('close', (exitCode, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
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
  for (const arg of probe.args) {
    if (!SAFE_ARGS.has(arg)) {
      throw new Error(`Unsafe probe arg "${arg}". agentabi only runs --version/-v/--help/-h probes.`);
    }
  }
}

function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}
