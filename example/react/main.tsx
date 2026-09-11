import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SortableArea, SortableRoot } from '../../src/react.js';
import type { AfterDragResult, FrameworkSortableChange } from '../../src/core.js';

type Item = { id: string };
const nestedParent = new URLSearchParams(location.search).has('nested-parent')
  ? { areaId: 'todo', itemId: 'a' } : undefined;
const initial = { todo: [{ id: 'a' }, { id: 'b' }], done: [{ id: 'c' }, { id: 'd' }] };
let controls: Record<string, () => void> = {};
let inspect = () => ({ areas: { todo: [] as string[], done: [] as string[] }, events: [] as string[], lastOperation: null as { operation: string; sourceAreaId: string; destinationAreaId: string; itemId: string; destinationIndex: number } | null, resources: { activeSessions: 0, placeholders: 0 } });

function Fixture() {
  const [areas, setAreas] = useState(initial); const [events, setEvents] = useState<string[]>([]); const [rejectDone, setRejectDone] = useState(false); const [todoDisabled, setTodoDisabled] = useState(false); const [showTodo, setShowTodo] = useState(true); const [showDone, setShowDone] = useState(true); const [showRoot, setShowRoot] = useState(true); const [commitChanges, setCommitChanges] = useState(true); const [throwOnChange, setThrowOnChange] = useState(false); const [todoDirection, setTodoDirection] = useState<'vertical' | 'horizontal'>('vertical'); const [doneDirection, setDoneDirection] = useState<'vertical' | 'horizontal'>('vertical'); const [doneThreshold, setDoneThreshold] = useState<number | undefined>(undefined); const [lastOperation, setLastOperation] = useState<ReturnType<typeof inspect>['lastOperation']>(null);
  const log = (value: string) => setEvents((current) => [...current, value]);
  const onChange = (change: FrameworkSortableChange<Item>) => { setLastOperation({ operation: change.operation, sourceAreaId: change.source.areaId, destinationAreaId: change.destination.areaId, itemId: String(change.itemId), destinationIndex: change.destination.index }); if (commitChanges) for (const update of change.updates) setAreas((current) => ({ ...current, [update.areaId]: [...update.items] })); log('change'); if (throwOnChange) throw new Error('fixture change error'); };
  const onAfterDrag = (result: AfterDragResult) => log(`after:${result.status}:${result.reason}`);
  useEffect(() => {
    document.querySelector('[data-comins-sortable-area="todo"]')?.classList.toggle('horizontal', todoDirection === 'horizontal');
    const doneArea = document.querySelector('[data-comins-sortable-area="done"]');
    doneArea?.classList.toggle('horizontal', doneDirection === 'horizontal');
    doneArea?.classList.toggle('zero-primary-axis', doneDirection === 'horizontal' && doneThreshold !== undefined);
    controls = {
      horizontal: () => setTodoDirection('horizontal'),
      emptyGeometry: () => { setDoneDirection('horizontal'); setDoneThreshold(32); setAreas((current) => ({ ...current, done: [] })); },
      scrollable: () => { const scroll = document.querySelector<HTMLElement>('[data-test-scroll]'); scroll?.classList.add('scrollable'); if (scroll?.querySelector('[data-test-scroll-spacer]') === null) { const spacer = document.createElement('div'); spacer.setAttribute('data-test-scroll-spacer', ''); scroll?.append(spacer); } scroll?.scrollTo({ top: 100 }); },
      outside: () => undefined,
      escape: () => undefined,
      'pointer-cancel': () => [0, 1].forEach((pointerId) => document.dispatchEvent(new PointerEvent('pointercancel', { pointerId, bubbles: true }))),
      blur: () => window.dispatchEvent(new Event('blur')),
      disabled: () => setTodoDisabled(true),
      reject: () => setRejectDone(true),
      unmount: () => setShowDone(false),
      destroy: () => setShowRoot(false),
      'callback-error': () => setThrowOnChange(true),
      'state-not-committed': () => setCommitChanges(false),
      remount: () => { setShowRoot(true); setShowTodo(true); setShowDone(true); setTodoDisabled(false); setCommitChanges(true); setThrowOnChange(false); setTodoDirection('vertical'); setDoneDirection('vertical'); setDoneThreshold(undefined); },
    };
    inspect = () => ({ areas: { todo: areas.todo.map((item) => item.id), done: areas.done.map((item) => item.id) }, events, lastOperation, resources: { activeSessions: document.querySelectorAll('[data-comins-sortable-dragging]').length, placeholders: document.querySelectorAll('[data-comins-sortable-placeholder]').length } });
  });
  return showRoot ? <SortableRoot<Item> onBeforeDragStart={() => { log('before'); }} onDragStart={() => log('start')} onDrag={() => log('drag')} onInsertDragArea={() => log('insert')} onChange={onChange} onAfterDrag={onAfterDrag}><div data-test-scroll=""><section data-area-section="todo"><h2>Todo</h2><div role="list">{showTodo && <SortableArea areaId="todo" group="fixture" items={areas.todo} itemKey="id" autoScroll direction={todoDirection} disabled={todoDisabled} onItemsChange={(items) => { if (commitChanges) setAreas((current) => ({ ...current, todo: [...items] })); }}>{(item) => <div tabIndex={0} role="listitem" data-sortable-id={item.id} aria-label={`Item ${item.id}`} aria-selected="false">{item.id}</div>}</SortableArea>}</div></section><section data-area-section="done"><h2>Done</h2><div role="list">{showDone && <SortableArea areaId="done" parent={nestedParent} group="fixture" items={areas.done} itemKey="id" autoScroll direction={doneDirection} emptyInsertThreshold={doneThreshold} accept={() => !rejectDone} onItemsChange={(items) => { if (commitChanges) setAreas((current) => ({ ...current, done: [...items] })); }}>{(item) => <div tabIndex={0} role="listitem" data-sortable-id={item.id} aria-label={`Item ${item.id}`} aria-selected="false">{item.id}</div>}</SortableArea>}</div></section></div><button type="button" aria-label="Clear done" onClick={() => setAreas((current) => ({ ...current, done: [] }))}>Clear done</button><output data-test-events="">{events.join(',')}</output></SortableRoot> : null;
}
const target = document.querySelector('#app'); if (target === null) throw new Error('Missing fixture root'); createRoot(target).render(<StrictMode><Fixture /></StrictMode>);
window.__sortableFixture = { state: () => inspect(), controls };
Object.defineProperty(window.__sortableFixture, 'controls', { get: () => controls });
