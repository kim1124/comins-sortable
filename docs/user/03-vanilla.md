# Vanilla JavaScript Adapter

Use `createSortable` from the package root when the DOM is the sortable view.

```html
<ul id="tasks">
  <li data-sortable-id="task-1">Plan</li>
  <li data-sortable-id="task-2">Build</li>
</ul>
```

```ts
import { createSortable } from 'comins-sortable';

const sortable = createSortable('#tasks', {
  areaId: 'tasks',
  item: ':scope > [data-sortable-id]',
  onChange(change) {
    console.log(change.operation, change.orders);
  },
  onError(error) {
    console.error(error);
  },
});

// On page or component disposal:
sortable.destroy();
```

`createSortable` moves the DOM before its next-frame verification. Use
`onChange` to update any application model that also stores the order. Item IDs
default to `data-sortable-id`; provide `getItemId` for another identity source.

Register another area in the same scope with `sortable.registerArea(element,
options)`. Keep the returned unregister function and call it before removing
that area. `destroy()` cancels an active drag and releases the entire scope.

Playground: <http://127.0.0.1:4003/examples/simple/vanilla>
