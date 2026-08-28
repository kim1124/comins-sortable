import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const peers = {
  react: '>=18.2 <20',
  'react-dom': '>=18.2 <20',
  svelte: '>=5 <6',
  vue: '>=3.5 <4',
};
const peerMeta = Object.fromEntries(
  Object.keys(peers).map((name) => [name, { optional: true }]),
);

function readJson(relativePath) {
  const path = join(root, relativePath);
  assert.equal(existsSync(path), true, `${relativePath} must exist`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('declares the approved public package boundary', () => {
  const manifest = readJson('package.json');

  assert.equal(manifest.name, 'comins-sortable');
  assert.equal(manifest.version, '0.1.0');
  assert.equal(Object.hasOwn(manifest, 'private'), false);
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.license, 'MIT');
  assert.deepEqual(manifest.publishConfig, { access: 'public' });
  assert.equal(Object.hasOwn(manifest, 'dependencies'), false);
  assert.deepEqual(manifest.peerDependencies, peers);
  assert.deepEqual(manifest.peerDependenciesMeta, peerMeta);
  assert.deepEqual(manifest.files, ['dist', 'README.md', 'CHANGELOG.md', 'LICENSE']);
  assert.deepEqual(manifest.sideEffects, ['./dist/styles.css']);
  assert.deepEqual(manifest.exports, {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.js',
    },
    './core': {
      types: './dist/core.d.ts',
      import: './dist/core.js',
    },
    './react': {
      types: './dist/react.d.ts',
      import: './dist/react.js',
    },
    './vue': {
      types: './dist/vue.d.ts',
      import: './dist/vue.js',
    },
    './svelte': {
      types: './dist/svelte.d.ts',
      import: './dist/svelte.js',
    },
    './styles.css': './dist/styles.css',
  });
});

test('locks the approved package root and optional peers', () => {
  const manifest = readJson('package.json');
  const lock = readJson('package-lock.json');

  assert.equal(lock.lockfileVersion, 3);
  assert.equal(lock.name, manifest.name);
  assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[''].name, manifest.name);
  assert.equal(lock.packages[''].version, manifest.version);
  assert.deepEqual(lock.packages[''].peerDependencies, peers);
  assert.deepEqual(lock.packages[''].peerDependenciesMeta, peerMeta);
});

test('records the reviewed source, export, and peer boundaries', async () => {
  const path = join(root, 'package-boundary.mjs');
  assert.equal(existsSync(path), true, 'package-boundary.mjs must exist');

  const boundary = await import(pathToFileURL(path).href);
  assert.deepEqual(boundary.publicExports, {
    '.': 'index',
    './core': 'core',
    './react': 'react',
    './vue': 'vue',
    './svelte': 'svelte',
  });
  assert.deepEqual(boundary.peerRanges, peers);
  assert.equal(boundary.sourceModules.includes('core'), true);
  assert.equal(boundary.sourceModules.includes('vanilla/create-sortable'), true);
  assert.equal(boundary.sourceModules.includes('react/SortableArea'), true);
  assert.equal(boundary.sourceModules.includes('vue/SortableArea'), true);
  assert.equal(boundary.sourceModules.includes('svelte/sortable'), true);
  assert.equal(new Set(boundary.sourceModules).size, boundary.sourceModules.length);
});

test('defines package build, test, and typecheck entry points', () => {
  const manifest = readJson('package.json');

  assert.equal(manifest.scripts.build, 'node scripts/build-package.mjs');
  assert.equal(manifest.scripts['check:licenses'], 'node scripts/check-licenses.mjs');
  assert.equal(manifest.scripts['check:npm-maintainer'], 'node scripts/check-npm-maintainer.mjs');
  assert.equal(manifest.scripts.typecheck, 'tsc --noEmit');
  assert.equal(manifest.scripts.test, 'node scripts/run-unit-tests.mjs');
  assert.equal(manifest.scripts['test:types'], 'tsc -p test/types/tsconfig.json --noEmit');
  assert.equal(manifest.scripts['test:consumer'], 'node scripts/consumer-smoke.mjs');
  assert.equal(manifest.scripts['verify:package-artifact'], 'node scripts/verify-package-artifact.mjs');
  assert.match(manifest.scripts.verify, /npm run check:licenses/);
  assert.match(manifest.scripts.verify, /npm run test:types/);

  for (const relativePath of [
    'tsconfig.json',
    'tsconfig.build.json',
    'scripts/build-package.mjs',
    'scripts/run-unit-tests.mjs',
  ]) {
    assert.equal(existsSync(join(root, relativePath)), true, `${relativePath} must exist`);
  }
});
