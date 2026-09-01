#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { diffSnapshots } from './diff.js';
import { captureSnapshot } from './snapshot.js';
import { validateSnapshot } from './snapshot-validation.js';
import { stableStringify } from './stable-json.js';
import type { DiffReport, Snapshot } from './types.js';

const DEFAULT_CONFIG = 'agentabi.yaml';
const DEFAULT_LOCK = 'agentabi.lock.json';

const program = new Command()
  .name('agentabi')
  .description('Snapshot and check terminal coding-agent operational ABIs.')
  .version('0.1.0');

program
  .command('init')
  .description('Write a starter agentabi.yaml config.')
  .option('-o, --output <path>', 'config path to write', DEFAULT_CONFIG)
  .action(async (options: { output: string }) => {
    await writeFile(options.output, starterConfig(), { flag: 'wx' });
    process.stdout.write(`Wrote ${options.output}\n`);
  });

program
  .command('capture')
  .description('Capture a deterministic snapshot from a config file.')
  .option('-c, --config <path>', 'config path', DEFAULT_CONFIG)
  .option('-o, --output <path>', 'snapshot output path, or "-" for stdout', DEFAULT_LOCK)
  .action(async (options: { config: string; output: string }) => {
    const snapshot = await captureFromConfig(options.config);
    await writeJson(options.output, snapshot);
  });

program
  .command('diff')
  .description('Compare two snapshot JSON files.')
  .argument('<baseline>', 'baseline snapshot path')
  .argument('<current>', 'current snapshot path')
  .option('--json', 'print full JSON report')
  .action(async (baselinePath: string, currentPath: string, options: { json?: boolean }) => {
    const report = diffSnapshots(await readSnapshot(baselinePath), await readSnapshot(currentPath));
    printReport(report, Boolean(options.json));
    process.exitCode = report.ok ? 0 : 1;
  });

program
  .command('check')
  .description('Capture a current snapshot and compare it with a lockfile.')
  .option('-c, --config <path>', 'config path', DEFAULT_CONFIG)
  .option('-l, --lock <path>', 'lockfile path', DEFAULT_LOCK)
  .option('--json', 'print full JSON report')
  .action(async (options: { config: string; lock: string; json?: boolean }) => {
    const [baseline, current] = await Promise.all([readSnapshot(options.lock), captureFromConfig(options.config)]);
    const report = diffSnapshots(baseline, current);
    printReport(report, Boolean(options.json));
    process.exitCode = report.ok ? 0 : 1;
  });

program.parseAsync().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function captureFromConfig(configPath: string): Promise<Snapshot> {
  const config = await loadConfig(configPath);
  return await captureSnapshot(config, { configPath });
}

async function readSnapshot(filePath: string): Promise<Snapshot> {
  const contents = await readFile(filePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents) as unknown;
  } catch (error) {
    throw new Error(`${filePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return validateSnapshot(parsed, filePath);
}

async function writeJson(outputPath: string, value: unknown): Promise<void> {
  const json = stableStringify(value);
  if (outputPath === '-') {
    process.stdout.write(json);
    return;
  }

  await writeFile(outputPath, json);
}

function printReport(report: DiffReport, json: boolean): void {
  if (json) {
    process.stdout.write(stableStringify(report));
    return;
  }

  process.stdout.write(
    `breaking: ${report.summary.breaking}, warnings: ${report.summary.warning}, info: ${report.summary.info}\n`
  );
  for (const finding of report.findings) {
    process.stdout.write(`${finding.severity.toUpperCase()} ${finding.code} ${finding.path}: ${finding.message}\n`);
  }
}

function starterConfig(): string {
  return `agents:
  - id: codex
    command: codex
    version:
      args: ["--version"]
    help:
      args: ["--help"]
    requiredEnv:
      - OPENAI_API_KEY
    permissionFlags:
      - "--sandbox"
toolCatalogs: []
`;
}
