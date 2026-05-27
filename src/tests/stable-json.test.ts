import assert from 'node:assert/strict';
import test from 'node:test';
import { stableStringify } from '../stable-json.js';

test('stableStringify sorts object keys recursively', () => {
  assert.equal(stableStringify({ z: 1, a: { y: 2, b: 3 } }), '{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "z": 1\n}\n');
});
