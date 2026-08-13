import type { PlaygroundLocale } from './locale.js';

export const messages = {
  brand: { ko: 'Comins Sortable', en: 'Comins Sortable' },
  eyebrow: { ko: '인터랙션 플레이그라운드', en: 'Interaction playground' },
  examples: { ko: '예제', en: 'Examples' },
  adapters: { ko: '프레임워크', en: 'Frameworks' },
  controls: { ko: '제어', en: 'Controls' },
  workspace: { ko: '실행 화면', en: 'Live workspace' },
  model: { ko: '제어 모델', en: 'Controlled model' },
  events: { ko: '이벤트 타임라인', en: 'Event timeline' },
  operation: { ko: '마지막 작업', en: 'Last operation' },
  code: { ko: '소스 코드', en: 'Source code' },
  viewCode: { ko: '코드 보기', en: 'View code' },
  hideCode: { ko: '코드 닫기', en: 'Hide code' },
  reset: { ko: '초기화', en: 'Reset' },
  loading: { ko: '예제를 불러오는 중입니다.', en: 'Loading example.' },
  error: {
    ko: '예제를 실행하지 못했습니다. 다른 예제를 선택해 주십시오.',
    en: 'The example could not be started. Select another example.',
  },
  emptyEvents: { ko: '아직 발생한 이벤트가 없습니다.', en: 'No events yet.' },
  emptyOperation: { ko: '아직 완료된 작업이 없습니다.', en: 'No operation yet.' },
  locale: { ko: '언어', en: 'Language' },
} as const satisfies Record<
  string,
  Record<PlaygroundLocale, string>
>;

export type MessageId = keyof typeof messages;

export function message(id: MessageId, locale: PlaygroundLocale): string {
  return messages[id][locale];
}
