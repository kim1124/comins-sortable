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
  dragHandle,
  type DemoDragMode,
  copyDemoItem,
  demoModel,
  demoTreeArea,
  treeChildAreaId,
  reverseDemoChildren,
  type DemoTreeNode,
  hasSecondArea,
  isCopyExample,
  isNestedExample,
  placeholderForExample,
  playgroundOperation,
  updateDemoTreeArea,
  type DemoItem,
  type DemoState,
} from './demo-data.js';
import source from './react.tsx?raw';
import { waitForAdapterReady } from './adapter-ready.js';

interface DemoCommands {
  setLocale(locale: 'ko' | 'en'): void;
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
  children,
  ...itemProps
}: {
  item: DemoItem;
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
      <button type="button" className="cs-demo-handle" aria-label={`Drag ${item.title}`}>⠿</button>
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
  const [dragMode, setDragMode] = useState<DemoDragMode>('handle');
  const [customFeedback, setCustomFeedback] = useState(true);
  const [swapThreshold, setSwapThreshold] = useState(0.5);
  const [invertSwap, setInvertSwap] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);
  const [locale, setLocale] = useState(input.locale);
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
  const setItems = (areaId: string, items: readonly DemoItem[]): void => {
    setState((current) => input.exampleId === 'tree' && areaId !== 'done'
      ? updateDemoTreeArea(current, areaId, items)
      : { ...current, [areaId]: [...items] });
  };
  const event = (name: string, result?: AfterDragResult): void => {
    bridge.publishEvent({ name, status: result?.status, reason: result?.reason });
  };

  useEffect(() => {
    bridge.publishModel(demoModel(state, secondArea));
  }, [bridge, secondArea, state]);

  useEffect(() => {
    expose({
      setLocale,
      dispatch(controlId, value) {
        if (controlId === 'drag-start' && (value === 'handle' || value === 'title' || value === 'card')) setDragMode(value);
        if (controlId === 'custom-feedback' && typeof value === 'boolean') setCustomFeedback(value);
        if (controlId === 'accept-destination' && typeof value === 'boolean') setAllowed(value);
        if (controlId === 'reverse-items') setState((current) => ({ ...current, todo: [...current.todo].reverse() }));
        if (controlId === 'reverse-child') setState((current) => (reverseDemoChildren(current)));
        if (controlId === 'swap-threshold' && typeof value === 'number') setSwapThreshold(value);
        if (controlId === 'invert-swap' && typeof value === 'boolean') setInvertSwap(value);
      },
      reset() {
        copySequence.current = 0;
        setAllowed(true);
        setDragMode('handle');
        setCustomFeedback(true);
        setSwapThreshold(0.5);
        setInvertSwap(false);
        setState(createDemoState(input.exampleId));
        setResetRevision((revision) => revision + 1);
        bridge.publishOperation(null);
      },
    });
    return () => expose(null);
  }, [bridge, expose, input.exampleId]);

  const animation = input.exampleId === 'transition' ? 180 : false;
  const itemCard = (item: DemoItem, nested = false): ReactElement => (
    <ItemCard item={item}>
      {nested && item.id === 'research' ? childArea() : undefined}
    </ItemCard>
  );
  function childArea(): ReactElement {
    const treeArea = input.exampleId === 'tree' ? demoTreeArea(state, 'child') : null;
    return (
      <div className="cs-demo-nested-shell">
        <strong>Research {locale === 'ko' ? '하위 항목' : 'children'}</strong>
        <SortableArea
          as={input.exampleId === 'functional-third-party' ? ComponentHost : 'div'}
          areaProps={{ className: 'cs-demo-list cs-demo-list--nested', role: 'list', 'data-demo-area': 'child' } as HTMLAttributes<HTMLElement>}
          areaId="child"
          group="playground"
          parent={treeArea?.parent ?? { areaId: 'todo', itemId: 'research' }}
          items={treeArea?.items ?? state.child}
          itemKey="id" handle={dragHandle(dragMode)}
          animation={160}
          onItemsChange={(items) => setItems('child', items)}
        >
          {(item) => <ItemCard item={item} />}
        </SortableArea>
      </div>
    );
  }

  function treeArea(areaId: string): ReactElement {
    const current = demoTreeArea(state, areaId);
    return (
      <SortableArea<DemoTreeNode>
        areaId={areaId} group="playground" parent={current.parent}
        items={current.items} itemKey="id" handle={dragHandle(dragMode)} onItemsChange={(items) => setItems(areaId, items)}
        areaProps={{ className: 'cs-demo-list cs-demo-tree-list', role: 'list', 'data-demo-area': areaId } as HTMLAttributes<HTMLElement>}
      >
        {(item) => <ItemCard item={item}>
          {item.acceptsChildren && <div className="cs-demo-nested-shell">
            <strong>{item.title} {locale === 'ko' ? '하위 항목' : 'children'}</strong>
            {treeArea(treeChildAreaId(item))}
          </div>}
        </ItemCard>}
      </SortableArea>
    );
  }

  const area = (areaId: 'todo' | 'done', items: readonly DemoItem[]): ReactElement => (
    <section className="cs-demo-column" data-demo-column={areaId}>
      <header><div><strong>{areaId === 'todo' ? (locale === 'ko' ? '진행할 작업' : 'To do') : (locale === 'ko' ? '완료' : 'Done')}</strong><small>{items.length} items</small></div></header>
      <div role="list" className="cs-demo-list-shell">
        <SortableArea
          as={input.exampleId === 'third-party' || input.exampleId === 'functional-third-party' ? ComponentHost : 'div'}
          areaProps={{ className: `cs-demo-list${(input.exampleId === 'grid' || input.exampleId === 'swap-grid') ? ' cs-demo-list--grid' : ''}`, role: 'list', 'data-demo-area': areaId } as HTMLAttributes<HTMLElement>}
          areaId={areaId}
          group={areaId === 'todo' ? todoGroup : 'playground'}
          items={items}
          itemKey="id" handle={dragHandle(dragMode)}
          autoScroll={input.exampleId === 'auto-scroll'}
          animation={animation}
          placeholder={placeholderForExample(input.exampleId)}
          header={input.exampleId === 'header-slot' || input.exampleId === 'two-list-slots'
            ? <div className="cs-demo-slot" data-demo-slot="header">Pinned header</div>
            : undefined}
          footer={input.exampleId === 'footer-slot' || input.exampleId === 'two-list-slots'
            ? <div className="cs-demo-slot" data-demo-slot="footer">Pinned footer</div>
            : undefined}
          emptyInsertThreshold={areaId === 'done' && input.exampleId === 'empty' ? 42 : undefined}
          direction={(input.exampleId === 'grid' || input.exampleId === 'swap-grid') ? 'grid' : undefined}
          swapThreshold={input.exampleId === 'thresholds' ? swapThreshold : undefined}
          invertSwap={input.exampleId === 'thresholds' ? invertSwap : undefined}
          swap={(input.exampleId === 'swap' || input.exampleId === 'swap-grid')}
          multiDrag={input.exampleId === 'transitions'}
          selectedClass={input.exampleId === 'transitions' ? 'cs-demo-card--selected' : undefined}
          accept={areaId === 'done' && (input.exampleId === 'accept' || input.exampleId === 'custom-placeholder') ? () => allowed : undefined}
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

  const onChange = (change: FrameworkSortableChange<DemoItem>): void => {
    event('change');
    bridge.publishOperation(playgroundOperation(change));
  };

  return (
    <SortableRoot<DemoItem>
      key={resetRevision}
      onBeforeDragStart={() => event('beforeDragStart')}
      onDragStart={({ source, itemId }) => bridge.publishEvent({ name: 'dragStart', areaId: source.areaId, itemId: String(itemId) })}
      onInsertDragArea={({ destination }) => bridge.publishEvent({ name: 'insertDragArea', areaId: destination.areaId })}
      onChange={onChange}
      onAfterDrag={(result) => event('afterDrag', result)}
    >
      <div data-drag-mode={dragMode} data-feedback-style={input.exampleId === 'custom-placeholder' && customFeedback ? 'custom' : 'default'} className={`cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}${isNestedExample(input.exampleId) ? ' cs-demo-board--nested' : ''}${(input.exampleId === 'grid' || input.exampleId === 'swap-grid') ? ' cs-demo-board--grid' : ''}`}>
        {input.exampleId === 'tree'
          ? <section className="cs-demo-column cs-demo-tree" data-demo-column="todo">{treeArea('todo')}</section>
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
      setLocale(locale) { commands?.setLocale(locale); },
      reset() { commands?.reset(); },
      destroy() { root.unmount(); },
    };
  },
};
