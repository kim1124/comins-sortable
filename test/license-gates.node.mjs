import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const checker = join(root, 'scripts', 'check-licenses.mjs');
const failure = 'license-check: failed\n';
const peers = {
  react: '>=18.2 <20',
  'react-dom': '>=18.2 <20',
  svelte: '>=5 <6',
  vue: '>=3.5 <4',
};
const peerMeta = Object.fromEntries(
  Object.keys(peers).map((name) => [name, { optional: true }]),
);
const reversedPeers = Object.fromEntries(Object.entries(peers).reverse());
const reversedPeerMeta = Object.fromEntries(Object.entries(peerMeta).reverse());
const cleanScope = {
  schemaVersion: 2,
  packageBoundary: true,
  runtimeDependencies: [],
  peerDependencies: peers,
  trackedMaterial: {
    copiedOrGeneratedCode: [],
    assets: [],
  },
};
const reviewedAsset = {
  path: 'docs/assets/sortable-playground.gif',
  source: 'example/',
  origin: 'first-party',
  license: 'MIT',
  useSurface: 'repository-documentation',
  generated: true,
  modifications: ['resized', 'gif-encoded'],
};
const cleanManifest = {
  name: 'comins-sortable',
  version: '0.1.0',
  type: 'module',
  license: 'MIT',
  publishConfig: { access: 'public' },
  peerDependencies: peers,
  peerDependenciesMeta: peerMeta,
};

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function write(cwd, relativePath, content) {
  const path = join(cwd, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function track(cwd, relativePath, content = 'fixture\n') {
  write(cwd, relativePath, content);
  git(cwd, 'add', relativePath);
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function packageFixture({
  includeScope = true,
  scope = cleanScope,
  manifest = {},
  dependencies,
  lockPackages = {},
  lockRoot = {},
} = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'comins-sortable-license-'));
  git(cwd, 'init', '--quiet');

  const packageJson = { ...cleanManifest, ...manifest };
  if (dependencies !== undefined) packageJson.dependencies = dependencies;
  const rootPackage = {
    name: packageJson.name,
    version: packageJson.version,
    license: packageJson.license,
    peerDependencies: packageJson.peerDependencies,
    peerDependenciesMeta: packageJson.peerDependenciesMeta,
    ...lockRoot,
  };
  if (dependencies !== undefined) rootPackage.dependencies = dependencies;
  const lock = {
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': rootPackage,
      ...lockPackages,
    },
  };

  if (includeScope) track(cwd, 'LICENSE_SCOPE.json', json(scope));
  track(cwd, 'package.json', json(packageJson));
  track(cwd, 'package-lock.json', json(lock));
  return cwd;
}

function run(cwd) {
  return spawnSync(process.execPath, [checker], { cwd, encoding: 'utf8' });
}

function constantFailure(result) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, failure);
}

function reviewRequired(result, name, license, surface) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    `license-review-required: ${name} ${license} ${surface}\n`,
  );
}

test('accepts the reviewed package dependency baseline', (t) => {
  const cwd = packageFixture();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  const result = run(cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('accepts the approved peers independent of JSON key order', (t) => {
  const cwd = packageFixture({
    scope: {
      ...cleanScope,
      peerDependencies: reversedPeers,
    },
    manifest: {
      peerDependencies: reversedPeers,
      peerDependenciesMeta: reversedPeerMeta,
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  const result = run(cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('fails closed when the scope is missing', (t) => {
  const cwd = packageFixture({ includeScope: false });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  constantFailure(run(cwd));
});

test('fails closed when the scope is malformed', (t) => {
  const cwd = packageFixture({ scope: { schemaVersion: 2 } });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  constantFailure(run(cwd));
});

test('fails closed for runtime dependencies', (t) => {
  const cwd = packageFixture({
    dependencies: { 'drag-runtime': '1.0.0' },
    lockPackages: {
      'node_modules/drag-runtime': {
        version: '1.0.0',
        license: 'MIT',
      },
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  constantFailure(run(cwd));
});

test('fails closed when the lock root does not match the manifest', (t) => {
  const cwd = packageFixture({ lockRoot: { version: '1.0.0' } });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  constantFailure(run(cwd));
});

test('fails closed when an approved peer range drifts', (t) => {
  const cwd = packageFixture({
    manifest: {
      peerDependencies: { ...peers, react: '^19.0.0' },
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  constantFailure(run(cwd));
});

test('fails closed when an approved peer is not optional', (t) => {
  const cwd = packageFixture({
    manifest: {
      peerDependenciesMeta: { ...peerMeta, react: { optional: false } },
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  constantFailure(run(cwd));
});

test('fails closed for a non-routine transitive license', (t) => {
  const cwd = packageFixture({
    lockPackages: {
      'node_modules/review-required': {
        version: '1.0.0',
        license: 'MPL-2.0',
        dev: true,
      },
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  reviewRequired(run(cwd), 'review-required', 'MPL-2.0', 'development');
});

test('requires review when transitive license metadata is missing', (t) => {
  const cwd = packageFixture({
    lockPackages: {
      'node_modules/unclassified': {
        version: '1.0.0',
        dev: true,
      },
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  reviewRequired(run(cwd), 'unclassified', 'UNKNOWN', 'development');
});

test('blocks an unreviewed dependency manifest outside npm', (t) => {
  const cwd = packageFixture();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'Pipfile', '[packages]\n');

  constantFailure(run(cwd));
});

for (const [label, relativePath, content] of [
  ['copied code', 'vendor/sortable.js', 'fixture\n'],
  ['generated code', 'src/sortable.generated.js', 'fixture\n'],
  ['data asset', 'assets/handles.json', '{"handles":[]}\n'],
  ['binary asset', 'plugin.node', 'fixture\n'],
]) {
  test(`blocks tracked ${label}`, (t) => {
    const cwd = packageFixture();
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    track(cwd, relativePath, content);

    constantFailure(run(cwd));
  });
}

test('does not allow a path-only declaration to bypass evidence review', (t) => {
  const cwd = packageFixture({
    scope: {
      ...cleanScope,
      trackedMaterial: {
        ...cleanScope.trackedMaterial,
        assets: ['README.md'],
      },
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'README.md');

  constantFailure(run(cwd));
});

test('accepts exact first-party generated documentation asset evidence', (t) => {
  const cwd = packageFixture({
    scope: {
      ...cleanScope,
      trackedMaterial: {
        ...cleanScope.trackedMaterial,
        assets: [reviewedAsset],
      },
    },
  });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, reviewedAsset.path, 'GIF89a');
  track(cwd, 'example/index.html', '<main>fixture</main>\n');

  const result = run(cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('rejects incomplete or non-first-party asset evidence', (t) => {
  const cases = [
    { ...reviewedAsset, origin: 'third-party' },
    { ...reviewedAsset, license: 'UNKNOWN' },
    { ...reviewedAsset, source: 'missing/' },
    { ...reviewedAsset, modifications: [] },
  ];

  for (const asset of cases) {
    const cwd = packageFixture({
      scope: {
        ...cleanScope,
        trackedMaterial: {
          ...cleanScope.trackedMaterial,
          assets: [asset],
        },
      },
    });
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    track(cwd, reviewedAsset.path, 'GIF89a');
    track(cwd, 'example/index.html', '<main>fixture</main>\n');

    constantFailure(run(cwd));
  }
});
