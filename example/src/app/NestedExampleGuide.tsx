import type { ReactElement } from 'react';

import type { PlaygroundLocale } from './locale.js';
import type { PlaygroundAdapterId } from './navigation.js';

const guides = {
  'nested-controlled': {
    structure: 'todo = [Research, Design, Build]\nchild = [Review, Release]',
    ko: {
      model: '목록마다 독립된 배열',
      steps: [
        '자식 순서 뒤집기를 누르면 child가 [Release, Review]로 바뀝니다. 부모 목록의 순서는 유지됩니다.',
        'Review의 핸들을 잡아 부모 목록의 Build 앞으로 옮기면 todo와 child 두 배열에 이동 결과가 반영됩니다.',
      ],
      distinction: '트리 예제도 제어형입니다. 이 예제는 목록별 배열을 직접 갱신하는 방법을 보여줍니다.',
    },
    en: {
      model: 'One independent array per list',
      steps: [
        'Press Reverse children: child becomes [Release, Review], while the parent list keeps its order.',
        'Drag Review by its handle before Build in the parent list. Both todo and child reflect the transfer.',
      ],
      distinction: 'The tree example is also controlled. This example demonstrates updating each list array directly.',
    },
  },
  tree: {
    structure: 'Research\n  Review\n    Document\n    Observe\n  Release\nDesign (children: [])\nBuild',
    ko: {
      model: 'children으로 연결된 하나의 트리',
      steps: [
        'Review의 핸들을 잡아 Design의 빈 하위 영역으로 옮깁니다.',
        'Design → Review → Document / Observe 구조가 됩니다. Review 아래 두 항목은 따로 옮길 필요가 없습니다.',
        '데이터 초기화 후 Research를 자신의 Review 하위 영역으로 옮기면 순환 구조가 되므로 거부됩니다.',
      ],
      distinction: '목록별 상태 제어와 같은 드래그 엔진을 사용합니다. 이 예제는 부모 변경 시 하위 트리 보존과 전체 트리 갱신을 보여줍니다. 순환 이동 방지는 두 예제의 공통 동작입니다.',
    },
    en: {
      model: 'One tree connected by children',
      steps: [
        'Drag Review by its handle into the empty child area under Design.',
        'The result is Design → Review → Document / Observe. Both descendants travel with Review.',
        'Reset, then try moving Research into its own Review child area. The cycle is rejected.',
      ],
      distinction: 'Both examples use the same drag engine. This one demonstrates preserving a subtree and updating the whole tree when its parent changes. Both examples reject cycles.',
    },
  },
} as const;

const vanillaListGuide = {
  structure: 'todo DOM: Research, Design, Build\nchild DOM: Review, Release',
  ko: {
    model: '목록마다 별도의 DOM 영역',
    steps: [
      '자식 순서 뒤집기를 누르면 자식 DOM이 Release, Review 순서로 재배치됩니다. 부모 목록은 유지됩니다.',
      'Review의 핸들을 잡아 부모 목록의 Build 앞으로 옮기면 두 DOM 목록의 배치가 바뀝니다.',
    ],
    distinction: 'Vanilla의 이 예제는 DOM을 직접 갱신하고 refreshArea를 호출합니다. React·Vue·Svelte 탭은 목록별 배열 상태를 갱신합니다. 트리 예제는 Vanilla에서도 하나의 children 데이터를 갱신합니다.',
  },
  en: {
    model: 'One DOM area per list',
    steps: [
      'Press Reverse children to reorder the child DOM to Release, Review. The parent list keeps its order.',
      'Drag Review before Build in the parent list to change the layout of both DOM lists.',
    ],
    distinction: 'This Vanilla example updates DOM and calls refreshArea. The React, Vue, and Svelte tabs update per-list array state. The tree example updates one children value in Vanilla too.',
  },
};

export function NestedExampleGuide({ exampleId, adapter, locale }: {
  exampleId: keyof typeof guides;
  adapter: PlaygroundAdapterId;
  locale: PlaygroundLocale;
}): ReactElement {
  const guide = exampleId === 'nested-controlled' && adapter === 'vanilla' ? vanillaListGuide : guides[exampleId];
  const text = guide[locale];
  return (
    <section className="cs-playground__nested-guide" data-example-guide={exampleId}
      aria-label={locale === 'ko' ? '예제 확인 방법' : 'How to try this example'}>
      <div>
        <h2>{text.model}</h2>
        <p>{locale === 'ko' ? '초기 데이터 구조 · 요약' : 'Initial data structure · summary'}</p>
        <pre>{guide.structure}</pre>
      </div>
      <div>
        <h2>{locale === 'ko' ? '조작과 기대 결과' : 'Steps and expected results'}</h2>
        <ol>{text.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>{exampleId === 'tree' && adapter === 'vanilla'
          ? locale === 'ko'
            ? '목록별 DOM 갱신과 같은 Core 엔진을 사용합니다. 이 예제는 children 데이터를 갱신하며 부모 변경 시 하위 트리를 보존합니다. 순환 이동 방지는 공통입니다.'
            : 'This uses the same Core engine as per-list DOM updates, but updates children data and preserves descendants when a parent changes. Both reject cycles.'
          : text.distinction}</p>
      </div>
    </section>
  );
}
