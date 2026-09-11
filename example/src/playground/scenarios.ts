import type { PlaygroundExampleId } from '../app/navigation.js';
import type { PlaygroundScenario } from './types.js';

const resetControl = {
  id: 'reset',
  kind: 'button',
  label: { ko: '데이터 초기화', en: 'Reset data' },
} as const;

export const playgroundScenarios: readonly PlaygroundScenario[] = [
  {
    id: 'simple',
    title: { ko: '기본 정렬', en: 'Simple sorting' },
    description: {
      ko: '하나의 목록에서 항목 순서를 직접 변경합니다.',
      en: 'Reorder items within one controlled list.',
    },
    api: ['items', 'itemKey', 'onItemsChange'],
    controls: [resetControl],
  },
  {
    id: 'two-lists',
    title: { ko: '두 목록', en: 'Two lists' },
    description: {
      ko: '같은 그룹의 목록 사이에서 항목을 이동합니다.',
      en: 'Move controlled items between grouped lists.',
    },
    api: ['group', 'onChange', 'onItemsChange'],
    controls: [resetControl],
  },
  {
    id: 'clone',
    title: { ko: '복제', en: 'Clone' },
    description: {
      ko: '원본 목록을 유지하면서 대상 목록에 새 ID의 항목을 복제합니다.',
      en: 'Copy an item with a new ID while preserving the source list.',
    },
    api: ['group.pull', 'copyItem', 'copyElement'],
    controls: [resetControl],
  },
  {
    id: 'custom-clone',
    title: { ko: '사용자 정의 복제', en: 'Custom clone' },
    description: {
      ko: '복제 factory에서 새 항목의 표시 데이터와 ID를 함께 구성합니다.',
      en: 'Customize the copied item presentation and ID in the clone factory.',
    },
    api: ['copyItem', 'copyElement', 'itemKey'],
    controls: [resetControl],
  },
  {
    id: 'modifier-copy',
    title: { ko: '보조키 복제', en: 'Clone on control' },
    description: {
      ko: 'Alt/Option을 누른 드래그는 복제하고 일반 드래그는 이동합니다.',
      en: 'Hold Alt/Option to copy; drag normally to move.',
    },
    api: ['group.pull', 'pointer.altKey', 'copyItem'],
    controls: [resetControl],
  },
  {
    id: 'handle',
    title: { ko: '드래그 핸들', en: 'Drag handle' },
    description: {
      ko: '핸들로 항목을 이동한 뒤 본문을 선택하여 복사합니다. 본문 선택은 정렬을 시작하지 않습니다.',
      en: 'Move items using the handle, then select and copy their text without starting another drag.',
    },
    api: ['handle', 'ignore'],
    controls: [resetControl],
  },
  {
    id: 'transition',
    title: { ko: '단일 전환', en: 'Transition' },
    description: { ko: '제어 상태 갱신과 드래그 재배치를 FLIP 전환으로 연결합니다.', en: 'Animate controlled updates and drag layout changes with FLIP.' },
    api: ['animation', 'prefers-reduced-motion'],
    controls: [{ id: 'reverse-items', kind: 'button', label: { ko: '순서 뒤집기', en: 'Reverse items' } }, resetControl],
  },
  {
    id: 'transitions',
    title: { ko: '다중 선택 이동', en: 'Multi-drag' },
    description: { ko: 'macOS에서는 Command(⌘), Windows/Linux에서는 Ctrl과 핸들 클릭으로 개별 항목을 추가 선택하고 Shift와 핸들 클릭으로 연속 범위를 선택한 뒤, 선택 항목을 원래 순서 그대로 한꺼번에 이동합니다.', en: 'Use Command on macOS or Ctrl on Windows/Linux with handle clicks to toggle items, or Shift-click handles to select a range, then move the selected items together in their original order.' },
    api: ['multiDrag', 'selectedClass', 'change.itemIds'],
    controls: [resetControl],
  },
  {
    id: 'thresholds',
    title: { ko: '정렬 전환 기준', en: 'Sorting thresholds' },
    description: { ko: '드래그 중 대상 카드의 어느 지점을 넘어야 순서가 바뀌는지 조절합니다. 드래그를 시작하기 위한 이동 거리와는 다른 설정입니다.', en: 'Adjust how far into a target card the pointer must move before its order changes. This is separate from the distance needed to start dragging.' },
    api: ['swapThreshold', 'invertSwap'],
    controls: [
      { id: 'swap-threshold', kind: 'range', min: 0.1, max: 1, step: 0.1, defaultValue: 0.5, label: { ko: '전환 임계값', en: 'Swap threshold' } },
      { id: 'invert-swap', kind: 'toggle', label: { ko: '임계 영역 반전', en: 'Invert threshold' } },
      resetControl,
    ],
  },
  {
    id: 'swap',
    title: { ko: '스왑', en: 'Swap' },
    description: { ko: '삽입 정렬 대신 드래그한 항목과 대상 항목의 위치만 서로 교환합니다.', en: 'Exchange only the dragged and target item positions instead of insertion sorting.' },
    api: ['swap', 'change.swapItemId'],
    controls: [resetControl],
  },
  {
    id: 'grid',
    title: { ko: '그리드', en: 'Grid' },
    description: { ko: '2차원 그리드에서 행과 열의 실제 카드 위치를 기준으로 항목을 정렬합니다.', en: 'Sort a two-dimensional grid from the actual row and column positions of its cards.' },
    api: ['direction="grid"', 'grid collision'],
    controls: [resetControl],
  },
  {
    id: 'swap-grid',
    title: { ko: '스왑 그리드', en: 'Swap grid' },
    description: { ko: '카드를 다른 카드 위에 놓으면 두 카드의 위치만 교환합니다. 일반 그리드와 달리 나머지 카드의 순서는 유지됩니다.', en: 'Drop a card on another to exchange just their positions. Unlike insertion in the grid example, all other cards keep their positions.' },
    api: ['direction="grid"', 'swap', 'change.swapItemId'],
    controls: [resetControl],
  },
  {
    id: 'third-party',
    title: { ko: '사용자 컴포넌트 Host', en: 'Consumer component host' },
    description: {
      ko: 'SortableArea가 직접 div를 만들지 않고, 사용자가 만든 컴포넌트가 ref와 정렬 속성을 실제 section DOM에 전달합니다. 정렬 결과가 아니라 컴포넌트 통합 경계를 확인하는 예제입니다.',
      en: 'A consumer-owned component forwards the sortable ref and attributes to a real section instead of letting SortableArea create a div. This demonstrates the component integration boundary, not different sorting behavior.',
    },
    api: ['as', 'tag', 'componentProps'],
    controls: [resetControl],
  },
  {
    id: 'footer-slot',
    title: { ko: '하단 슬롯', en: 'Footer slot' },
    description: { ko: '같은 Host의 하단 슬롯은 목록에 남아 있지만 정렬 항목이나 드롭 위치가 아닙니다. 슬롯 위에서는 빨간색 거부 피드백을 표시합니다.', en: 'The footer remains inside the same host but is neither a sortable item nor a drop position. Hovering it shows rejected-drop feedback.' },
    api: ['footer', 'item selector'],
    controls: [resetControl],
  },
  {
    id: 'header-slot',
    title: { ko: '상단 슬롯', en: 'Header slot' },
    description: { ko: '같은 Host의 상단 슬롯은 목록에 남아 있지만 정렬 항목이나 드롭 위치가 아닙니다. 슬롯 위에서는 빨간색 거부 피드백을 표시합니다.', en: 'The header remains inside the same host but is neither a sortable item nor a drop position. Hovering it shows rejected-drop feedback.' },
    api: ['header', 'item selector'],
    controls: [resetControl],
  },
  {
    id: 'two-list-slots',
    title: { ko: '두 목록 슬롯', en: 'Two-list slots' },
    description: { ko: '두 목록 사이의 항목만 이동하며 각 목록의 상단·하단 슬롯은 고정됩니다. 슬롯은 드롭 위치가 아니므로 빨간색 거부 피드백을 표시합니다.', en: 'Only items transfer between the lists; each header and footer slot stays fixed and shows rejected-drop feedback because it is not a drop position.' },
    api: ['header', 'footer', 'group'],
    controls: [resetControl],
  },
  {
    id: 'nested',
    title: { ko: '중첩 목록', en: 'Nested lists' },
    description: { ko: '일반 이중 목록과 달리 Research 항목이 parent 관계로 자식 목록을 소유합니다. 항목은 계층 사이를 이동할 수 있지만 Research 자체를 자기 자식 목록으로 이동하면 순환 구조가 되므로 거부합니다.', en: 'Unlike two independent lists, the Research item owns its child list through parent metadata. Items can move across levels, while moving Research into its own child list is rejected as a cycle.' },
    api: ['parent', 'nested-cycle'],
    controls: [resetControl],
  },
  {
    id: 'nested-controlled',
    title: { ko: '제어형 중첩 상태', en: 'Nested controlled state' },
    description: { ko: '중첩 목록의 각 collection을 불변 상태 갱신으로 제어합니다.', en: 'Control every nested collection with immutable state updates.' },
    api: ['parent', 'onItemsChange', 'onChange'],
    controls: [{ id: 'reverse-child', kind: 'button', label: { ko: '자식 순서 뒤집기', en: 'Reverse children' } }, resetControl],
  },
  {
    id: 'functional-third-party',
    title: { ko: '함수형 컴포넌트 중첩', en: 'Functional third-party' },
    description: { ko: '사용자 host 컴포넌트와 중첩 정렬 계약을 함께 구성합니다.', en: 'Compose nested sorting with a consumer-owned functional host.' },
    api: ['as', 'tag', 'parent'],
    controls: [resetControl],
  },
  {
    id: 'empty',
    title: { ko: '빈 대상 목록', en: 'Empty destination' },
    description: {
      ko: '일반 이중 목록과 달리 대상 목록에 기준 항목이 하나도 없습니다. emptyInsertThreshold가 빈 Drop Zone의 감지 범위를 확보하고 첫 항목을 index 0에 삽입합니다.',
      en: 'Unlike a regular two-list example, the destination has no item midpoint to target. emptyInsertThreshold keeps the empty drop zone hittable and inserts the first item at index zero.',
    },
    api: ['emptyInsertThreshold', 'group'],
    controls: [resetControl],
  },
  {
    id: 'accept',
    title: { ko: '이동 허용과 거부', en: 'Accept and reject' },
    description: {
      ko: '실행 중 대상 목록의 수락 정책을 전환합니다.',
      en: 'Toggle the destination acceptance policy at runtime.',
    },
    api: ['accept', 'disabled'],
    controls: [
      {
        id: 'accept-destination',
        kind: 'toggle',
        label: { ko: '대상 이동 허용', en: 'Accept destination' },
      },
      resetControl,
    ],
  },
  {
    id: 'auto-scroll',
    title: { ko: '자동 스크롤', en: 'Auto scroll' },
    description: {
      ko: '스크롤 컨테이너 가장자리에서 드래그하면 화면이 자동 이동합니다.',
      en: 'Drag near a scroll edge to move the container automatically.',
    },
    api: ['autoScroll', 'direction'],
    controls: [resetControl],
  },
  {
    id: 'tree',
    title: { ko: '트리 데이터 정렬', en: 'Tree data sorting' },
    description: {
      ko: '중첩 목록의 영역을 따로 관리하는 대신 하나의 트리 데이터로 3단계 계층을 관리합니다. Review를 Design의 자식 영역으로 옮기면 Document와 Observe도 함께 이동합니다.',
      en: 'Manage three levels as one tree value instead of separate nested lists. Move Review into the children of Design to move Document and Observe with it.',
    },
    api: ['createSortableTree', 'getAreas', 'updateArea'],
    controls: [{ id: 'reverse-child', kind: 'button', label: { ko: '자식 순서 뒤집기', en: 'Reverse children' } }, resetControl],
  },
  {
    id: 'custom-placeholder',
    title: { ko: '커스텀 Placeholder', en: 'Custom placeholder' },
    description: {
      ko: '사용자 클래스와 공개 CSS 변수로 드래그 Placeholder 표현을 커스텀합니다.',
      en: 'Customize drag placeholder feedback with a consumer class and public CSS variables.',
    },
    api: ['placeholder.className', '--comins-sortable-placeholder-*'],
    controls: [resetControl],
  },
  {
    id: 'skeleton-placeholder',
    title: { ko: 'Skeleton Placeholder', en: 'Skeleton placeholder' },
    description: {
      ko: '로딩 UI와 분리된 선택형 Skeleton 드래그 피드백 프리셋을 사용합니다.',
      en: 'Use the optional skeleton drag-feedback preset, independent of loading UI.',
    },
    api: ['placeholder.preset="skeleton"', 'prefers-reduced-motion'],
    controls: [resetControl],
  },
];

export function scenarioById(id: PlaygroundExampleId): PlaygroundScenario {
  return playgroundScenarios.find((scenario) => scenario.id === id) ?? playgroundScenarios[0]!;
}
