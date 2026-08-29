# Placeholder Styling

Every area supports consumer classes and an optional visual preset.

```tsx
import 'comins-sortable/styles.css';

<SortableArea
  areaId="tasks"
  items={items}
  itemKey="id"
  placeholder={{
    className: 'project-drop-placeholder',
    preset: 'skeleton',
  }}
  onItemsChange={(next) => setItems([...next])}
>
  {(item) => <div>{item.label}</div>}
</SortableArea>
```

`className` is added beside the stable `comins-sortable__placeholder` class.
The `skeleton` preset is drag feedback, not an application loading state. It
needs the public stylesheet and disables its animation for reduced motion.

Override consumer classes or the public variables:

```css
.project-drop-placeholder {
  --comins-sortable-placeholder-background: #f3f7f5;
  --comins-sortable-placeholder-border: #176343;
  --comins-sortable-placeholder-border-radius: 8px;
  --comins-sortable-placeholder-opacity: 0.9;
  --comins-sortable-placeholder-skeleton-base: #e4ebe7;
  --comins-sortable-placeholder-skeleton-highlight: #f8faf9;
  --comins-sortable-placeholder-skeleton-duration: 1.2s;
}
```

The placeholder does not copy consumer item data. It is removed on every drop,
cancel, error, unmount, or destroy path.

Playground:

- <http://127.0.0.1:4003/examples/custom-placeholder/react>
- <http://127.0.0.1:4003/examples/skeleton-placeholder/react>
