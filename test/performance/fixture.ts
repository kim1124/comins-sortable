import { createSortable } from '../../dist/index.js';
import type { BenchmarkConfig, BenchmarkPhase, FrameSample } from './types.js';

let instance: ReturnType<typeof createSortable> | null = null;
let config: BenchmarkConfig;
let phase: BenchmarkPhase = 'idle';
let frames: FrameSample[] = [];
let intervals: number[] = [];
let pointerEvents: Array<{ type: string; phase: BenchmarkPhase; ms: number }> = [];
let longTasks: number[] = [];
let idCalls = 0;
let rectCalls = 0;
let source: { areaId: string; itemId: string | number } | null = null;
let last: { status: string; reason: string } | null = null;
let errors: string[] = [];
// Window capture → window bubble includes synchronous Core pointer handling,
// including the pointerup release/commit path that a RAF observer cannot see.
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
  let started = 0;
  let current: BenchmarkPhase = 'idle';
  window.addEventListener(type, () => { started = performance.now(); current = phase; }, true);
  window.addEventListener(type, () => {
    if (current !== 'idle') pointerEvents.push({ type, phase: current, ms: performance.now() - started });
  });
}
const nativeFrame = window.requestAnimationFrame.bind(window);
const nativeRect = Element.prototype.getBoundingClientRect;
window.requestAnimationFrame = (callback) => nativeFrame((time) => {
  const current = phase;
  const start = performance.now();
  try { callback(time); } finally {
    if (current !== 'idle') frames.push({ phase: current, ms: performance.now() - start });
  }
});
Element.prototype.getBoundingClientRect = function () {
  if (phase !== 'idle') rectCalls++;
  return nativeRect.call(this);
};
let previousTime = 0;
function observeFrames(time: number): void {
  if (phase !== 'idle' && previousTime !== 0) intervals.push(time - previousTime);
  previousTime = time;
  nativeFrame(observeFrames);
}
nativeFrame(observeFrames);
new PerformanceObserver((list) => {
  if (phase !== 'idle') longTasks.push(...list.getEntries().map((entry) => entry.duration));
}).observe({ type: 'longtask', buffered: false });

export function destroy(): void {
  phase = 'idle';
  instance?.destroy();
  instance = null;
  document.querySelector('#root')!.replaceChildren();
  frames = []; intervals = []; longTasks = []; pointerEvents = [];
}
export function mount(next: BenchmarkConfig): void {
  destroy();
  config = next;
  const elements: HTMLElement[] = [];
  for (let a = 0; a < config.areaCount; a++) {
    const area = document.createElement('div');
    area.className = 'area'; area.dataset.area = String(a);
    const header = document.createElement('header'); header.textContent = 'Pinned header';
    const footer = document.createElement('footer'); footer.textContent = 'Pinned footer';
    area.append(header);
    for (let i = a; i < config.itemCount; i += config.areaCount) {
      const item = document.createElement('div'); item.className = 'item'; item.dataset.id = String(i);
      const button = document.createElement('button'); button.className = 'handle'; button.textContent = 'Move';
      const label = document.createElement('span'); label.textContent = `Item ${i}`;
      item.append(button, label); area.append(item);
    }
    area.append(footer); document.querySelector('#root')!.append(area); elements.push(area);
  }
  const options = (a: number) => ({
    areaId: String(a), group: 'bench', item: '.item', handle: '.handle',
    autoScroll: config.autoScroll, animation: config.animation ? 150 : false as const,
    getItemId: (element: Element) => { idCalls++; return (element as HTMLElement).dataset.id!; },
  });
  instance = createSortable(elements[0]!, {
    ...options(0),
    onDragStart: (ctx) => { source = { areaId: ctx.source.areaId, itemId: ctx.itemId }; },
    onAfterDrag: (result) => { last = { status: result.status, reason: result.reason }; },
    onError: (error) => { errors.push(String(error)); },
  });
  elements.slice(1).forEach((element, i) => instance!.registerArea(element, options(i + 1)));
}
export function reset(): void { mount(config); }
export function start(): void {
  frames = []; intervals = []; longTasks = []; pointerEvents = []; idCalls = 0; rectCalls = 0;
  source = null; last = null; errors = []; phase = 'activation';
}
export function setPhase(next: BenchmarkPhase): void { phase = next; }
export function readState() {
  return { source, last, frames, pointerEvents, intervals, longTasks, idCalls, rectCalls, errors,
    ids: [...document.querySelectorAll('.area')].map((area) => [...area.querySelectorAll<HTMLElement>(':scope > .item')].map((item) => item.dataset.id!)),
  };
}

export function settle(): Promise<void> {
  return new Promise((resolve) => nativeFrame(() => nativeFrame(() => resolve())));
}
