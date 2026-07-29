import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const checker = join(root, 'scripts', 'check-licenses.mjs');
const failure = 'license-check: failed\n';
const cleanScope = `${JSON.stringify({
  schemaVersion: 1,
  packageBoundary: false,
  trackedMaterial: {
    dependencies: [],
    copiedOrGeneratedCode: [],
    assets: [],
  },
}, null, 2)}\n`;

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function write(cwd, relativePath, content) {
  const path = join(cwd, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function repository({ includeScope = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'comins-sortable-license-'));
  git(cwd, 'init', '--quiet');
  if (includeScope) write(cwd, 'LICENSE_SCOPE.json', cleanScope);
  return cwd;
}

function run(cwd) {
  return spawnSync(process.execPath, [checker], { cwd, encoding: 'utf8' });
}

function track(cwd, relativePath, content = 'fixture\n') {
  write(cwd, relativePath, content);
  git(cwd, 'add', relativePath);
}

function constantFailure(result) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, failure);
}

test('accepts the reviewed empty tracked-material baseline', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'README.md');
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);

  const result = run(cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('fails closed when the scope is missing', (t) => {
  const cwd = repository({ includeScope: false });
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'README.md');

  constantFailure(run(cwd));
});

test('fails closed when the scope is malformed', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', '{"schemaVersion":1}\n');

  constantFailure(run(cwd));
});

test('does not allow a path-only declaration to bypass evidence review', (t) => {
  const cwd = repository();
  const declaredScope = JSON.parse(cleanScope);
  declaredScope.trackedMaterial.assets.push('README.md');
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', `${JSON.stringify(declaredScope, null, 2)}\n`);
  track(cwd, 'README.md');

  constantFailure(run(cwd));
});

test('blocks a tracked dependency manifest before package approval', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, 'package.json', '{"private":true}\n');

  constantFailure(run(cwd));
});

for (const [label, relativePath, content] of [
  ['Python Pipfile', 'Pipfile', '[packages]\n'],
  ['Maven manifest', 'pom.xml', '<project/>\n'],
]) {
  test(`blocks a tracked ${label} before review`, (t) => {
    const cwd = repository();
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    track(cwd, 'LICENSE_SCOPE.json', cleanScope);
    track(cwd, relativePath, content);

    constantFailure(run(cwd));
  });
}

test('blocks a tracked Git submodule dependency before review', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, '.gitmodules', '[submodule "engine"]\n\tpath = engine\n');

  constantFailure(run(cwd));
});

test('blocks tracked copied code in a conventional vendor path', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, 'vendor/sortable.js');

  constantFailure(run(cwd));
});

test('blocks copied code identified by a third-party filename segment', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, 'src/third_party_lib.js');

  constantFailure(run(cwd));
});

test('blocks tracked generated code by filename', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, 'src/sortable.generated.js');

  constantFailure(run(cwd));
});

test('blocks root metadata as an unreviewed data asset', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, 'metadata.json', '{"source":"fixture"}\n');

  constantFailure(run(cwd));
});

test('blocks tracked data in a conventional asset path', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, 'assets/handles.json', '{"handles":[]}\n');

  constantFailure(run(cwd));
});

test('blocks a tracked asset by file type outside an asset path', (t) => {
  const cwd = repository();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  track(cwd, 'LICENSE_SCOPE.json', cleanScope);
  track(cwd, 'docs/handle.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>\n');

  constantFailure(run(cwd));
});

for (const relativePath of [
  'libfoo.so',
  'plugin.node',
  'program.exe',
  'library.jar',
  'file.bin',
]) {
  test(`blocks an unreviewed binary asset at ${relativePath}`, (t) => {
    const cwd = repository();
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    track(cwd, 'LICENSE_SCOPE.json', cleanScope);
    track(cwd, relativePath);

    constantFailure(run(cwd));
  });
}
