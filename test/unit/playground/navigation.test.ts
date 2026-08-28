import assert from 'node:assert/strict';
import test from 'node:test';

import {
  exampleIds,
  parityExampleIds,
  plannedParityExampleCount,
  playgroundPath,
  resolvePlaygroundRoute,
} from '../../../example/src/app/navigation.js';
import {
  readPlaygroundLocale,
  writePlaygroundLocale,
} from '../../../example/src/app/locale.js';

test('invalid routes fail closed to the simple React example', () => {
  assert.deepEqual(resolvePlaygroundRoute('/unknown'), {
    adapterId: 'react',
    exampleId: 'simple',
  });
  assert.deepEqual(resolvePlaygroundRoute('/examples/simple/vue'), {
    adapterId: 'vue',
    exampleId: 'simple',
  });
  assert.equal(
    playgroundPath({ adapterId: 'svelte', exampleId: 'two-lists' }),
    '/examples/two-lists/svelte',
  );
  for (const exampleId of ['clone', 'custom-clone', 'modifier-copy'] as const) {
    assert.deepEqual(resolvePlaygroundRoute(`/examples/${exampleId}/vanilla`), {
      adapterId: 'vanilla',
      exampleId,
    });
  }
});

test('all planned parity routes ship while Comins-only routes remain separate', () => {
  const implementedParityExamples = new Set<string>(parityExampleIds);

  assert.equal(exampleIds.length, 23);
  assert.equal(parityExampleIds.length, 17);
  assert.equal(plannedParityExampleCount, 17);
  assert.deepEqual(
    exampleIds.filter((exampleId) => !implementedParityExamples.has(exampleId)),
    ['empty', 'accept', 'auto-scroll', 'tree', 'custom-placeholder', 'skeleton-placeholder'],
  );
});

test('locale persistence accepts only ko and en', () => {
  const values = new Map<string, string>([
    ['comins-sortable-playground-locale', 'invalid'],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };

  assert.equal(readPlaygroundLocale(storage), 'ko');
  writePlaygroundLocale(storage, 'en');
  assert.equal(values.get('comins-sortable-playground-locale'), 'en');
});
