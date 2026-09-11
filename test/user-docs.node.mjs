import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import {
  dirname,
  join,
  resolve,
} from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkUserGuideExamples } from '../scripts/check-user-guide-examples.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const guideNames = [
  '01-quick-start.md',
  '02-core-concepts.md',
  '03-vanilla.md',
  '04-react.md',
  '05-vue.md',
  '06-svelte.md',
  '07-reorder-transfer.md',
  '08-copy-clone.md',
  '09-handle-acceptance.md',
  '10-animation-auto-scroll.md',
  '11-hosts-slots.md',
  '12-nested-tree.md',
  '13-placeholder.md',
  '14-lifecycle-errors.md',
  '15-public-api.md',
  '16-advanced-sorting.md',
];

const completeExampleGuideNames = [...guideNames.slice(6, 14), '16-advanced-sorting.md'];

const publicEntrySources = new Map([
  ['comins-sortable', 'src/index.ts'],
  ['comins-sortable/core', 'src/core.ts'],
  ['comins-sortable/react', 'src/react.ts'],
  ['comins-sortable/vue', 'src/vue.ts'],
  ['comins-sortable/svelte', 'src/svelte.ts'],
]);

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function markdownFiles() {
  return [
    'README.md',
    'docs/README.md',
    ...guideNames.map((name) => `docs/user/${name}`),
    ...guideNames.map((name) => `docs/ko/${name}`),
  ];
}

function relativeLinks(relativePath) {
  return [...read(relativePath).matchAll(/\]\(([^)]+)\)/g)]
    .map((match) => match[1].split('#', 1)[0])
    .filter((href) => href.startsWith('.'));
}

function exportedSymbols(relativePath) {
  const source = read(relativePath);
  const values = [];
  const types = [];

  for (const match of source.matchAll(/export\s+(type\s+)?\{([\s\S]*?)\}\s+from/g)) {
    const destination = match[1] === undefined ? values : types;
    for (const entry of match[2].split(',')) {
      const name = entry.trim().split(/\s+as\s+/).at(-1);
      if (name) destination.push(name);
    }
  }

  return { types, values };
}

