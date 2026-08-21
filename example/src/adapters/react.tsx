import {
  StrictMode,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { createRoot } from 'react-dom/client';

import { SortableArea, SortableRoot } from '../../../src/react.js';
import type {
  AfterDragResult,
  FrameworkSortableChange,
} from '../../../src/core.js';
import type {
  PlaygroundBridge,
  PlaygroundDemoInput,
  PlaygroundDemoModule,
} from '../playground/types.js';
import {
  createDemoState,
  copyDemoItem,
  demoModel,
  hasSecondArea,
  isCopyExample,
  playgroundOperation,
  type DemoItem,
  type DemoState,
} from './demo-data.js';
import source from './react.tsx?raw';
import { waitForAdapterReady } from './adapter-ready.js';

interface DemoCommands {
  dispatch(controlId: string, value?: string | number | boolean): void;
  reset(): void;
}

function ItemCard({ item, withHandle }: { item: DemoItem; withHandle: boolean }): ReactElement {
  return (
    <article
      className={`cs-demo-card cs-demo-card--${item.tone}`}
      data-sortable-id={item.id}
      role="listitem"
      tabIndex={0}
    >
      {withHandle && <button type="button" className="cs-demo-handle" aria-label={`Drag ${item.title}`}>⠿</button>}
      <span className="cs-demo-card__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
    </article>
  );
}

function Demo({
  input,
  bridge,
  expose,
}: {
  input: PlaygroundDemoInput;
  bridge: PlaygroundBridge;
  expose(commands: DemoCommands | null): void;
}): ReactElement {
  const [state, setState] = useState<DemoState>(() => createDemoState(input.exampleId));
  const [allowed, setAllowed] = useState(true);
  const copySequence = useRef(0);
  const secondArea = hasSecondArea(input.exampleId);
  const todoGroup = useMemo(() => (
    input.exampleId === 'clone' || input.exampleId === 'custom-clone'
      ? { name: 'playground', pull: 'copy' as const }
      : input.exampleId === 'modifier-copy'
        ? {
            name: 'playground',
            pull: (context: import('../../../src/core.js').DragContext) => (
              context.pointer.altKey ? 'copy' as const : 'move' as const
            ),
          }
        : 'playground'
  ), [input.exampleId]);
  const setItems = (areaId: 'todo' | 'done', items: readonly DemoItem[]): void => {
    setState((current) => ({ ...current, [areaId]: [...items] }));
  };
  const event = (name: string, result?: AfterDragResult): void => {
    bridge.publishEvent({ name, status: result?.status, reason: result?.reason });
  };

  useEffect(() => {
    bridge.publishModel(demoModel(state, secondArea));
  }, [bridge, secondArea, state]);

  useEffect(() => {
    expose({
      dispatch(controlId, value) {
        if (controlId === 'accept-destination' && typeof value === 'boolean') setAllowed(value);
      },
      reset() {
        copySequence.current = 0;
        setAllowed(true);
        setState(createDemoState(input.exampleId));
        bridge.publishOperation(null);
      },
    });
    return () => expose(null);
  }, [bridge, expose, input.exampleId]);

  const area = (areaId: 'todo' | 'done', items: readonly DemoItem[]): ReactElement => (
    <section className="cs-demo-column" data-demo-column={areaId}>
      <header><div><strong>{areaId === 'todo' ? 'To do' : 'Done'}</strong><small>{items.length} items</small></div></header>
      <div role="list" className="cs-demo-list-shell">
        <SortableArea
          areaId={areaId}
          group={areaId === 'todo' ? todoGroup : 'playground'}
          items={items}
          itemKey="id"
          handle={input.exampleId === 'handle' ? '.cs-demo-handle' : undefined}
          autoScroll={input.exampleId === 'auto-scroll'}
          emptyInsertThreshold={areaId === 'done' && input.exampleId === 'empty' ? 42 : undefined}
          accept={areaId === 'done' && input.exampleId === 'accept' ? () => allowed : undefined}
          copyItem={areaId === 'todo' && isCopyExample(input.exampleId)
            ? (item) => copyDemoItem(item, input.exampleId, ++copySequence.current)
            : undefined}
          onItemsChange={(nextItems) => setItems(areaId, nextItems)}
        >
          {(item) => <ItemCard item={item} withHandle={input.exampleId === 'handle'} />}
        </SortableArea>
      </div>
    </section>
  );

  const onChange = (change: FrameworkSortableChange<DemoItem>): void => {
    event('change');
    bridge.publishOperation(playgroundOperation(change));
  };

  return (
    <SortableRoot<DemoItem>
      onBeforeDragStart={() => event('beforeDragStart')}
      onDragStart={() => event('dragStart')}
      onInsertDragArea={({ destination }) => bridge.publishEvent({ name: 'insertDragArea', areaId: destination.areaId })}
      onChange={onChange}
      onAfterDrag={(result) => event('afterDrag', result)}
    >
      <div className={`cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}`}>
        {area('todo', state.todo)}
        {secondArea && area('done', state.done)}
      </div>
    </SortableRoot>
  );
}

export const reactDemoModule: PlaygroundDemoModule = {
  adapterId: 'react',
  source,
  async mount(container, input, bridge) {
    const root = createRoot(container);
    let commands: DemoCommands | null = null;
    const expose = (next: DemoCommands | null): void => { commands = next; };
    root.render(<StrictMode><Demo input={input} bridge={bridge} expose={expose} /></StrictMode>);
    await waitForAdapterReady();
    return {
      dispatch(controlId, value) { commands?.dispatch(controlId, value); },
      reset() { commands?.reset(); },
      destroy() { root.unmount(); },
    };
  },
};
