import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CDPSession, Page } from '@playwright/test';

export interface HeapSample {
  heapBytes: number;
  documents: number;
  nodes: number;
  jsEventListeners: number;
}

interface Snapshot {
  snapshot: { meta: {
    node_fields: string[]; node_types: Array<string[] | string>;
    edge_fields: string[]; edge_types: Array<string[] | string>;
  } };
  nodes: number[]; edges: number[]; strings: string[];
}

export interface MachineSummary {
  instances: number;
  histories: Array<{ entries: number; backingBytes: number }>;
}

export async function collectHeap(page: Page, cdp: CDPSession): Promise<HeapSample> {
  await cdp.send('HeapProfiler.collectGarbage');
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await cdp.send('HeapProfiler.collectGarbage');
  const [{ metrics }, dom] = await Promise.all([
    cdp.send('Performance.getMetrics') as Promise<{ metrics: Array<{ name: string; value: number }> }>,
    cdp.send('Memory.getDOMCounters') as Promise<Omit<HeapSample, 'heapBytes'>>,
  ]);
  const heap = metrics.find((m) => m.name === 'JSHeapUsedSize');
  if (heap === undefined) throw new Error('Heap measurement unavailable');
  return { heapBytes: heap.value, ...dom };
}

// 표준 JSON metadata를 사용한다. history가 없어도 살아 있는 instance는 반드시 센다.
export function summarizeMachines(heap: Snapshot): MachineSummary {
  const meta = heap.snapshot.meta;
  const ns = meta.node_fields.length; const es = meta.edge_fields.length;
  const field = (fields: string[], key: string): number => {
    const index = fields.indexOf(key);
    if (index < 0) throw new Error('Heap schema unavailable');
    return index;
  };
  const name = field(meta.node_fields, 'name'); const type = field(meta.node_fields, 'type');
  const count = field(meta.node_fields, 'edge_count'); const size = field(meta.node_fields, 'self_size');
  const edgeType = field(meta.edge_fields, 'type'); const edgeName = field(meta.edge_fields, 'name_or_index');
  const target = field(meta.edge_fields, 'to_node');
  const nodeTypes = meta.node_types[0] as string[]; const edgeTypes = meta.edge_types[0] as string[];
  const offsets = new Map<number, number>(); let cursor = 0;
  for (let n = 0; n < heap.nodes.length; n += ns) {
    offsets.set(n, cursor); cursor += heap.nodes[n + count]! * es;
  }
  const edges = (n: number): Array<{ type: string; name: string | undefined; to: number }> => {
    const start = offsets.get(n);
    if (start === undefined) throw new Error('Heap node unavailable');
    return Array.from({ length: heap.nodes[n + count]! }, (_, i) => {
      const e = start + i * es; const kind = edgeTypes[heap.edges[e + edgeType]!]!;
      return { type: kind, name: kind === 'element' ? undefined : heap.strings[heap.edges[e + edgeName]!], to: heap.edges[e + target]! };
    });
  };
  const result: MachineSummary = { instances: 0, histories: [] };
  for (let n = 0; n < heap.nodes.length; n += ns) {
    if (nodeTypes[heap.nodes[n + type]!] !== 'object' || heap.strings[heap.nodes[n + name]!] !== 'SessionMachine') continue;
    result.instances++;
    const history = edges(n).find((e) => e.type === 'property' && e.name === 'history');
    if (history === undefined) continue;
    const array = edges(history.to); const backing = array.find((e) => e.type === 'internal' && e.name === 'elements');
    result.histories.push({ entries: array.filter((e) => e.type === 'element').length, backingBytes: backing === undefined ? 0 : heap.nodes[backing.to + size]! });
  }
  return result;
}

export async function snapshotMachines(cdp: CDPSession, directory: string, label: string): Promise<MachineSummary> {
  await mkdir(directory, { recursive: true });
  const chunks: string[] = [];
  const add = ({ chunk }: { chunk: string }): void => { chunks.push(chunk); };
  cdp.on('HeapProfiler.addHeapSnapshotChunk', add);
  try { await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false }); }
  finally { cdp.off('HeapProfiler.addHeapSnapshotChunk', add); }
  const json = chunks.join('');
  await writeFile(join(directory, `${label}.heapsnapshot`), json);
  return summarizeMachines(JSON.parse(json) as Snapshot);
}
