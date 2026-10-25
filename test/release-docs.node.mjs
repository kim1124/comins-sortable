import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve('scripts/sync-release-docs.mjs');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'sortable-release-docs-'));
  mkdirSync(join(root, 'docs/verification'), { recursive: true });
  writeFileSync(join(root, 'docs/verification/0.1.8-local-validation.md'), '# Candidate evidence\n');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.1.8' }));
  writeFileSync(join(root, 'CHANGELOG.md'), '# Changelog\n\n## Unreleased\n\n## 0.1.8\n\n### Highlights\n\n- Future feature.\n\n### 주요 변경\n\n- 다음 버전 기능.\n\n### Fixed\n\n- Future fix.\n\n## 0.1.7\n\n- Old change.\n');
  writeFileSync(join(root, 'README.md'), '# Sortable\n\nInstall instructions.\n');
  writeFileSync(join(root, 'docs/README.md'), '# Docs\n\nGuides.\n');
  return root;
}
const run = (root, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });

test('future version generates current notes, preserves prose and rejects stale output', () => {
  const root = fixture();
  try {
    let result = run(root, '--write');
    assert.equal(result.status, 0, result.stderr);
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    assert.ok(readme.indexOf('0.1.8') < readme.indexOf('Install instructions.'));
    assert.match(readme, /Future feature/);
    assert.doesNotMatch(readme, /Old change/);
    assert.match(readFileSync(join(root, 'docs/README.md'), 'utf8'), /다음 버전 기능/);
    assert.match(readFileSync(join(root, 'docs/releases/latest.md'), 'utf8'), /Future fix/);
    assert.equal(run(root, '--check').status, 0);
    assert.equal(run(root, '--write').status, 0);
    assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), readme);
    writeFileSync(join(root, 'README.md'), readme.replace('Future feature.', 'stale'));
    assert.notEqual(run(root, '--check').status, 0);
    assert.equal(run(root, '--write').status, 0);
    assert.equal(run(root, '--check').status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing notes, missing translation and broken markers fail before writing', () => {
  for (const invalid of ['version', 'translation', 'markers', 'status']) {
    const root = fixture();
    try {
      if (invalid === 'status') rmSync(join(root, 'docs/verification/0.1.8-local-validation.md'));
      if (invalid === 'version') writeFileSync(join(root, 'package.json'), '{"version":"0.1.9"}');
      if (invalid === 'translation') {
        const changelog = join(root, 'CHANGELOG.md');
        writeFileSync(changelog, readFileSync(changelog, 'utf8').replace('### 주요 변경', '### Missing'));
      }
      if (invalid === 'markers') writeFileSync(join(root, 'docs/README.md'), '# Docs\n<!-- release-summary:start -->\n');
      const before = readFileSync(join(root, 'README.md'), 'utf8');
      assert.notEqual(run(root, '--write').status, 0);
      assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), before);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('npm version lifecycle uses the updated manifest version without creating a tag', () => {
  const root = fixture();
  try {
    mkdirSync(join(root, 'scripts'));
    copyFileSync(script, join(root, 'scripts/sync-release-docs.mjs'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'release-fixture', version: '0.1.7', scripts: { version: 'node scripts/sync-release-docs.mjs --write' } }));
    const result = spawnSync('npm', ['version', '0.1.8', '--no-git-tag-version', '--ignore-scripts=false'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(readFileSync(join(root, 'README.md'), 'utf8'), /0\.1\.8/);
    assert.equal(run(root, '--check').status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('release prose preserves literal dollar replacement tokens', () => {
  const root = fixture();
  try {
    const path = join(root, 'CHANGELOG.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('Future feature.', () => 'Literal $1 and $& tokens.'));
    assert.equal(run(root, '--write').status, 0);
    assert.ok(readFileSync(join(root, 'README.md'), 'utf8').includes('Literal $1 and $& tokens.'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
