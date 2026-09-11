<script lang="ts">
  import { sortable, type SvelteSortableScope } from '../../../src/svelte.js';
  import { demoTreeArea, treeChildAreaId, type DemoItem, type DemoState } from './demo-data.js';
  export let scope: SvelteSortableScope<DemoItem>;
  export let state: DemoState;
  export let areaId: string;
  export let locale: 'ko' | 'en';
  export let onItemsChange: (areaId: string, items: readonly DemoItem[]) => void;
  $: area = demoTreeArea(state, areaId);
  $: options = {
    scope, areaId, group: 'playground', parent: area.parent,
    items: area.items, itemKey: 'id' as const, handle: '.cs-demo-handle', item: '.cs-demo-card',
    onItemsChange: (items: readonly DemoItem[]) => onItemsChange(areaId, items),
  };
</script>

<div class="cs-demo-list cs-demo-tree-list" data-demo-area={areaId} role="list" use:sortable={options}>
  {#each area.items as item (item.id)}
    <article class={`cs-demo-card cs-demo-card--${item.tone}`} data-sortable-id={item.id} role="listitem" tabindex="0">
      <button type="button" class="cs-demo-handle" aria-label={`Drag ${item.title}`}>⠿</button>
      <span class="cs-demo-card__copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
      {#if item.acceptsChildren}
        <div class="cs-demo-nested-shell">
          <strong>{item.title} {locale === 'ko' ? '하위 항목' : 'children'}</strong>
          <svelte:self {scope} {state} areaId={treeChildAreaId(item)} {locale} {onItemsChange} />
        </div>
      {/if}
    </article>
  {/each}
</div>
