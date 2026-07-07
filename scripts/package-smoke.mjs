import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['pack', '--dry-run'], { encoding: 'utf8' });
const output = `${result.stdout || ''}\n${result.stderr || ''}`;

if (result.status !== 0) {
  process.stderr.write(output);
  process.exit(result.status || 1);
}

const required = [
  'dist/cli.js',
  'dist/index.js',
  'dist/config.js',
  'dist/tools.js',
  'dist/index.d.ts',
  'examples/agentabi.yaml',
  'examples/tools.json',
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md'
];

const missing = required.filter((entry) => !output.includes(entry));

if (missing.length > 0) {
  console.error(`package smoke missing entries:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log('package smoke passed');
