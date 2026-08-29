# Animation and Auto-scroll

Set `animation` to a duration or an options object.

```tsx
<SortableArea
  areaId="tasks"
  items={items}
  itemKey="id"
  animation={{ duration: 180, easing: 'ease-out' }}
  autoScroll
  onItemsChange={(next) => setItems([...next])}
>
  {(item) => <div>{item.label}</div>}
</SortableArea>
```

Animation uses FLIP layout deltas for controlled updates and drag commits. Set
`animation={false}` to disable it. Reduced-motion preference disables movement
even when animation is configured.

`autoScroll` scrolls the nearest eligible container first and falls back to the
window. It continues while the pointer remains near an edge and stops on drop,
cancel, blur, unmount, or destroy. The container must have real overflow and a
bounded size; the option does not create scrollable CSS.

Use `direction="horizontal"` for horizontal lists. `auto` resolves direction
from measured item centers.

Playground: `transition`, `transitions`, and `auto-scroll` under
<http://127.0.0.1:4003/examples/transition/react>.
