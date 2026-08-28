<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createSortableScope, sortable } from '../../../src/svelte.js';
  import type { AfterDragResult, FrameworkSortableChange } from '../../../src/core.js';
  import type { PlaygroundBridge, PlaygroundDemoInput } from '../playground/types.js';
  import { copyDemoItem, createDemoState, demoModel, demoTreeArea, hasSecondArea, isCopyExample, isNestedExample, placeholderForExample, playgroundOperation, updateDemoTreeArea, type DemoItem } from './demo-data.js';

  interface DemoCommands {
    dispatch(controlId: string, value?: string | number | boolean): void;
    reset(): void;
    destroyScope(): void;
  }

  export let input: PlaygroundDemoInput;
  export let bridge: PlaygroundBridge;
  export let commands: { current: DemoCommands | null };

  let state = createDemoState(input.exampleId);
  let allowed = true;
  let copySequence = 0;
  const secondArea = hasSecondArea(input.exampleId);
  const todoGroup = input.exampleId === 'clone' || input.exampleId === 'custom-clone'
    ? { name: 'playground', pull: 'copy' as const }
    : input.exampleId === 'modifier-copy'
      ? {
          name: 'playground',
          pull: (context: import('../../../src/core.js').DragContext) => (
            context.pointer.altKey ? 'copy' as const : 'move' as const
          ),
        }
      : 'playground';
  const event = (name: string, result?: AfterDragResult) => {
    bridge.publishEvent({ name, status: result?.status, reason: result?.reason });
  };
  const scope = createSortableScope<DemoItem>({
    onBeforeDragStart: () => event('beforeDragStart'),
    onDragStart: () => event('dragStart'),
    onInsertDragArea: ({ destination }) => bridge.publishEvent({ name: 'insertDragArea', areaId: destination.areaId }),
    onChange: (change: FrameworkSortableChange<DemoItem>) => {
      event('change');
      bridge.publishOperation(playgroundOperation(change));
    },
    onAfterDrag: (result) => event('afterDrag', result),
  });

  const setItems = (areaId: 'todo' | 'done' | 'child', items: readonly DemoItem[]) => {
    state = input.exampleId === 'tree' && areaId !== 'done'
      ? updateDemoTreeArea(state, areaId, items)
      : { ...state, [areaId]: [...items] };
  };
  const reset = () => {
    copySequence = 0;
    allowed = true;
    state = createDemoState(input.exampleId);
    bridge.publishOperation(null);
  };

  commands.current = {
    dispatch(controlId, value) {
      if (controlId === 'accept-destination' && typeof value === 'boolean') allowed = value;
      if (controlId === 'reverse-items') state = { ...state, todo: [...state.todo].reverse() };
      if (controlId === 'reverse-child') state = { ...state, child: [...state.child].reverse() };
    },
    reset,
    destroyScope: () => scope.destroy(),
  };
  onDestroy(() => { commands.current = null; });

  $: bridge.publishModel(demoModel(state, secondArea));
  $: todoOptions = {
    scope,
    areaId: 'todo',
    group: todoGroup,
    items: input.exampleId === 'tree' ? demoTreeArea(state, 'todo').items : state.todo,
    itemKey: 'id' as const,
    handle: input.exampleId === 'handle' ? '.cs-demo-handle' : undefined,
    autoScroll: input.exampleId === 'auto-scroll',
    animation: input.exampleId === 'transition'
      ? 180
      : input.exampleId === 'transitions'
        ? { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }
        : false,
    placeholder: placeholderForExample(input.exampleId),
    item: input.exampleId === 'table'
      ? '.cs-demo-row'
      : input.exampleId === 'table-column'
        ? '.cs-demo-column-header'
        : '.cs-demo-card',
    copyItem: isCopyExample(input.exampleId)
      ? (item: DemoItem) => copyDemoItem(item, input.exampleId, ++copySequence)
      : undefined,
    onItemsChange: (items: readonly DemoItem[]) => setItems('todo', items),
  };
  $: doneOptions = {
    scope,
    areaId: 'done',
    group: 'playground',
    items: state.done,
    itemKey: 'id' as const,
    item: '.cs-demo-card',
    emptyInsertThreshold: input.exampleId === 'empty' ? 42 : undefined,
    accept: input.exampleId === 'accept' ? () => allowed : undefined,
    onItemsChange: (items: readonly DemoItem[]) => setItems('done', items),
  };
  $: childOptions = {
    scope,
    areaId: 'child',
    group: 'playground',
    parent: input.exampleId === 'tree'
      ? demoTreeArea(state, 'child').parent
      : { areaId: 'todo', itemId: 'research' },
    items: input.exampleId === 'tree' ? demoTreeArea(state, 'child').items : state.child,
    itemKey: 'id' as const,
    item: '.cs-demo-card',
    animation: 160,
    onItemsChange: (items: readonly DemoItem[]) => setItems('child', items),
  };
