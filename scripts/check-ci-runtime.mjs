import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

const floorMatch = /^>=(\d+)$/.exec(packageJson.engines?.node ?? '');
assert(floorMatch, 'package.json engines.node must be a simple >= major version');

const matrixMatch = workflow.match(/node:\s*\[([^\]]+)\]/);
assert(matrixMatch, 'CI must define a node version matrix');

const testedMajors = matrixMatch[1]
  .split(',')
  .map((version) => Number.parseInt(version.trim(), 10));
const supportedFloor = Number.parseInt(floorMatch[1], 10);

assert(
  testedMajors.includes(supportedFloor),
  `CI Node matrix ${JSON.stringify(testedMajors)} must include engines.node floor ${supportedFloor}`,
);
assert(
  workflow.includes('node-version: ${{ matrix.node }}'),
  'CI verify job must install each Node version from the matrix',
);

console.log(`CI runtime matrix covers Node ${testedMajors.join(', ')} (supported floor: ${supportedFloor}).`);
