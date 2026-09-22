import type { PlaygroundAdapterId, PlaygroundExampleId } from './navigation.js';
import type { PlaygroundLocale } from './locale.js';

export function ExampleGuides({ exampleId, adapter, locale }: {
  exampleId: PlaygroundExampleId; adapter: PlaygroundAdapterId; locale: PlaygroundLocale;
}) {
  const ko = locale === 'ko';
  if (exampleId === 'custom-placeholder') return <section className="cs-playground__example-guide">
    <h2>{ko ? '허용 위치와 거부 영역의 스타일' : 'Accepted positions and rejected areas'}</h2>
    <p>{ko
      ? '왼쪽 카드를 오른쪽 Release 앞으로 이동해 보세요. 사용자 스타일을 끄면 기본 표시로 돌아갑니다. 대상 이동 허용을 끄면 삽입 표시가 숨겨지고, 목적지와 이동 중인 카드에 거부 테두리가 표시됩니다. 허용 가능한 모든 영역을 동시에 표시하는 기능은 아닙니다.'
      : 'Drag a left card before Release on the right. Turn off Custom styles to compare the default. Turn off Accept destination to hide the insertion marker and outline the target and dragged card. This does not highlight all eligible areas in advance.'}</p>
    <pre><code>{`/* ${ko ? '허용 위치: placeholder.className' : 'Accepted position: placeholder.className'} */
[data-feedback-style="custom"] .cs-demo-placeholder--custom {
  --comins-sortable-placeholder-background: #fff4cf;
  --comins-sortable-placeholder-border: 3px dotted #b87508;
  --comins-sortable-placeholder-border-radius: 18px;
  --comins-sortable-placeholder-opacity: .82;
}
/* ${ko ? '거부 영역과 드래그 카드에 상속' : 'Inherited by the rejected area and dragged card'} */
[data-feedback-style="custom"] {
  --comins-sortable-rejection-outline: 3px dashed #7c3aed;
  --comins-sortable-rejection-outline-offset: 3px;
}`}</code></pre>
  </section>;
  if (exampleId !== 'third-party' && exampleId !== 'functional-third-party') return null;
  const code = {
    react: 'SortableArea as={ComponentHost}\n  → ComponentHost forwards ref + props\n    → <section>\n      → sortable cards',
    vue: 'SortableArea :tag="ComponentHost"\n  → ComponentHost forwards attrs\n    → <section>\n      → sortable cards',
    svelte: '<div use:sortable={options}>\n  → directly rendered cards',
    vanilla: 'createSortable(container, options)\n  → existing <div>\n    → directly created cards',
  }[adapter];
  return <section className="cs-playground__example-guide">
    <h2>{ko ? '정렬을 연결하는 컨테이너' : 'The container registered for sorting'}</h2>
    <p>{ko
      ? 'Host는 정렬 항목을 직접 담는 DOM 요소입니다. DOM 이벤트와 커스텀 이벤트의 차이를 보여주는 예제가 아닙니다. React·Vue는 사용자 컴포넌트를 통해 실제 컨테이너를 연결하고, Vanilla·Svelte는 직접 만든 요소를 등록합니다. 뒤의 두 방식은 기본 정렬과 같은 연결 방식이며, 여기서는 컨테이너 구조를 확인합니다.'
      : 'A host is the DOM element directly containing sortable items. This demonstrates container binding, not DOM versus custom events. React/Vue register through a consumer component; Vanilla/Svelte register a rendered element directly, as in basic sorting. Here the container structure is made explicit.'}</p>
    <pre>{code}</pre>
    {exampleId === 'functional-third-party' && <p>{ko
      ? '중첩 영역도 별도로 등록하며 parent로 Research 항목과 연결합니다.'
      : 'Register the nested area separately and connect it to Research through parent.'}</p>}
  </section>;
}
