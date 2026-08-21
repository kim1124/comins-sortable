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
