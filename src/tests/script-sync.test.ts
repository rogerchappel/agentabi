import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('README command sync', () => {
  it('README commands should match package.json scripts', () => {
    const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
    const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');
    
    // Check that npm run commands in README actually exist in scripts
    const npmRunRegex = /npm run ([a-zA-Z0-9:_-]+)/g;
    let match;
    const missingScripts = [];
    while ((match = npmRunRegex.exec(readme)) !== null) {
      const script = match[1];
      if (!pkg.scripts[script]) {
        missingScripts.push(script);
      }
    }
    assert.deepStrictEqual(missingScripts, [], 
      'README references scripts not in package.json: ' + missingScripts.join(', '));
  });
});
