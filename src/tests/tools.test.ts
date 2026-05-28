import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTools } from '../tools.js';

test('normalizeTools accepts MCP list_tools results and hashes input schemas', () => {
  const tools = normalizeTools({
    result: {
      tools: [
        {
          name: 'write',
          description: 'Write a file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' }
            }
          }
        }
      ]
    }
  });

  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, 'write');
  assert.equal(tools[0]?.description, 'Write a file');
  assert.match(tools[0]?.inputSchemaHash ?? '', /^[a-f0-9]{64}$/);
});

test('normalizeTools rejects duplicate tool names', () => {
  assert.throws(
    () =>
      normalizeTools([
        { name: 'read', inputSchema: { type: 'object' } },
        { name: 'read', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } }
      ]),
    /duplicate tool name "read"/
  );
});