function playgroundIds() {
  const navigation = read('example/src/app/navigation.ts');
  const block = navigation.match(
    /export const exampleIds = \[([\s\S]*?)\] as const/,
  )?.[1];
  assert.ok(block);
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

test('documents the local Playground immediately after installation', () => {
  const readme = read('README.md');
  const installation = readme.indexOf('## Installation');
  const playground = readme.indexOf('## Run the Playground locally');
  const quickStart = readme.indexOf('## Quick Start with React');

  assert.ok(installation >= 0);
  assert.ok(playground > installation);
  assert.ok(quickStart > playground);
  assert.match(
    readme,
    /git clone https:\/\/github\.com\/kim1124\/comins-sortable\.git\s+cd comins-sortable\s+npm ci --ignore-scripts\s+npm run dev/,
  );
  assert.match(readme, /http:\/\/127\.0\.0\.1:4003\/examples\/simple\/react/);
  assert.match(
    readme,
    /https:\/\/github\.com\/kim1124\/comins-sortable\/blob\/main\/docs\/user\/01-quick-start\.md/,
  );
  assert.match(
    readme,
    /https:\/\/github\.com\/kim1124\/comins-sortable\/blob\/main\/docs\/ko\/01-quick-start\.md/,
  );
});

test('keeps complete English and Korean guide pairs', () => {
  const english = readdirSync(join(root, 'docs', 'user'))
    .filter((name) => name.endsWith('.md'))
    .sort();
  const korean = readdirSync(join(root, 'docs', 'ko'))
    .filter((name) => name.endsWith('.md'))
    .sort();

  assert.deepEqual(english, guideNames);
  assert.deepEqual(korean, guideNames);
});

test('provides complete examples in every English and Korean feature guide', () => {
  for (const [locale, heading] of [
    ['user', '## Complete example'],
    ['ko', '## 전체 예제'],
  ]) {
    for (const name of completeExampleGuideNames) {
      const relativePath = `docs/${locale}/${name}`;
      const source = read(relativePath);

      assert.equal(
        source.includes(heading),
        true,
        `${relativePath} must identify its complete example`,
      );

      if (name === '12-nested-tree.md') {
        assert.match(source, /import \{ createSortableTree \} from 'comins-sortable\/core';/);
        assert.match(source, /export type Node =/);
        assert.match(source, /export function getTreeAreas\(/);
        assert.match(source, /export function updateTreeArea\(/);
        continue;
      }

      assert.match(source, /import \{ useState \} from 'react';/);
      assert.match(
        source,
        /import \{ SortableArea, SortableRoot \} from 'comins-sortable\/react';/,
      );
      assert.match(source, /export function \w+Example\(\)/);
      assert.match(source, /<SortableRoot</);
      assert.match(source, /<SortableArea/);
      assert.match(source, /onItemsChange=/);
    }
  }
});

test('typechecks every complete English and Korean feature example', () => {
  assert.deepEqual(checkUserGuideExamples(), { examples: 18 });
});

test('maps every shipped Playground example to the user guide index', () => {
  const exampleIds = playgroundIds();
  const index = read('docs/README.md');

  assert.equal(exampleIds.length, 25);
  for (const exampleId of exampleIds) {
    assert.equal(
      index.includes(`\`${exampleId}\``),
      true,
      `${exampleId} must be mapped in docs/README.md`,
    );
  }
});

test('keeps README release and package claims synchronized with source manifests', () => {
  const manifest = JSON.parse(read('package.json'));
  const readme = read('README.md');
  const changelog = read('CHANGELOG.md');
  const exampleIds = playgroundIds();

  assert.match(readme, new RegExp(`comins-sortable@${manifest.version.replaceAll('.', '\\.')}`));
  assert.match(changelog, new RegExp(`^## ${manifest.version.replaceAll('.', '\\.')}\\b`, 'm'));
  assert.match(readme, new RegExp(`Playground currently provides ${exampleIds.length} routes\\b`));
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
  assert.match(readme, /zero runtime dependencies/i);

  for (const peer of Object.keys(manifest.peerDependencies ?? {})) {
    assert.equal(readme.includes(peer), true, `README must identify peer ${peer}`);
  }
});

test('documents every public value and type export in both languages', () => {
  const english = read('docs/user/15-public-api.md');
  const korean = read('docs/ko/15-public-api.md');

  for (const [entry, source] of publicEntrySources) {
    for (const guide of [english, korean]) {
      assert.equal(guide.includes(`\`${entry}\``), true, `${entry} entry must be documented`);
    }

    const symbols = exportedSymbols(source);
    for (const symbol of [...symbols.values, ...symbols.types]) {
      for (const [locale, guide] of [['English', english], ['Korean', korean]]) {
        assert.equal(
          guide.includes(`\`${symbol}\``),
          true,
          `${locale} public API guide must document ${entry} ${symbol}`,
        );
      }
    }
  }
});

test('resolves every repository-relative user documentation link', () => {
  for (const relativePath of markdownFiles()) {
    assert.equal(existsSync(join(root, relativePath)), true, `${relativePath} must exist`);
    for (const href of relativeLinks(relativePath)) {
      const target = resolve(dirname(join(root, relativePath)), href);
      assert.equal(
        existsSync(target),
        true,
        `${relativePath} links to missing ${href}`,
      );
    }
  }
});

test('uses only public package imports in user examples', () => {
  const allowed = new Set([
    'comins-sortable',
    'comins-sortable/core',
    'comins-sortable/react',
    'comins-sortable/vue',
    'comins-sortable/svelte',
    'comins-sortable/styles.css',
    'react',
    'vue',
  ]);

  for (const relativePath of markdownFiles()) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /(?:\.\.\/)+src(?:\/|['"])/);
    for (const match of source.matchAll(
      /(?:from\s+|import\s+)['"]([^'"]+)['"]/g,
    )) {
      assert.equal(
        allowed.has(match[1]),
        true,
        `${relativePath} uses unsupported import ${match[1]}`,
      );
    }
  }
});
