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
      ko: '명시한 핸들에서만 드래그를 시작합니다.',
      en: 'Start dragging only from an accessible handle.',
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
    title: { ko: '다중 전환', en: 'Transitions' },
    description: { ko: '사용자 지정 duration과 easing으로 복수 항목을 전환합니다.', en: 'Animate multiple items with custom duration and easing.' },
    api: ['animation.duration', 'animation.easing'],
    controls: [{ id: 'reverse-items', kind: 'button', label: { ko: '순서 뒤집기', en: 'Reverse items' } }, resetControl],
  },
  {
    id: 'table',
    title: { ko: '테이블 행', en: 'Table rows' },
    description: { ko: 'tbody host의 행을 세로 방향으로 정렬합니다.', en: 'Sort table rows vertically through a tbody host.' },
    api: ['as', 'tag', 'item'],
    controls: [resetControl],
  },
  {
    id: 'table-column',
    title: { ko: '테이블 열', en: 'Table columns' },
    description: { ko: '테이블 헤더 셀을 가로 방향으로 정렬합니다.', en: 'Sort table header cells horizontally.' },
    api: ['direction="horizontal"', 'as', 'tag'],
    controls: [resetControl],
  },
  {
    id: 'third-party',
    title: { ko: '컴포넌트 host', en: 'Third-party host' },
    description: { ko: 'ref와 속성을 전달하는 사용자 컴포넌트를 정렬 host로 사용합니다.', en: 'Use a ref-forwarding consumer component as the sortable host.' },
    api: ['as', 'tag', 'componentProps'],
    controls: [resetControl],
  },
  {
    id: 'footer-slot',
    title: { ko: '하단 슬롯', en: 'Footer slot' },
    description: { ko: '정렬 항목과 분리된 하단 콘텐츠를 같은 host에 배치합니다.', en: 'Render non-sortable footer content in the same host.' },
    api: ['footer', 'item selector'],
    controls: [resetControl],
  },
  {
    id: 'header-slot',
    title: { ko: '상단 슬롯', en: 'Header slot' },
    description: { ko: '정렬 항목과 분리된 상단 콘텐츠를 같은 host에 배치합니다.', en: 'Render non-sortable header content in the same host.' },
    api: ['header', 'item selector'],
    controls: [resetControl],
  },
  {
    id: 'two-list-slots',
    title: { ko: '두 목록 슬롯', en: 'Two-list slots' },
    description: { ko: '상단·하단 슬롯을 유지한 채 두 목록 사이에서 이동합니다.', en: 'Transfer between two lists while preserving header and footer slots.' },
    api: ['header', 'footer', 'group'],
    controls: [resetControl],
  },
  {
    id: 'nested',
    title: { ko: '중첩 목록', en: 'Nested lists' },
    description: { ko: '부모 항목 내부의 자식 목록으로 이동하며 자기 하위 이동은 차단합니다.', en: 'Move into child lists while rejecting a parent-to-descendant cycle.' },
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
      ko: '비어 있는 대상 목록의 0번 위치로 항목을 이동합니다.',
      en: 'Insert an item at index zero in an empty destination.',
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
];

export function scenarioById(id: PlaygroundExampleId): PlaygroundScenario {
  return playgroundScenarios.find((scenario) => scenario.id === id) ?? playgroundScenarios[0]!;
}
