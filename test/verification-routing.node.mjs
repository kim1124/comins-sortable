import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function routes(path) {
  const workflow = readFileSync('.github/workflows/verify.yml', 'utf8');
  const start = workflow.indexOf('          package=false');
  const end = workflow.indexOf(' >> "$GITHUB_OUTPUT"', start);
  assert.ok(start >= 0 && end > start);
  const shell = workflow.slice(start, end).replace('done < <(git diff --name-only "$base_sha" "$head_sha")', 'done');
  const result = spawnSync('bash', ['-c', shell], { input: `${path}\n`, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return Object.fromEntries(result.stdout.trim().split('\n').map((line) => line.split('=')));
}
for (const path of ['package-lock.json', 'package.json', 'scripts/benchmark-sortable.mjs', 'test/performance/fixture.ts', 'src/vanilla/create-sortable.ts', 'test/playground/memory-retention.spec.ts', 'test/playground/helpers/retention-fixture.ts', 'test/playground/helpers/heap-snapshot.ts']) {
  test(`${path} selects package, browser and performance verification`, () => {
    assert.deepEqual(routes(path), { package: 'true', browser: 'true', performance: 'true' });
  });
}
test('documentation-only changes retain narrow validation', () => {
  assert.deepEqual(routes('docs/user/05-vue.md'), { package: 'false', browser: 'false', performance: 'false' });
});

test('performance evidence preserves memory snapshots and benchmark output on failure', () => {
  const workflow = readFileSync('.github/workflows/verify.yml', 'utf8');
  const performance = workflow.slice(workflow.indexOf('\n  performance:\n'));
  assert.match(performance, /name: Preserve performance evidence\s+if: always\(\)/);
  assert.match(performance, /test-results\/benchmark-sortable\.json/);
  assert.match(performance, /playwright-report\/memory-retention\//);
});
