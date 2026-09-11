import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repoRoot, 'scripts', 'check-ci-runtime.mjs');

function runCheck(packagePath: string, workflowsDir: string, readmePath: string): string {
  return execFileSync(process.execPath, [script, packagePath, workflowsDir, readmePath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function writeFixture(
  directory: string,
  { matrix, pinned, engine = '>=20', pinLine = 'node-version: 24' }: {
    matrix: string;
    pinned: string;
    engine?: string;
    pinLine?: string;
  },
) {
  mkdirSync(join(directory, 'workflows'), { recursive: true });
  writeFileSync(
    join(directory, 'package.json'),
    JSON.stringify({ engines: { node: engine } }, null, 2),
  );
  writeFileSync(
    join(directory, 'workflows', 'ci.yml'),
    [
      'jobs:',
      '  verify:',
      '    strategy:',
      '      matrix:',
      `        node: [${matrix}]`,
      '    steps:',
      '      - uses: actions/setup-node@v5',
      '        with:',
      '          node-version: ${{ matrix.node }}',
    ].join('\n'),
  );
  writeFileSync(
    join(directory, 'workflows', 'release.yml'),
    [
      'jobs:',
      '  release:',
      '    steps:',
      '      - uses: actions/setup-node@v5',
      '        with:',
      `          ${pinLine}`,
    ].join('\n'),
  );
  writeFileSync(
    join(directory, 'README.md'),
    `<!-- ci-runtimes: matrix=${matrix}; pinned=${pinned} -->\n`,
  );
  return {
    packagePath: join(directory, 'package.json'),
    workflowsDir: join(directory, 'workflows'),
    readmePath: join(directory, 'README.md'),
  };
}

function assertFails(packagePath: string, workflowsDir: string, readmePath: string, expectedFragment: string): void {
  let failure: { stderr?: string; stdout?: string } | null = null;
  try {
    runCheck(packagePath, workflowsDir, readmePath);
  } catch (error) {
    failure = error as { stderr?: string; stdout?: string };
  }
  assert(failure, 'expected check:ci-runtime to fail');
  const message = String(failure.stderr ?? '') + String(failure.stdout ?? '');
  assert.match(message, /AssertionError/);
  assert.match(message, new RegExp(expectedFragment));
}

describe('check:ci-runtime', () => {
  it('passes on the repository as committed', () => {
    const output = runCheck(
      join(repoRoot, 'package.json'),
      join(repoRoot, '.github', 'workflows'),
      join(repoRoot, 'README.md'),
    );
    assert.match(output, /CI runtime matrix covers Node /);
    assert.match(output, /workflows pin Node /);
  });

  it('fails when README documents a runtime missing from the CI matrix', () => {
    const directory = mkdtempSync(join('/tmp', 'ci-runtime-matrix-'));
    try {
      const paths = writeFixture(directory, { matrix: '20, 24', pinned: '24' });
      readFileSync(paths.readmePath); // keep the fixture honest before rewriting
      writeFileSync(
        paths.readmePath,
        '<!-- ci-runtimes: matrix=20, 24, 26; pinned=24 -->\n',
      );
      assertFails(
        paths.packagePath,
        paths.workflowsDir,
        paths.readmePath,
        'must exactly match the CI matrix',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails when a workflow pins a runtime README does not document', () => {
    const directory = mkdtempSync(join('/tmp', 'ci-runtime-pin-'));
    try {
      const paths = writeFixture(directory, { matrix: '20, 24', pinned: '20, 24', pinLine: 'node-version: 22' });
      assertFails(
        paths.packagePath,
        paths.workflowsDir,
        paths.readmePath,
        'pins Node 22',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails when the CI matrix drops the engines.node floor', () => {
    const directory = mkdtempSync(join('/tmp', 'ci-runtime-floor-'));
    try {
      const paths = writeFixture(directory, { matrix: '24', pinned: '24' });
      assertFails(
        paths.packagePath,
        paths.workflowsDir,
        paths.readmePath,
        'must include engines.node floor 20',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
