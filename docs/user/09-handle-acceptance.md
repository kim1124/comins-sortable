# Handle and Acceptance

Use selectors to control activation and callbacks to control destinations.

```tsx
<SortableArea
  areaId="tasks"
  items={items}
  itemKey="id"
  handle=".drag-handle"
  ignore="button, a, input, textarea, select"
  activationDistance={4}
  accept={(context) => context.source.areaId !== 'locked'}
  onItemsChange={(next) => setItems([...next])}
>
  {(item) => (
    <div>
      <button className="drag-handle" aria-label={`Drag ${item.label}`}>⠿</button>
      <span>{item.label}</span>
    </div>
  )}
</SortableArea>
```

An explicit `handle` takes precedence over `ignore`. Use a real button for an
accessible handle and provide a descriptive label. `activationDistance`
prevents small pointer movement from immediately starting a drag.

`accept(context)` controls a candidate destination. Group `put` controls which
source groups may enter. `disabled` blocks a source or destination area at
runtime and cancels an active owner drag.

Playground:

- <http://127.0.0.1:4003/examples/handle/react>
- <http://127.0.0.1:4003/examples/accept/react>
