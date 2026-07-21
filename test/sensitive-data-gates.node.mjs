import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const checker = join(root, 'scripts', 'check-public-identities.mjs');
const failure = 'public-identity-check: failed\n';
const email = (local, domain) => [local, '@', domain].join('');
const safeName = 'comins-ci';
const safeEmail = email(safeName, 'users.noreply.github.com');
const unsafeName = ['Local', 'Author'].join(' ');
const unsafeEmail = email('local.author', 'private.test');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'comins-sortable-identity-'));
  git(cwd, 'init', '--quiet');
  git(cwd, 'config', 'user.name', safeName);
  git(cwd, 'config', 'user.email', safeEmail);
  return cwd;
}

function commit(cwd, message) {
  writeFileSync(join(cwd, 'change.txt'), `${message}\n`, { flag: 'a' });
  git(cwd, 'add', 'change.txt');
  git(cwd, 'commit', '--quiet', '-m', message);
  return git(cwd, 'rev-parse', 'HEAD');
}

function run(cwd, ...args) {
  return spawnSync(process.execPath, [checker, ...args], { cwd, encoding: 'utf8' });
}

function constantFailure(result) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, failure);
}

test('adopts Contract v1.2 without inventing a package boundary', () => {
  const agents = read('AGENTS.md');
  const security = read('SECURITY.md');

  assert.match(agents, /Contract v1\.2/);
  assert.match(agents, /Never track personal names, personal email addresses/);
  assert.match(agents, /Gitleaks/);
  assert.match(agents, /fail closed/i);
  assert.match(security, /credential\/PII incident/i);
  assert.match(security, /npm pack --json --ignore-scripts/);
  assert.equal(existsSync(join(root, 'package.json')), false);
  assert.equal(existsSync(join(root, '.github/workflows/publish.yml')), false);
});

test('pins shared Gitleaks, hooks, and the credential-free workflow', () => {
  const config = read('.gitleaks.toml');
  const preCommit = read('.githooks/pre-commit');
  const prePush = read('.githooks/pre-push');
  const verify = read('.github/workflows/verify.yml');

  assert.match(config, /^minVersion = "v8\.30\.1"$/m);
  for (const id of [
    'comins-non-placeholder-email',
    'comins-local-account-path',
    'comins-korean-sensitive-number',
    'comins-sensitive-filename',
  ]) assert.match(config, new RegExp(`^id = "${id}"$`, 'm'));
  assert.doesNotMatch(config, /^\[\[allowlists\]\]$/m);
  assert.match(config, /Approved npm package version coordinates/);

  assert.match(preCommit, /check-public-identities\.mjs/);
  assert.match(preCommit, /gitleaks git --pre-commit/);
  assert.match(preCommit, /--staged/);
  assert.match(preCommit, /mktemp/);
  assert.match(preCommit, /sensitive-data-check: failed/);
  assert.match(prePush, /check-public-identities\.mjs "\$base_sha" "\$local_sha"/);
  assert.match(prePush, /--log-opts="\$base_sha\.\.\$local_sha"/);

  assert.match(verify, /actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1/);
  assert.match(verify, /actions\/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38/);
  assert.match(verify, /fetch-depth: 0/);
  assert.match(verify, /persist-credentials: false/);
  assert.match(verify, /check-public-identities\.mjs "\$BASE_SHA" "\$HEAD_SHA"/);
  assert.match(verify, /--log-opts="\$BASE_SHA\.\.\$HEAD_SHA"/);
  assert.match(verify, /node --test test\/\*\.node\.mjs/);
});

test('accepts a matching public noreply identity', () => {
  const cwd = repository();
  const result = run(cwd);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

test('rejects unsafe local and range identities without values', () => {
  const cwd = repository();
  const base = commit(cwd, 'safe');
  git(cwd, 'config', 'user.name', unsafeName);
  git(cwd, 'config', 'user.email', unsafeEmail);
  const head = commit(cwd, 'unsafe');
  constantFailure(run(cwd));
  constantFailure(run(cwd, base, head));
});

test('rejects an unsafe identity hidden by mailmap', () => {
  const cwd = repository();
  const base = commit(cwd, 'safe');
  git(cwd, 'config', 'user.name', unsafeName);
  git(cwd, 'config', 'user.email', unsafeEmail);
  commit(cwd, 'unsafe');
  git(cwd, 'config', 'user.name', safeName);
  git(cwd, 'config', 'user.email', safeEmail);
  writeFileSync(join(cwd, '.mailmap'), `${safeName} <${safeEmail}> ${unsafeName} <${unsafeEmail}>\n`);
  git(cwd, 'add', '.mailmap');
  const head = commit(cwd, 'mailmap');
  constantFailure(run(cwd, base, head));
});
