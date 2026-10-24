import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function argument(name) {
  const index = process.argv.indexOf(name);
  requireValue(index >= 2 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--'), `Missing ${name}`);
  return resolve(process.argv[index + 1]);
}

function summarize(snapshot, classMap) {
  const { nodes, edges, nodeClassNames, edgeTypes, edgeNames } = snapshot;
  requireValue(snapshot.version === 3 && snapshot.type === 'Inspector' &&
    Array.isArray(nodes) && nodes.length >= 4 && nodes.length % 4 === 0 &&
    Array.isArray(edges) && edges.length % 4 === 0 &&
    [nodeClassNames, edgeTypes, edgeNames].every(Array.isArray), 'Invalid snapshot schema');
  const ids = new Set(), classes = Object.create(null), records = new Map();
  let heapBytes = 0, codeBytes = 0;
  for (let i = 0; i < nodes.length; i += 4) {
    const [id, size, classIndex, flags] = nodes.slice(i, i + 4);
    requireValue([id, size, classIndex, flags].every(n => Number.isSafeInteger(n) && n >= 0) &&
      typeof nodeClassNames[classIndex] === 'string' && !ids.has(id), 'Invalid snapshot node');
    const name = nodeClassNames[classIndex];
    ids.add(id); records.set(id, { name, size }); heapBytes += size;
    classes[name] = (classes[name] ?? 0) + 1;
    if (['FunctionCodeBlock', 'UnlinkedFunctionCodeBlock'].includes(name)) codeBytes += size;
  }
  const readers = new Map();
  for (let i = 0; i < edges.length; i += 4) {
    const [from, to, type, name] = edges.slice(i, i + 4);
    requireValue(ids.has(from) && ids.has(to) && Number.isInteger(type) && type >= 0 &&
      typeof edgeTypes[type] === 'string' && Number.isSafeInteger(name) && name >= 0, 'Invalid snapshot edge');
    if (['Property', 'Variable'].includes(edgeTypes[type])) requireValue(typeof edgeNames[name] === 'string', 'Invalid snapshot edge name');
    if (edgeTypes[type] !== 'Property' || records.get(from).name !== 'Window') continue;
    if (['ReaderArticleFinderJS', 'ReaderArticleFinderJSController'].includes(edgeNames[name])) {
      if (!readers.has(from)) readers.set(from, new Set());
      readers.get(from).add(edgeNames[name]);
    }
  }
  return { ids, records, summary: { heapBytes, codeBytes, rawClassCounts: classes, nativeDocumentCount: null,
    readerGlobalIds: [...readers].filter(([, names]) => names.size === 2).map(([id]) => id),
    productClassCounts: Object.fromEntries(Object.entries(classMap).map(([role, name]) => [role, classes[name] ?? 0])) } };
}

try {
  const manifestPath = argument('--manifest'), outputPath = argument('--output');
  const manifestText = await readFile(manifestPath), m = JSON.parse(manifestText);
  requireValue(m.schemaVersion === 1 && ['product', 'control'].includes(m.kind) &&
    typeof m.head === 'string' && m.head.length > 0 && typeof m.browserVersion === 'string' &&
    Array.isArray(m.assets) && m.assets.length > 0 && Array.isArray(m.snapshots) && m.snapshots.length > 0, 'Invalid manifest');
  requireValue(m.classMap && typeof m.classMap === 'object' && !Array.isArray(m.classMap), 'Invalid class mapping');
  if (m.kind === 'product') for (const role of ['SessionMachine', 'AreaRegistry', 'GeometryCache'])
    requireValue(typeof m.classMap[role] === 'string' && m.classMap[role].length > 0, `Missing mapping: ${role}`);
  for (const name of Object.values(m.classMap)) requireValue(typeof name === 'string' && name.length > 0, 'Invalid mapping');
  const root = dirname(manifestPath), session = m.snapshots[0].inspectorSessionId;
  requireValue(typeof session === 'string' && session.length > 0 &&
    m.snapshots.every(s => s.inspectorSessionId === session), 'Inspector session mismatch: cross-session ID comparison refused');
  for (const asset of m.assets) {
    requireValue(typeof asset.path === 'string' && /^[a-f0-9]{64}$/.test(asset.sha256), 'Invalid asset hash');
    requireValue(digest(await readFile(resolve(root, asset.path))) === asset.sha256, `Asset hash mismatch: ${asset.path}`);
  }
  const snapshots = [], comparisons = [];
  let previous;
  for (const entry of m.snapshots) {
    requireValue(typeof entry.path === 'string' && typeof entry.phase === 'string' && entry.phase.length > 0, 'Invalid snapshot entry');
    const text = await readFile(resolve(root, entry.path));
    const current = summarize(JSON.parse(text), m.classMap);
    snapshots.push({ ...entry, sha256: digest(text), ...current.summary });
    if (previous) {
      // Inspector/target가 같아도 전체 탐색 후에는 힙 ID가 재사용될 수 있다.
      for (const [id, record] of current.records) if (previous.records.has(id))
        requireValue(previous.records.get(id).name === record.name,
          `Heap identity mismatch at ID ${id}: class changed; ID comparison refused`);
      comparisons.push({ beforePhase: previous.phase, afterPhase: entry.phase,
        addedIds: [...current.ids].filter(id => !previous.ids.has(id)), removedIds: [...previous.ids].filter(id => !current.ids.has(id)) });
    }
    previous = { phase: entry.phase, ids: current.ids, records: current.records };
  }
  for (const name of Object.values(m.classMap)) requireValue(snapshots.some(s => Object.hasOwn(s.rawClassCounts, name)), `Class mapping not observed: ${name}`);
  // 총량과 클래스 개수만으로 모든 제품 자원의 회수를 증명할 수 없다.
  const result = { schemaVersion: 1, status: 'INCOMPLETE', head: m.head, browserVersion: m.browserVersion,
    kind: m.kind, inspectorSessionId: session, manifestSha256: digest(manifestText), snapshots, comparisons,
    missingObservations: ['Native DOM/listeners', 'Product-owned retainer/source attribution', 'Long-run acceptance'] };
  requireValue(outputPath !== manifestPath && ![...m.assets, ...m.snapshots].some(e => resolve(root, e.path) === outputPath), 'Output must not overwrite input');
  // 기존 파일·심볼릭 링크·하드 링크를 덮어쓰지 않고 새 증거만 생성한다.
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
