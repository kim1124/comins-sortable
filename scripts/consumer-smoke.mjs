import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptsRoot);
const temporaryRoot = await mkdtemp(join(tmpdir(), 'comins-sortable-consumer-'));
const npmEnvironment = {
  ...process.env,
  npm_config_cache: join(temporaryRoot, 'npm-cache'),
  npm_config_logs_dir: join(temporaryRoot, 'npm-logs'),
};

await mkdir(npmEnvironment.npm_config_cache, { recursive: true });
await mkdir(npmEnvironment.npm_config_logs_dir, { recursive: true });

try {
  const providedTarball = process.argv[2];
  assert.equal(typeof providedTarball, 'string', 'exact package artifact is required');
  const tarballPath = resolve(repositoryRoot, providedTarball);
  assert.match(tarballPath, /\.tgz$/, 'package artifact must be a .tgz file');
  await access(tarballPath);

  const consumerRoot = join(temporaryRoot, 'consumer');
  await mkdir(consumerRoot);
  await writeFile(
    join(consumerRoot, 'package.json'),
    JSON.stringify({ name: 'comins-sortable-consumer-smoke', private: true, type: 'module' }),
  );

  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      tarballPath,
      'react@18.2.0',
      'react-dom@18.2.0',
      'svelte@5.0.0',
      'vue@3.5.0',
    ],
    { cwd: consumerRoot, env: npmEnvironment, stdio: 'inherit' },
  );

  const smokePath = join(consumerRoot, 'smoke.mjs');
  await writeFile(
    smokePath,
    `import assert from 'node:assert/strict';
import * as root from 'comins-sortable';
import * as core from 'comins-sortable/core';
import * as react from 'comins-sortable/react';
import * as vue from 'comins-sortable/vue';
import * as svelte from 'comins-sortable/svelte';

for (const entry of [root, core, react, vue, svelte]) {
  assert.ok(Object.keys(entry).length > 0);
}
assert.match(import.meta.resolve('comins-sortable/styles.css'), /^file:/);
process.stdout.write('Consumer package smoke check passed.\\n');
`,
  );
  execFileSync(process.execPath, [smokePath], {
    cwd: consumerRoot,
    env: npmEnvironment,
    stdio: 'inherit',
  });
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
