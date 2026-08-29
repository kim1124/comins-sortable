# 빠른 시작

패키지와 선택한 어댑터의 peer dependency를 설치합니다.

```sh
# Vanilla JavaScript
npm install comins-sortable

# React
npm install comins-sortable react react-dom

# Vue
npm install comins-sortable vue

# Svelte
npm install comins-sortable svelte
```

어댑터별 공개 export에서 API를 가져옵니다. 내장 Placeholder preset을 사용할 때는
스타일 파일도 가져옵니다.

```ts
import { SortableArea, SortableRoot } from 'comins-sortable/react';
import 'comins-sortable/styles.css';
```

프레임워크 어댑터는 제어형으로 동작합니다. 애플리케이션이 각 `items` 배열을
소유하고 `onItemsChange` 또는 Vue의 `update:modelValue` 결과를 실제 렌더에
반영해야 합니다. 다음 프레임에 렌더 결과가 없거나 DOM 구조가 오래된 상태이면
`state-not-committed`로 drag를 rollback합니다.

모든 항목은 같은 group 전체에서 유일하고 안정적인 ID를 가져야 합니다. 배열
index를 `itemKey`로 사용하지 않습니다.

Git 저장소의 Playground를 실행합니다.

```sh
git clone https://github.com/kim1124/comins-sortable.git
cd comins-sortable
npm ci --ignore-scripts
npm run dev
```

<http://127.0.0.1:4003/examples/simple/react>를 열고 **코드 보기**에서 선택한
어댑터의 실제 예제 코드를 확인합니다.

[핵심 개념](./02-core-concepts.md) 또는 [문서 목차](../README.md)로 이동합니다.
