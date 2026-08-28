import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  normalizeMaintainers,
  run,
  validateCurrentIdentity,
  validatePublishedIdentity,
} from '../scripts/check-npm-public-identity.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const failure = 'npm-public-identity-check: failed\n';
const email = (local, domain) => [local, '@', domain].join('');
const expected = {
  name: 'comins-registry',
  email: email('comins.registry', 'example.test'),
};
const provider = {
  name: 'GitHub Actions',
  email: email('actions', 'github.com'),
  approver: expected,
  trustedPublisher: {
    id: 'github',
    oidcConfigId: 'provider-managed-id',
  },
};

function runner(overrides = {}) {
  const calls = [];
  const errors = [];
  const outputs = {
    profile: expected,
    maintainers: [expected],
    _npmUser: provider,
    author: null,
    contributors: [],
    ...overrides.outputs,
  };
  const execNpm = overrides.execNpm ?? ((args, options) => {
    calls.push({ args, options });
    const field = args[0] === 'profile' ? 'profile' : args[2];
    return JSON.stringify(outputs[field]);
  });
  const code = run({
    args: overrides.args ?? [],
    env: overrides.env ?? {
      COMINS_NPM_PUBLIC_NAME: expected.name,
      COMINS_NPM_PUBLIC_EMAIL: expected.email,
    },
    execNpm,
    packageJson: overrides.packageJson ?? { name: 'comins-sortable' },
    writeError: (value) => errors.push(value),
  });
  return { calls, code, errors };
}

function assertConstantFailure(result) {
  assert.equal(result.code, 1);
  assert.deepEqual(result.errors, [failure]);
}

test('requires exactly one matching public npm identity', () => {
  assert.deepEqual(normalizeMaintainers([expected]), [expected]);
  assert.deepEqual(
    normalizeMaintainers([`${expected.name} <${expected.email}>`]),
    [expected],
  );
  assert.equal(validateCurrentIdentity([expected], expected), true);
  assert.equal(validateCurrentIdentity([], expected), false);
  assert.equal(validateCurrentIdentity([expected, expected], expected), false);
  assert.equal(
    validateCurrentIdentity([{ ...expected, name: 'different' }], expected),
    false,
  );
  assert.equal(
    validateCurrentIdentity(
      [{ ...expected, email: email('private', 'example.test') }],
      expected,
    ),
    false,
  );
});

test('checks the authenticated npm profile before an interactive bootstrap', () => {
  const result = runner({ args: ['--profile'] });

  assert.equal(result.code, 0);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.calls.map(({ args }) => args), [
    ['profile', 'get', '--json'],
  ]);
  assert.deepEqual(result.calls[0].options.stdio, ['ignore', 'pipe', 'pipe']);
});

test('checks current registry maintainers and exact published metadata', () => {
  const current = runner();
  const published = runner({ args: ['--version', '0.1.1'] });

  assert.equal(current.code, 0);
  assert.deepEqual(current.calls.map(({ args }) => args), [
    ['view', 'comins-sortable', 'maintainers', '--json'],
  ]);
  assert.equal(published.code, 0);
  assert.deepEqual(published.calls.map(({ args }) => args), [
    ['view', 'comins-sortable@0.1.1', 'maintainers', '--json'],
    ['view', 'comins-sortable@0.1.1', '_npmUser', '--json'],
    ['view', 'comins-sortable@0.1.1', 'author', '--json'],
    ['view', 'comins-sortable@0.1.1', 'contributors', '--json'],
  ]);
});

