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
for (const path of ['.github/workflows/verify.yml', 'package-lock.json', 'package.json', 'scripts/benchmark-sortable.mjs', 'test/performance/fixture.ts', 'src/vanilla/create-sortable.ts', 'test/playground/memory-retention.spec.ts', 'test/playground/helpers/retention-fixture.ts', 'test/playground/helpers/heap-snapshot.ts']) {
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

// 두 suite의 실행 시간을 분리해도 Browser 필수 검사는 둘의 성공을 요구한다.
test('browser suites have independent budgets and preserve the aggregate gate', () => {
  const workflow = readFileSync('.github/workflows/verify.yml', 'utf8');
  const suites = workflow.match(/\n  browser_suites:\n[\s\S]*?(?=\n  browser:\n)/)?.[0];
  const aggregate = workflow.match(/\n  browser:\n[\s\S]*?(?=\n  performance:\n)/)?.[0];
  assert.ok(suites);
  assert.match(suites, /fail-fast: false/);
  assert.match(suites, /suite: \[core, playground\]/);
  assert.match(suites, /timeout-minutes: 20/);
  assert.match(suites, /matrix.suite == 'core'[\s\S]*?npm run verify:e2e/);
  assert.match(suites, /matrix.suite == 'playground'[\s\S]*?npm run verify:playground/);
  assert.match(suites, /name: Preserve browser evidence\s+if: always\(\)/);
  assert.match(suites, /name: sortable-browser-\$\{\{ matrix.suite \}\}/);
  assert.match(aggregate, /name: Browser/);
  assert.match(aggregate, /- browser_suites/);
  assert.match(aggregate, /always\(\) && needs.changes.outputs.browser == 'true'/);
  assert.match(aggregate, /SUITES_RESULT: \$\{\{ needs.browser_suites.result \}\}/);
  assert.match(aggregate, /test "\$SUITES_RESULT" = success/);
});

test('Browser aggregate rejects failed, cancelled and skipped suites', () => {
  const workflow = readFileSync('.github/workflows/verify.yml', 'utf8');
  const aggregate = workflow.match(/\n  browser:\n[\s\S]*?(?=\n  performance:\n)/)?.[0];
  const command = aggregate?.match(/run: (test .+)/)?.[1];
  assert.ok(command);
  for (const result of ['success', 'failure', 'cancelled', 'skipped', '']) {
    const run = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', command], {
      env: { ...process.env, SUITES_RESULT: result }, encoding: 'utf8',
    });
    assert.equal(run.status === 0, result === 'success', result);
  }
});
