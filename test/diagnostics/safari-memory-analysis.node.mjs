import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, symlink, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const cli = new URL('../../scripts/analyze-safari-memory.mjs', import.meta.url);
async function run(mutate = () => {}, outputName = 'out.json') {
  const dir = await mkdtemp(join(tmpdir(), 'safari-analysis-test-'));
  const asset = 'class Machine {}';
  await writeFile(join(dir, 'asset.js'), asset);
  const snapshot = { version: 3, type: 'Inspector', nodeClassNames: ['<root>', 'Document', 'Machine'],
    nodes: [0, 0, 0, 0, 1, 254, 1, 1, 2, 32, 2, 2], edges: [0, 1, 0, 0, 0, 2, 0, 0], edgeTypes: ['Internal'], edgeNames: [] };
  await writeFile(join(dir, 'before.json'), JSON.stringify(snapshot));
  await writeFile(join(dir, 'after.json'), JSON.stringify(snapshot));
  const manifest = { schemaVersion: 1, kind: 'product', head: 'candidate', browserVersion: 'Safari test',
    assets: [{ path: 'asset.js', sha256: createHash('sha256').update(asset).digest('hex') }],
    classMap: { SessionMachine: 'Machine', AreaRegistry: 'Machine', GeometryCache: 'Machine' },
    snapshots: [{ path: 'before.json', inspectorSessionId: 'one', phase: 'baseline' },
      { path: 'after.json', inspectorSessionId: 'one', phase: 'after' }] };
  await mutate(manifest, dir);
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest));
  const result = spawnSync(process.execPath, [cli.pathname, '--manifest', join(dir, 'manifest.json'), '--output', join(dir, outputName)], { encoding: 'utf8' });
  let output;
  try { output = JSON.parse(await readFile(join(dir, 'out.json'), 'utf8')); } catch {}
  return { ...result, output, dir, inputSnapshotText: JSON.stringify(snapshot) };
}

test('같은 세션만 비교하고 internal flag를 dead로 해석하지 않는다', async () => {
  const r = await run(); assert.equal(r.status, 0, r.stderr);
  assert.equal(r.output.snapshots[0].rawClassCounts.Document, 1);
  assert.equal(r.output.snapshots[0].nativeDocumentCount, null);
  assert.equal(r.output.snapshots[0].productClassCounts.SessionMachine, 1);
  assert.deepEqual(r.output.comparisons[0].removedIds, []);
  assert.equal(r.output.status, 'INCOMPLETE');
});
test('Inspector 세션이 다르면 ID 비교를 거부한다', async () => {
  const r = await run(m => { m.snapshots[1].inspectorSessionId = 'two'; });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /session/i);
});
test('같은 세션 표기라도 동일 ID의 클래스가 바뀌면 비교를 거부한다', async () => {
  const r = await run(async (_, dir) => {
    const p = join(dir, 'after.json');
    const snapshot = JSON.parse(await readFile(p, 'utf8'));
    snapshot.nodeClassNames[2] = 'ReusedIdentity';
    await writeFile(p, JSON.stringify(snapshot));
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /identity/i);
});
test('자산 해시 불일치는 실패한다', async () => {
  const r = await run(m => { m.assets[0].sha256 = '0'.repeat(64); });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /hash/i);
});
test('제품 매핑 부재는 0개 PASS로 표시하지 않는다', async () => {
  const r = await run(m => { m.classMap.SessionMachine = 'UnknownClass'; });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /mapping/i);
});
test('제품 없는 control은 빈 매핑을 허용한다', async () => {
  const r = await run(m => { m.kind = 'control'; m.classMap = {}; });
  assert.equal(r.status, 0, r.stderr); assert.deepEqual(r.output.snapshots[0].productClassCounts, {});
  assert.equal(r.output.status, 'INCOMPLETE');
});
test('잘못된 snapshot stride는 실패한다', async () => {
  const r = await run(async (_, dir) => { await writeFile(join(dir, 'after.json'), JSON.stringify({ version: 3, type: 'Inspector', nodes: [0] })); });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /snapshot/i);
});

for (const [name, createAlias] of [['symlink', symlink], ['hardlink', link]]) {
  test(`${name} 출력으로 입력 snapshot을 덮어쓰지 않는다`, async () => {
    const r = await run(async (_, dir) => { await createAlias(join(dir, 'before.json'), join(dir, 'out.json')); });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /EEXIST/);
    assert.equal(await readFile(join(r.dir, 'before.json'), 'utf8'), r.inputSnapshotText);
  });
}
test('기존 출력 증거를 덮어쓰지 않는다', async () => {
  const r = await run(async (_, dir) => { await writeFile(join(dir, 'out.json'), '{"evidence":"keep"}'); });
  assert.notEqual(r.status, 0);
  assert.equal(await readFile(join(r.dir, 'out.json'), 'utf8'), '{"evidence":"keep"}');
});
test('입력과 동일한 출력 경로를 거부하고 원본을 보존한다', async () => {
  const r = await run(() => {}, 'before.json');
  assert.notEqual(r.status, 0);
  assert.equal(await readFile(join(r.dir, 'before.json'), 'utf8'), r.inputSnapshotText);
});
