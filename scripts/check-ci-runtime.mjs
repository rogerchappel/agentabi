import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const [packageArg, workflowsArg, readmeArg] = process.argv.slice(2);
const packagePath = packageArg ? resolve(packageArg) : join(repoRoot, 'package.json');
const workflowsDir = workflowsArg ? resolve(workflowsArg) : join(repoRoot, '.github', 'workflows');
const readmePath = readmeArg ? resolve(readmeArg) : join(repoRoot, 'README.md');

const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const readme = readFileSync(readmePath, 'utf8');
const workflowFiles = readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name));
assert(workflowFiles.includes('ci.yml'), 'workflows directory must contain ci.yml');
const workflows = workflowFiles.map((name) => ({ name, text: readFileSync(join(workflowsDir, name), 'utf8') }));
const ciWorkflow = workflows.find((workflow) => workflow.name === 'ci.yml').text;

const floorMatch = /^>=(\d+)$/.exec(packageJson.engines?.node ?? '');
assert(floorMatch, 'package.json engines.node must be a simple >= major version');
const supportedFloor = Number.parseInt(floorMatch[1], 10);

const matrixMatch = ciWorkflow.match(/node:\s*\[([^\]]+)\]/);
assert(matrixMatch, 'CI must define a node version matrix');
const testedMajors = matrixMatch[1].split(',').map((version) => Number.parseInt(version.trim(), 10));
for (const major of testedMajors) {
  assert(
    major >= supportedFloor,
    `CI Node matrix runtime ${major} is below engines.node floor ${supportedFloor}`,
  );
}
assert(
  testedMajors.includes(supportedFloor),
  `CI Node matrix ${JSON.stringify(testedMajors)} must include engines.node floor ${supportedFloor}`,
);
assert(
  ciWorkflow.includes('node-version: ${{ matrix.node }}'),
  'CI verify job must install each Node version from the matrix',
);

const anchorMatch = readme.match(/<!--\s*ci-runtimes:\s*matrix=([0-9,\s]+);\s*pinned=([0-9,\s]+)\s*-->/);
assert(
  anchorMatch,
  'README must document runtimes with a ci-runtimes anchor comment (matrix=..., pinned=...)',
);
const documentedMatrix = anchorMatch[1].split(',').map((version) => Number.parseInt(version.trim(), 10));
const documentedPinned = anchorMatch[2].split(',').map((version) => Number.parseInt(version.trim(), 10));

assert.deepStrictEqual(
  [...documentedMatrix].sort((a, b) => a - b),
  [...testedMajors].sort((a, b) => a - b),
  `README-documented matrix runtimes ${JSON.stringify(documentedMatrix)} must exactly match the CI matrix ${JSON.stringify(testedMajors)}`,
);

const pinnedUsages = [];
for (const workflow of workflows) {
  for (const match of workflow.text.matchAll(/node-version:\s*(\d+)/g)) {
    pinnedUsages.push({ workflow: workflow.name, major: Number.parseInt(match[1], 10) });
  }
}
assert(pinnedUsages.length > 0, 'at least one workflow must pin a numeric node-version');
for (const usage of pinnedUsages) {
  assert(
    documentedPinned.includes(usage.major),
    `${usage.workflow} pins Node ${usage.major}, which README documents as pinned runtimes ${JSON.stringify(documentedPinned)}`,
  );
}
const usedPinnedMajors = new Set(pinnedUsages.map((usage) => usage.major));
for (const major of documentedPinned) {
  assert(
    usedPinnedMajors.has(major),
    `README documents Node ${major} as pinned but no workflow pins node-version: ${major}`,
  );
}

console.log(
  `CI runtime matrix covers Node ${testedMajors.join(', ')} (supported floor: ${supportedFloor}); ` +
  `workflows pin Node ${[...usedPinnedMajors].sort((a, b) => a - b).join(', ')}.`,
);
