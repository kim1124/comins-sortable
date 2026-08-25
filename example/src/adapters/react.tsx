import {
  StrictMode,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
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
  isNestedExample,
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

const ComponentHost = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  function ComponentHost(props, ref) {
    return <section {...props} ref={ref} data-demo-component-host="react" />;
  },
);

function ItemCard({
  item,
  withHandle,
  children,
  ...itemProps
}: {
  item: DemoItem;
  withHandle: boolean;
  children?: ReactNode;
} & HTMLAttributes<HTMLElement>): ReactElement {
  return (
    <article
      {...itemProps}
      className={`cs-demo-card cs-demo-card--${item.tone}`}
      data-sortable-id={item.id}
      role="listitem"
      tabIndex={0}
    >
      {withHandle && <button type="button" className="cs-demo-handle" aria-label={`Drag ${item.title}`}>⠿</button>}
      <span className="cs-demo-card__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
      {children}
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
  const setItems = (areaId: 'todo' | 'done' | 'child', items: readonly DemoItem[]): void => {
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
        if (controlId === 'reverse-items') setState((current) => ({ ...current, todo: [...current.todo].reverse() }));
        if (controlId === 'reverse-child') setState((current) => ({ ...current, child: [...current.child].reverse() }));
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

  const animation = input.exampleId === 'transition'
    ? 180
    : input.exampleId === 'transitions'
      ? { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }
      : false;
  const itemCard = (item: DemoItem, nested = false): ReactElement => (
    <ItemCard item={item} withHandle={input.exampleId === 'handle'}>
      {nested && item.id === 'research' ? childArea() : undefined}
    </ItemCard>
  );
  function childArea(): ReactElement {
    return (
      <div className="cs-demo-nested-shell">
        <strong>Research children</strong>
        <SortableArea
          as={input.exampleId === 'functional-third-party' ? ComponentHost : 'div'}
          areaProps={{ className: 'cs-demo-list cs-demo-list--nested', role: 'list', 'data-demo-area': 'child' } as HTMLAttributes<HTMLElement>}
          areaId="child"
          group="playground"
          parent={{ areaId: 'todo', itemId: 'research' }}
          items={state.child}
          itemKey="id"
          animation={160}
          onItemsChange={(items) => setItems('child', items)}
        >
          {(item) => <ItemCard item={item} withHandle={false} />}
        </SortableArea>
      </div>
    );
  }

  const area = (areaId: 'todo' | 'done', items: readonly DemoItem[]): ReactElement => (
    <section className="cs-demo-column" data-demo-column={areaId}>
      <header><div><strong>{areaId === 'todo' ? 'To do' : 'Done'}</strong><small>{items.length} items</small></div></header>
      <div role="list" className="cs-demo-list-shell">
        <SortableArea
          as={input.exampleId === 'third-party' || input.exampleId === 'functional-third-party' ? ComponentHost : 'div'}
          areaProps={{ className: 'cs-demo-list', role: 'list', 'data-demo-area': areaId } as HTMLAttributes<HTMLElement>}
          areaId={areaId}
          group={areaId === 'todo' ? todoGroup : 'playground'}
          items={items}
          itemKey="id"
          handle={input.exampleId === 'handle' ? '.cs-demo-handle' : undefined}
          autoScroll={input.exampleId === 'auto-scroll'}
          animation={animation}
          header={input.exampleId === 'header-slot' || input.exampleId === 'two-list-slots'
            ? <div className="cs-demo-slot" data-demo-slot="header">Pinned header</div>
            : undefined}
          footer={input.exampleId === 'footer-slot' || input.exampleId === 'two-list-slots'
            ? <div className="cs-demo-slot" data-demo-slot="footer">Pinned footer</div>
            : undefined}
          emptyInsertThreshold={areaId === 'done' && input.exampleId === 'empty' ? 42 : undefined}
          accept={areaId === 'done' && input.exampleId === 'accept' ? () => allowed : undefined}
          copyItem={areaId === 'todo' && isCopyExample(input.exampleId)
            ? (item) => copyDemoItem(item, input.exampleId, ++copySequence.current)
            : undefined}
          onItemsChange={(nextItems) => setItems(areaId, nextItems)}
        >
          {(item) => itemCard(item, isNestedExample(input.exampleId) && areaId === 'todo')}
        </SortableArea>
      </div>
    </section>
  );

  const table = (): ReactElement => input.exampleId === 'table-column' ? (
    <table className="cs-demo-table" data-demo-column="todo">
      <thead>
        <SortableArea
          as="tr"
          areaProps={{ 'data-demo-area': 'todo' } as HTMLAttributes<HTMLElement>}
          areaId="todo"
          items={state.todo}
          itemKey="id"
          direction="horizontal"
          animation={160}
          onItemsChange={(items) => setItems('todo', items)}
        >
          {(item) => <th data-sortable-id={item.id} scope="col">{item.title}</th>}
        </SortableArea>
      </thead>
      <tbody><tr>{state.todo.map((item) => <td key={item.id}>{item.detail}</td>)}</tr></tbody>
    </table>
  ) : (
    <table className="cs-demo-table" data-demo-column="todo">
      <thead><tr><th>Task</th><th>Detail</th></tr></thead>
      <SortableArea
        as="tbody"
        areaProps={{ 'data-demo-area': 'todo' } as HTMLAttributes<HTMLElement>}
        areaId="todo"
        items={state.todo}
        itemKey="id"
        animation={160}
        onItemsChange={(items) => setItems('todo', items)}
      >
        {(item) => <tr data-sortable-id={item.id}><th scope="row">{item.title}</th><td>{item.detail}</td></tr>}
      </SortableArea>
    </table>
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
      <div className={`cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}${isNestedExample(input.exampleId) ? ' cs-demo-board--nested' : ''}`}>
        {input.exampleId === 'table' || input.exampleId === 'table-column'
          ? table()
          : area('todo', state.todo)}
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
