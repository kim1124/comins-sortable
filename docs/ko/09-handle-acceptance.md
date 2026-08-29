# 핸들과 수락 정책

selector로 drag activation을 제한하고 callback으로 destination을 제어합니다.

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
      <button className="drag-handle" aria-label={`${item.label} 이동`}>⠿</button>
      <span>{item.label}</span>
    </div>
  )}
</SortableArea>
```

명시적인 `handle`은 `ignore`보다 우선합니다. 접근 가능한 handle은 실제 button으로
구현하고 설명 가능한 label을 제공합니다. `activationDistance`는 작은 pointer
움직임이 즉시 drag로 시작되는 것을 방지합니다.

`accept(context)`는 destination 후보를 제어합니다. group의 `put`은 어떤 source
group이 들어올 수 있는지 제한합니다. `disabled`는 runtime에 source 또는
destination Area를 차단하며 해당 owner의 활성 drag도 취소합니다.

Playground:

- <http://127.0.0.1:4003/examples/handle/react>
- <http://127.0.0.1:4003/examples/accept/react>
