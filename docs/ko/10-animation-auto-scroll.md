# 애니메이션과 자동 스크롤

`animation`에 duration 또는 option object를 지정합니다.

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

애니메이션은 제어 상태 update와 drag commit의 layout delta를 FLIP으로 처리합니다.
비활성화하려면 `animation={false}`를 사용합니다. reduced-motion 환경에서는 option이
있어도 이동 애니메이션을 실행하지 않습니다.

`autoScroll`은 가장 가까운 scroll 가능 컨테이너를 먼저 이동하고 없으면 window를
사용합니다. pointer가 edge 근처에 있는 동안 계속 실행되며 drop, cancel, blur,
unmount 또는 destroy에서 중지합니다. 컨테이너에 실제 overflow와 제한된 크기가
있어야 하며 option이 scroll CSS를 생성하지는 않습니다.

가로 목록은 `direction="horizontal"`을 사용합니다. `auto`는 측정된 item center로
방향을 결정합니다.

Playground: <http://127.0.0.1:4003/examples/transition/react> 아래의
`transition`, `transitions`, `auto-scroll` 경로를 확인합니다.