test('requires trusted publishing and the service approver after publication', () => {
  const metadata = (overrides = {}) => ({
    maintainers: [expected],
    npmUser: provider,
    author: null,
    contributors: [],
    ...overrides,
  });

  assert.equal(validatePublishedIdentity(metadata(), expected), true);
  assert.equal(validatePublishedIdentity(metadata({ npmUser: null }), expected), false);
  assert.equal(
    validatePublishedIdentity(metadata({
      npmUser: { ...provider, name: 'different' },
    }), expected),
    false,
  );
  assert.equal(
    validatePublishedIdentity(metadata({
      npmUser: { ...provider, email: email('actions', 'example.test') },
    }), expected),
    false,
  );
  assert.equal(
    validatePublishedIdentity(metadata({
      npmUser: {
        ...provider,
        trustedPublisher: { ...provider.trustedPublisher, id: 'different' },
      },
    }), expected),
    false,
  );
  assert.equal(
    validatePublishedIdentity(metadata({
      npmUser: {
        ...provider,
        trustedPublisher: { ...provider.trustedPublisher, oidcConfigId: '' },
      },
    }), expected),
    false,
  );
  assert.equal(
    validatePublishedIdentity(metadata({
      npmUser: {
        ...provider,
        approver: { ...expected, email: email('different', 'example.test') },
      },
    }), expected),
    false,
  );
  assert.equal(validatePublishedIdentity(metadata({ author: expected }), expected), false);
  assert.equal(
    validatePublishedIdentity(metadata({ contributors: [expected] }), expected),
    false,
  );
});

test('accepts npm 12 wrapped JSON but rejects ambiguous nesting', () => {
  assert.equal(runner({
    args: ['--profile'],
    outputs: { profile: [expected] },
  }).code, 0);
  assert.equal(runner({
    outputs: { maintainers: [[expected]] },
  }).code, 0);
  assert.equal(runner({
    args: ['--version', '0.1.1'],
    outputs: {
      maintainers: [[expected]],
      _npmUser: [provider],
      author: [null],
      contributors: [[]],
    },
  }).code, 0);

  assertConstantFailure(runner({
    args: ['--profile'],
    outputs: { profile: [expected, expected] },
  }));
  assertConstantFailure(runner({
    outputs: { maintainers: [[[expected]]] },
  }));
  assertConstantFailure(runner({
    args: ['--version', '0.1.1'],
    outputs: { _npmUser: [provider, provider] },
  }));
});

test('fails closed without exposing actual or expected npm identity values', () => {
  for (const result of [
    runner({ env: {} }),
    runner({ args: ['--unknown'] }),
    runner({ args: ['--version', '0.1'] }),
    runner({ args: ['--profile'], outputs: { profile: {
      ...expected,
      email: email('private', 'example.test'),
    } } }),
    runner({ outputs: { maintainers: [expected, expected] } }),
    runner({ execNpm: () => { throw new Error('unavailable'); } }),
  ]) assertConstantFailure(result);
});

test('uses full-history, exact-artifact, and staged-publishing release controls', () => {
  const workflow = readFileSync(`${root}/.github/workflows/publish.yml`, 'utf8');
  const historyGate = workflow.indexOf(
    'node scripts/check-public-identities.mjs --all-history',
  );
  const identityGate = workflow.indexOf(
    'node scripts/check-npm-public-identity.mjs',
  );
  const artifactGate = workflow.indexOf('node scripts/verify-package-artifact.mjs');
  const publish = workflow.indexOf('npm stage publish');

  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /node scripts\/verify-package-artifact\.mjs/);
  assert.match(workflow, /npm run test:consumer/);
  assert.match(workflow, /gitleaks dir/);
  assert.match(workflow, /environment: npm/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /COMINS_NPM_PUBLIC_NAME: \$\{\{ secrets\.COMINS_NPM_PUBLIC_NAME \}\}/);
  assert.match(workflow, /COMINS_NPM_PUBLIC_EMAIL: \$\{\{ secrets\.COMINS_NPM_PUBLIC_EMAIL \}\}/);
  assert.ok(historyGate >= 0);
  assert.ok(artifactGate > historyGate);
  assert.ok(identityGate >= 0);
  assert.ok(publish > identityGate);
  assert.doesNotMatch(
    workflow.slice(identityGate, publish),
    /npm (?:publish|stage publish)/,
  );
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|npm publish(?:\s|$)/);
});
