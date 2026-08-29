# Reorder and Transfer

One area reorders its controlled array. Areas with the same scope and `group`
can transfer an item.

```tsx
<SortableRoot<Item>>
  <SortableArea
    areaId="todo"
    group="tasks"
    items={todo}
    itemKey="id"
    onItemsChange={(next) => setTodo([...next])}
  >
    {(item) => <div>{item.label}</div>}
  </SortableArea>

  <SortableArea
    areaId="done"
    group="tasks"
    items={done}
    itemKey="id"
    emptyInsertThreshold={24}
    onItemsChange={(next) => setDone([...next])}
  >
    {(item) => <div>{item.label}</div>}
  </SortableArea>
</SortableRoot>
```

The transaction removes the item from the source and inserts it into the
destination before root `onChange` runs. Both arrays must render in the same
controlled update boundary.

`emptyInsertThreshold` expands the usable primary axis of an empty area.
`accept(context)` evaluates a destination once per pointer frame. Returning
`false`, setting `disabled`, dropping outside, or failing controlled commit
leaves the original order intact.

Playground:

- <http://127.0.0.1:4003/examples/simple/react>
- <http://127.0.0.1:4003/examples/two-lists/react>
- <http://127.0.0.1:4003/examples/empty/react>
- <http://127.0.0.1:4003/examples/accept/react>
