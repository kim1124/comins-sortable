import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('builds the Playground entry without replacing fixture output', () => {
  const fixtureResult = spawnSync('npm', ['run', 'example:build'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(fixtureResult.status, 0, fixtureResult.stderr);

  const result = spawnSync('npm', ['run', 'playground:build'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(join(root, '.playground-dist', 'index.html')), true);
  assert.equal(existsSync(join(root, '.example-dist', 'react', 'main.js')), true);
  assert.match(
    readFileSync(join(root, '.playground-dist', 'index.html'), 'utf8'),
    /id="root"/,
  );
});
