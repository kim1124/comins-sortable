<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createSortableScope, sortable } from '../../../src/svelte.js';
  import type { AfterDragResult, FrameworkSortableChange } from '../../../src/core.js';
  import type { PlaygroundBridge, PlaygroundDemoInput } from '../playground/types.js';
  import { createDemoState, demoModel, hasSecondArea, playgroundOperation, type DemoItem } from './demo-data.js';

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
  const secondArea = hasSecondArea(input.exampleId);
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

  const setItems = (areaId: 'todo' | 'done', items: readonly DemoItem[]) => {
    state = { ...state, [areaId]: [...items] };
  };
  const reset = () => {
    allowed = true;
    state = createDemoState(input.exampleId);
    bridge.publishOperation(null);
  };

  commands.current = {
    dispatch(controlId, value) {
      if (controlId === 'accept-destination' && typeof value === 'boolean') allowed = value;
    },
    reset,
    destroyScope: () => scope.destroy(),
  };
  onDestroy(() => { commands.current = null; });

  $: bridge.publishModel(demoModel(state, secondArea));
  $: todoOptions = {
    scope,
    areaId: 'todo',
    group: 'playground',
    items: state.todo,
    itemKey: 'id' as const,
    handle: input.exampleId === 'handle' ? '.cs-demo-handle' : undefined,
    autoScroll: input.exampleId === 'auto-scroll',
    onItemsChange: (items: readonly DemoItem[]) => setItems('todo', items),
  };
  $: doneOptions = {
    scope,
    areaId: 'done',
    group: 'playground',
    items: state.done,
    itemKey: 'id' as const,
    emptyInsertThreshold: input.exampleId === 'empty' ? 42 : undefined,
    accept: input.exampleId === 'accept' ? () => allowed : undefined,
    onItemsChange: (items: readonly DemoItem[]) => setItems('done', items),
  };
</script>

<div class:cs-demo-board--scroll={input.exampleId === 'auto-scroll'} class="cs-demo-board">
  <section class="cs-demo-column" data-demo-column="todo">
    <header><div><strong>To do</strong><small>{state.todo.length} items</small></div></header>
    <div class="cs-demo-list" data-demo-area="todo" role="list" use:sortable={todoOptions}>
      {#each state.todo as item (item.id)}
        <article class={`cs-demo-card cs-demo-card--${item.tone}`} data-sortable-id={item.id} role="listitem" tabindex="0">
          {#if input.exampleId === 'handle'}<button type="button" class="cs-demo-handle" aria-label={`Drag ${item.title}`}>⠿</button>{/if}
          <span class="cs-demo-card__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
        </article>
      {/each}
    </div>
  </section>
  {#if secondArea}
    <section class="cs-demo-column" data-demo-column="done">
      <header><div><strong>Done</strong><small>{state.done.length} items</small></div></header>
      <div class="cs-demo-list" data-demo-area="done" role="list" use:sortable={doneOptions}>
        {#each state.done as item (item.id)}
          <article class={`cs-demo-card cs-demo-card--${item.tone}`} data-sortable-id={item.id} role="listitem" tabindex="0">
            <span class="cs-demo-card__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
          </article>
        {/each}
      </div>
    </section>
  {/if}
</div>
