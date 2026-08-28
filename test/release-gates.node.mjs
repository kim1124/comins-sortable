import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  parseRepositoryOwner,
  validateNpmMaintainers,
} from '../scripts/check-npm-maintainer.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const failure = /^Error: npm-maintainer-check: failed$/;

test('accepts exactly one approved npm maintainer without exposing identity values', () => {
  const syntheticAddress = ['release', 'example.invalid'].join('@');
  assert.doesNotThrow(() => validateNpmMaintainers(
    [`kim1124 <${syntheticAddress}>`],
    'kim1124',
  ));
  assert.doesNotThrow(() => validateNpmMaintainers(
    [{ email: syntheticAddress, name: 'kim1124' }],
    'kim1124',
  ));
  for (const maintainers of [
    [],
    [`kim1124 <${syntheticAddress}>`, `kim1124 <${syntheticAddress}>`],
    ['malformed'],
    [`different-handle <${syntheticAddress}>`],
    null,
  ]) {
    assert.throws(() => validateNpmMaintainers(maintainers, 'kim1124'), failure);
  }
});

test('derives the approved public handle from the repository URL', () => {
  assert.equal(
    parseRepositoryOwner('git+https://github.com/kim1124/comins-sortable.git'),
    'kim1124',
  );
  assert.throws(
    () => parseRepositoryOwner('https://example.invalid/comins-sortable'),
    failure,
  );
});

test('uses reviewed exact-artifact and staged-publishing release controls', () => {
  const workflow = readFileSync(`${root}/.github/workflows/publish.yml`, 'utf8');
  const gate = workflow.indexOf('node scripts/check-npm-maintainer.mjs');
  const publish = workflow.indexOf('npm stage publish');

  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /node scripts\/verify-package-artifact\.mjs/);
  assert.match(workflow, /npm run test:consumer/);
  assert.match(workflow, /gitleaks dir/);
  assert.match(workflow, /environment: npm/);
  assert.match(workflow, /id-token: write/);
  assert.ok(gate >= 0);
  assert.ok(publish > gate);
  assert.doesNotMatch(workflow.slice(gate, publish), /npm (?:publish|stage publish)/);
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|npm publish(?:\s|$)/);
});