</script>

<div
  class:cs-demo-board--scroll={input.exampleId === 'auto-scroll'}
  class:cs-demo-board--nested={isNestedExample(input.exampleId)}
  class="cs-demo-board"
>
  {#if input.exampleId === 'table'}
    <table class="cs-demo-table" data-demo-column="todo">
      <thead><tr><th>Task</th><th>Detail</th></tr></thead>
      <tbody data-demo-area="todo" use:sortable={todoOptions}>
        {#each state.todo as item (item.id)}
          <tr class="cs-demo-row" data-sortable-id={item.id}><th scope="row">{item.title}</th><td>{item.detail}</td></tr>
        {/each}
      </tbody>
    </table>
  {:else if input.exampleId === 'table-column'}
    <table class="cs-demo-table" data-demo-column="todo">
      <thead>
        <tr data-demo-area="todo" use:sortable={todoOptions}>
          {#each state.todo as item (item.id)}
            <th class="cs-demo-column-header" data-sortable-id={item.id} scope="col">{item.title}</th>
          {/each}
        </tr>
      </thead>
      <tbody><tr>{#each state.todo as item (item.id)}<td>{item.detail}</td>{/each}</tr></tbody>
    </table>
  {:else}
  <section class="cs-demo-column" data-demo-column="todo">
    <header><div><strong>To do</strong><small>{state.todo.length} items</small></div></header>
    <div
      class="cs-demo-list"
      class:cs-demo-component-host={input.exampleId === 'third-party' || input.exampleId === 'functional-third-party'}
      data-demo-component-host={input.exampleId === 'third-party' || input.exampleId === 'functional-third-party' ? 'svelte' : undefined}
      data-demo-area="todo"
      role="list"
      use:sortable={todoOptions}
    >
      {#if input.exampleId === 'header-slot' || input.exampleId === 'two-list-slots'}
        <div class="cs-demo-slot" data-demo-slot="header">Pinned header</div>
      {/if}
      {#each state.todo as item (item.id)}
        <article class={`cs-demo-card cs-demo-card--${item.tone}`} data-sortable-id={item.id} role="listitem" tabindex="0">
          {#if input.exampleId === 'handle'}<button type="button" class="cs-demo-handle" aria-label={`Drag ${item.title}`}>⠿</button>{/if}
          <span class="cs-demo-card__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
          {#if isNestedExample(input.exampleId) && item.id === 'research'}
            <div class="cs-demo-nested-shell">
              <strong>Research children</strong>
              <div
                class="cs-demo-list cs-demo-list--nested"
                class:cs-demo-component-host={input.exampleId === 'functional-third-party'}
                data-demo-component-host={input.exampleId === 'functional-third-party' ? 'svelte' : undefined}
                data-demo-area="child"
                role="list"
                use:sortable={childOptions}
              >
                {#each state.child as child (child.id)}
                  <article class={`cs-demo-card cs-demo-card--${child.tone}`} data-sortable-id={child.id} role="listitem" tabindex="0">
                    <span class="cs-demo-card__copy"><strong>{child.title}</strong><small>{child.detail}</small></span>
                  </article>
                {/each}
              </div>
            </div>
          {/if}
        </article>
      {/each}
      {#if input.exampleId === 'footer-slot' || input.exampleId === 'two-list-slots'}
        <div class="cs-demo-slot" data-demo-slot="footer">Pinned footer</div>
      {/if}
    </div>
  </section>
  {/if}
  {#if secondArea}
    <section class="cs-demo-column" data-demo-column="done">
      <header><div><strong>Done</strong><small>{state.done.length} items</small></div></header>
      <div class="cs-demo-list" data-demo-area="done" role="list" use:sortable={doneOptions}>
        {#if input.exampleId === 'two-list-slots'}<div class="cs-demo-slot" data-demo-slot="header">Pinned header</div>{/if}
        {#each state.done as item (item.id)}
          <article class={`cs-demo-card cs-demo-card--${item.tone}`} data-sortable-id={item.id} role="listitem" tabindex="0">
            <span class="cs-demo-card__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
          </article>
        {/each}
        {#if input.exampleId === 'two-list-slots'}<div class="cs-demo-slot" data-demo-slot="footer">Pinned footer</div>{/if}
      </div>
    </section>
  {/if}
</div>
