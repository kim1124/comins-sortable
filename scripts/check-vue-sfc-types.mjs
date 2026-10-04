import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtureRoot = process.argv[2] ? resolve(process.argv[2]) : join(root, 'test/types/vue-sfc');
const compiler = join(root, 'scripts/run-vue-sfc-compiler.cjs');
const temporary = await mkdtemp(join(fixtureRoot, '.check-'));
try {
  const base = JSON.parse(await readFile(join(fixtureRoot, 'tsconfig.json'), 'utf8'));
  for (const file of ['Consumer.vue', 'InvalidConsumer.vue']) {
    const config = join(temporary, 'tsconfig.json');
    await writeFile(config, JSON.stringify({ ...base, include: [join(fixtureRoot, file)] }));
    const run = spawnSync(process.execPath, [compiler, '-p', config, '--noEmit', '--pretty', 'false'], { cwd: fixtureRoot, encoding: 'utf8' });
    assert.ifError(run.error);
    const diagnostics = run.stdout + run.stderr;
    if (file === 'Consumer.vue') assert.equal(run.status, 0, diagnostics);
    else {
      assert.equal(run.status, 2, diagnostics);
      const lines = (await readFile(join(fixtureRoot, file), 'utf8')).split('\n');
      const expected = lines.flatMap((line, index) => {
        const match = line.match(/expect-error (TS\d+)/);
        return match ? [{ line: index + 2, code: match[1] }] : [];
      });
      const actual = [...diagnostics.matchAll(/InvalidConsumer\.vue\((\d+),\d+\): error (TS\d+)/g)].map((match) => ({ line: Number(match[1]), code: match[2] }));
      assert.ok(expected.length > 0);
      assert.deepEqual(actual, expected, diagnostics);
    }
  }
  console.log('Vue SFC positive and negative type checks passed.');
} finally { await rm(temporary, { recursive: true, force: true }); }
