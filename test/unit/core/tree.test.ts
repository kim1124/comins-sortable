import assert from 'node:assert/strict';
import test from 'node:test';

import { createSortableTree } from '../../../src/core/tree.js';
import type { FrameworkSortableChange } from '../../../src/core/model.js';
import { hasCode } from '../helpers/core-fixtures.js';

interface Node {
  id: string;
  label: string;
  children: readonly Node[];
}

const node = (id: string, children: readonly Node[] = []): Node => ({
  id,
  label: id.toUpperCase(),
  children,
});

const model = createSortableTree<Node>({
  rootAreaId: 'tree-root',
  getNodeId: (item) => item.id,
  getChildren: (item) => item.children,
  withChildren: (item, children) => ({ ...item, children }),
  getChildrenAreaId: (item) => `tree-children-${item.id}`,
});

test('tree exposes root and child areas with cycle-safe parent metadata', () => {
  const tree = [node('a', [node('a-1')]), node('b')];

  assert.deepEqual(model.getAreas(tree), [
    { areaId: 'tree-root', items: tree },
    {
      areaId: 'tree-children-a',
      parent: { areaId: 'tree-root', itemId: 'a' },
      items: tree[0]?.children,
    },
    {
      areaId: 'tree-children-a-1',
      parent: { areaId: 'tree-children-a', itemId: 'a-1' },
      items: [],
    },
    {
      areaId: 'tree-children-b',
      parent: { areaId: 'tree-root', itemId: 'b' },
      items: [],
    },
  ]);
});

test('tree replaces one nested area without mutating the input', () => {
  const child = node('a-1');
  const sibling = node('b');
  const tree = [node('a', [child]), sibling];
  const nextChild = node('a-2');

  const next = model.updateArea(tree, 'tree-children-a', [child, nextChild]);

  assert.deepEqual(next[0]?.children.map((item) => item.id), ['a-1', 'a-2']);
  assert.deepEqual(tree[0]?.children.map((item) => item.id), ['a-1']);
  assert.equal(next[1], sibling);
});

test('tree applies enhanced framework updates as one immutable change', () => {
  const first = node('a', [node('a-1')]);
  const second = node('b');
  const tree = [first, second];
  const change: FrameworkSortableChange<Node> = {
    operation: 'transfer',
    itemId: 'b',
    source: { areaId: 'tree-root', index: 1 },
    destination: { areaId: 'tree-children-a', index: 1 },
    orders: [
      { areaId: 'tree-root', itemIds: ['a'] },
      { areaId: 'tree-children-a', itemIds: ['a-1', 'b'] },
    ],
    updates: [
      { areaId: 'tree-root', items: [first] },
      { areaId: 'tree-children-a', items: [first.children[0] as Node, second] },
    ],
  };

  const next = model.applyChange(tree, change);

  assert.deepEqual(next.map((item) => item.id), ['a']);
  assert.deepEqual(next[0]?.children.map((item) => item.id), ['a-1', 'b']);
  assert.deepEqual(tree.map((item) => item.id), ['a', 'b']);
});

test('tree supports typed copy updates and validates the resulting IDs', () => {
  const first = node('a');
  const copied = node('a-copy');
  const tree = [first];
  const change: FrameworkSortableChange<Node> = {
    operation: 'copy',
    itemId: 'a-copy',
    sourceItemId: 'a',
    source: { areaId: 'tree-root', index: 0 },
    destination: { areaId: 'tree-root', index: 1 },
    orders: [{ areaId: 'tree-root', itemIds: ['a', 'a-copy'] }],
    updates: [{ areaId: 'tree-root', items: [first, copied] }],
  };

  assert.deepEqual(model.applyChange(tree, change).map((item) => item.id), ['a', 'a-copy']);
});

test('tree rejects unknown areas and duplicate node or area IDs', () => {
  assert.throws(
    () => model.updateArea([node('a')], 'missing', []),
    hasCode('INVALID_OPTION'),
  );
  assert.throws(
    () => model.getAreas([node('a'), node('a')]),
    hasCode('DUPLICATE_ITEM_ID'),
  );

  const duplicateAreaModel = createSortableTree<Node>({
    rootAreaId: 'tree-root',
    getNodeId: (item) => item.id,
    getChildren: (item) => item.children,
    withChildren: (item, children) => ({ ...item, children }),
    getChildrenAreaId: () => 'tree-root',
  });
  assert.throws(
    () => duplicateAreaModel.getAreas([node('a')]),
    hasCode('DUPLICATE_AREA_ID'),
  );
});
