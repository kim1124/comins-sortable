import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('builds the Svelte browser fixture with injected component CSS', () => {
  const result = spawnSync(process.execPath, ['scripts/build-browser-fixtures.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const svelteEntry = join(root, '.example-dist', 'svelte', 'main.js');
  assert.equal(existsSync(svelteEntry), true);
  const code = readFileSync(svelteEntry, 'utf8');
  assert.match(code, /append_styles/);
  assert.match(code, /\.svelte-fixture-probe/);
});
