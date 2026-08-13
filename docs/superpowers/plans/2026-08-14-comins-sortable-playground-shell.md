# Comins Sortable Playground Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first user-visible Comins-style Playground with canonical routes, Korean/English copy, real Vanilla/React/Vue/Svelte runtimes, controlled model inspection, lifecycle events, and browser-verified current Sortable scenarios.

**Architecture:** Add a Vite consumer application under `example/src` while preserving the existing Task 11 low-level fixtures. A React shell owns navigation and inspectors; a private `PlaygroundRuntimeHost` mounts one real adapter module at a time and destroys it before every route or adapter transition. The first vertical slice ships Simple, Two Lists, Handle, Empty Destination, Accept/Reject, and Auto Scroll without changing the public package API.

**Tech Stack:** TypeScript 7, React 19 shell, Vite 8.1.5, existing Vue 3.5, Svelte 5 compiler, public `comins-sortable` source exports, Node test runner, Playwright 1.62.

## Global Constraints

- Runtime dependencies remain empty. Vite is a development dependency only.
- Playground default locale is `ko`; only `ko | en` is persisted under `comins-sortable-playground-locale`.
- Canonical routes use `/examples/:exampleId/:adapterId`; invalid routes resolve to `/examples/simple/react`.
- Every demo mounts the actual public Vanilla, React, Vue, or Svelte adapter. The shell must not simulate adapter behavior.
- Existing Task 11 fixture URLs and 205-test browser contract remain operational until a later migration explicitly replaces them.
- Bridge state contains IDs, orders, lifecycle names, status/reason, and operation metadata only; no raw Event, DOM node, framework instance, or arbitrary consumer text.
- Use TDD for every behavior change: focused RED, minimal GREEN, then affected regression checks.
- Do not push, open a pull request, publish, tag, create a Release, or edit the CI browser workflow.

## File Structure

- `vite.example.config.ts`: Vite root, port 4003, output confinement, and local Svelte compiler plugin.
- `example/index.html`: Playground HTML entry.
- `example/fixtures-index.html`: preserved landing page copied by the Task 11 fixture builder.
- `example/src/main.tsx`: React shell bootstrap.
- `example/src/app/PlaygroundApp.tsx`: shell, route transitions, adapter tabs, controls, model, events, code viewer.
- `example/src/app/navigation.ts`: pure canonical route parsing/building.
- `example/src/app/locale.ts`: pure locale validation/persistence contract.
- `example/src/app/messages.ts`: complete Korean/English Playground copy.
- `example/src/playground/types.ts`: private scenario, bridge, module, and handle interfaces.
- `example/src/playground/runtime-host.ts`: destroy-before-mount adapter ownership.
- `example/src/playground/scenarios.ts`: scenario registry and controls.
- `example/src/adapters/{vanilla,react,vue,svelte}.ts(x)`: actual runtime modules.
- `example/src/adapters/SvelteDemo.svelte`: actual Svelte `use:sortable` consumer.
- `example/src/styles.css`: Comins Playground shell and demo styling.
- `example/src/vite-env.d.ts`: Vite and `.svelte` declarations.
- `test/unit/playground/{navigation,runtime-host}.test.ts`: pure behavior gates.
- `test/playground-build.node.mjs`: built artifact and Svelte compilation gate.
- `playwright.playground.config.ts`: isolated port 4003 browser configuration.
- `test/playwright/playground.spec.ts`: user-visible shell and real interaction acceptance.

---

### Task 1: Canonical Playground Foundation

**Files:**
- Create: `test/unit/playground/navigation.test.ts`
- Create: `example/src/app/navigation.ts`
- Create: `example/src/app/locale.ts`
- Create: `example/src/app/messages.ts`
- Create: `example/src/vite-env.d.ts`
- Create: `vite.example.config.ts`
- Create: `example/fixtures-index.html`
- Modify: `example/index.html`
- Modify: `scripts/build-browser-fixtures.mjs`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: design route `/examples/:exampleId/:adapterId`, adapter IDs, locale key.
- Produces: `resolvePlaygroundRoute(pathname)`, `playgroundPath(route)`, `readPlaygroundLocale(storage)`, `writePlaygroundLocale(storage, locale)`, Vite build and dev scripts.

- [ ] **Step 1: Write failing navigation and locale tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { playgroundPath, resolvePlaygroundRoute } from '../../../example/src/app/navigation.js';
import { readPlaygroundLocale, writePlaygroundLocale } from '../../../example/src/app/locale.js';

test('invalid routes fail closed to the simple React example', () => {
  assert.deepEqual(resolvePlaygroundRoute('/unknown'), { adapterId: 'react', exampleId: 'simple' });
  assert.equal(playgroundPath({ adapterId: 'svelte', exampleId: 'two-lists' }), '/examples/two-lists/svelte');
});

test('locale persistence accepts only ko and en', () => {
  const values = new Map<string, string>([['comins-sortable-playground-locale', 'invalid']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  assert.equal(readPlaygroundLocale(storage), 'ko');
  writePlaygroundLocale(storage, 'en');
  assert.equal(values.get('comins-sortable-playground-locale'), 'en');
});
```

- [ ] **Step 2: Run focused RED**

Run: `node --import tsx --test test/unit/playground/navigation.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `example/src/app/navigation.js`.

- [ ] **Step 3: Implement pure navigation and locale contracts**

```ts
export const adapterIds = ['vanilla', 'react', 'vue', 'svelte'] as const;
export const exampleIds = ['simple', 'two-lists', 'handle', 'empty', 'accept', 'auto-scroll'] as const;
export type PlaygroundAdapterId = typeof adapterIds[number];
export type PlaygroundExampleId = typeof exampleIds[number];
export interface PlaygroundRoute { adapterId: PlaygroundAdapterId; exampleId: PlaygroundExampleId }

export function resolvePlaygroundRoute(pathname: string): PlaygroundRoute {
  const [, prefix, exampleId, adapterId] = pathname.split('/');
  if (prefix === 'examples' && exampleIds.includes(exampleId as PlaygroundExampleId) && adapterIds.includes(adapterId as PlaygroundAdapterId)) {
    return { adapterId: adapterId as PlaygroundAdapterId, exampleId: exampleId as PlaygroundExampleId };
  }
  return { adapterId: 'react', exampleId: 'simple' };
}

export function playgroundPath(route: PlaygroundRoute): string {
  return `/examples/${route.exampleId}/${route.adapterId}`;
}
```

Implement locale with the exact storage key and a `StorageLike` interface containing only `getItem` and `setItem`. `messages.ts` must define every visible label as `{ ko: string; en: string }` and must not place locale state in `src/` package exports.

- [ ] **Step 4: Run focused GREEN**

Run: `node --import tsx --test test/unit/playground/navigation.test.ts`

Expected: PASS 2/2.

- [ ] **Step 5: Write the failing build artifact test**

```js
test('builds the Playground entry without replacing fixture output', () => {
  const fixtureResult = spawnSync('npm', ['run', 'example:build'], { cwd: root, encoding: 'utf8' });
  assert.equal(fixtureResult.status, 0, fixtureResult.stderr);
  const result = spawnSync('npm', ['run', 'playground:build'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(join(root, '.playground-dist', 'index.html')), true);
  assert.equal(existsSync(join(root, '.example-dist', 'react', 'main.js')), true);
  assert.match(readFileSync(join(root, '.playground-dist', 'index.html'), 'utf8'), /id="root"/);
});
```

Create this as `test/playground-build.node.mjs`. Run `node --test test/playground-build.node.mjs`; expect FAIL because `playground:build` and `.playground-dist` do not exist.

- [ ] **Step 6: Install Vite and implement the build boundary**

Run: `npm install --save-dev vite@8.1.5`

Add scripts:

```json
"dev": "vite --config vite.example.config.ts",
"playground:build": "vite build --config vite.example.config.ts",
"playground:preview": "vite preview --config vite.example.config.ts"
```

Configure Vite with `root: 'example'`, server `127.0.0.1:4003`, strict port, build output `../.playground-dist`, and the same Svelte compiler settings as the existing esbuild fixture plugin. Preserve Task 11 by copying `example/fixtures-index.html` from `build-browser-fixtures.mjs` instead of the new Playground entry. Add `.playground-dist/` to `.gitignore` and include `example/src/**/*.ts(x)` plus `vite/client` in typecheck.

- [ ] **Step 7: Run foundation GREEN**

Run:

```sh
node --test test/playground-build.node.mjs
npm run typecheck
npm run playground:build
npm run example:build
```

Expected: all commands exit 0; `.playground-dist/index.html` and all four `.example-dist/<adapter>/main.js` entries exist.

- [ ] **Step 8: Commit foundation**

```sh
git add .gitignore package.json package-lock.json tsconfig.json vite.example.config.ts example/index.html example/fixtures-index.html example/src/app/navigation.ts example/src/app/locale.ts example/src/app/messages.ts example/src/vite-env.d.ts scripts/build-browser-fixtures.mjs test/unit/playground/navigation.test.ts test/playground-build.node.mjs
git commit -m "build: add sortable playground foundation"
```

---

### Task 2: Runtime Host And Shell

**Files:**
- Create: `test/unit/playground/runtime-host.test.ts`
- Create: `example/src/playground/types.ts`
- Create: `example/src/playground/runtime-host.ts`
- Create: `example/src/playground/scenarios.ts`
- Create: `example/src/app/PlaygroundApp.tsx`
- Create: `example/src/main.tsx`
- Create: `example/src/styles.css`

**Interfaces:**
- Consumes: canonical route/locale and the approved `PlaygroundDemoModule` contract.
- Produces: `PlaygroundRuntimeHost.mount()`, destroy-before-mount ownership, localized shell, scenario controls and inspectors.

- [ ] **Step 1: Write failing runtime ownership tests**

```ts
test('adapter transition destroys the previous runtime before mounting the next', async () => {
  const calls: string[] = [];
  const host = new PlaygroundRuntimeHost(
    { replaceChildren: () => calls.push('clear') } as unknown as HTMLElement,
    { publishEvent: () => undefined, publishModel: () => undefined, publishOperation: () => undefined },
  );
  await host.mount(moduleFor('react', calls), input('simple'));
  await host.mount(moduleFor('vue', calls), input('simple'));
  assert.deepEqual(calls, ['mount:react', 'destroy:react', 'clear', 'mount:vue']);
});

test('stale bridge publications are ignored after adapter transition', async () => {
  const published: string[] = [];
  const first = deferredModule();
  const host = new PlaygroundRuntimeHost(element(), { publishEvent: (event) => published.push(event.name) });
  await host.mount(first.module, input('simple'));
  await host.mount(moduleFor('vue', []), input('simple'));
  first.bridge.publishEvent({ name: 'late' });
  assert.deepEqual(published, []);
});
```

- [ ] **Step 2: Run focused RED**

Run: `node --import tsx --test test/unit/playground/runtime-host.test.ts`

Expected: FAIL with missing `runtime-host.js`.

- [ ] **Step 3: Implement private runtime and scenario contracts**

Define `PlaygroundDemoInput`, `PlaygroundEvent`, `PlaygroundBridge`, `PlaygroundDemoHandle`, and `PlaygroundDemoModule` exactly as the approved design, including `dispatch(controlId, value)`. `PlaygroundRuntimeHost` owns a monotonically increasing generation; every bridge method checks its captured generation before publishing. `mount()` destroys the old handle, clears the container, then mounts the next module. `destroy()` is idempotent.

The constructor contract is exact: `new PlaygroundRuntimeHost(container, bridge)`. The
second argument is the shell-owned publication sink. Each `mount()` creates a
generation-bound proxy around that sink and passes only the proxy to the adapter module.

- [ ] **Step 4: Run runtime GREEN**

Run: `node --import tsx --test test/unit/playground/runtime-host.test.ts`

Expected: PASS with transition ordering and stale publication protection.

- [ ] **Step 5: Implement the shell**

`PlaygroundApp` must:

- normalize the initial URL with `history.replaceState`;
- use `pushState` for example and adapter tabs and handle `popstate`;
- keep locale outside the adapter route so switching locale preserves current demo state;
- render one `main`, labeled navigation, example tablist, adapter tablist, controls, runtime target, model JSON, event timeline, last operation, and View code button;
- call `runtimeHost.mount()` on route changes and `runtimeHost.destroy()` on final unmount;
- render only sanitized bridge values;
- show a visible loading or error status without exposing raw errors.

`styles.css` uses namespace-prefixed Playground classes, full-width workspace, two-column desktop inspector, one-column layout at 900px, no horizontal page overflow at 360px, visible focus, and reduced-motion overrides.

- [ ] **Step 6: Run shell checks**

Run:

```sh
npm run typecheck
npm run playground:build
node --import tsx --test test/unit/playground/navigation.test.ts test/unit/playground/runtime-host.test.ts
```

Expected: all exit 0.

- [ ] **Step 7: Commit runtime shell**

```sh
git add example/src/main.tsx example/src/app/PlaygroundApp.tsx example/src/styles.css example/src/playground/types.ts example/src/playground/runtime-host.ts example/src/playground/scenarios.ts test/unit/playground/runtime-host.test.ts
git commit -m "feat: add sortable playground shell"
```

---

### Task 3: Actual Adapter Demo Modules

**Files:**
- Create: `example/src/adapters/demo-data.ts`
- Create: `example/src/adapters/vanilla.ts`
- Create: `example/src/adapters/react.tsx`
- Create: `example/src/adapters/vue.ts`
- Create: `example/src/adapters/svelte.ts`
- Create: `example/src/adapters/SvelteDemo.svelte`
- Create: `test/unit/playground/demo-data.test.ts`

**Interfaces:**
- Consumes: public Sortable exports and `PlaygroundDemoModule`.
- Produces: real runtime modules for six current scenarios with identical sanitized model/event semantics.

Each adapter registry entry also exports its own consumer source string through Vite
`?raw`. `PlaygroundDemoModule` includes a required `source: string`; the shell renders only
the source of the currently selected adapter and scenario. The displayed code must be the
same file that implements that demo path, not separately maintained pseudocode.

- [ ] **Step 1: Write failing literal scenario-state tests**

```ts
test('two-list transfer produces hand-checked immutable orders', () => {
  const state = createDemoState('two-lists');
  const next = applyDemoChange(state, {
    operation: 'transfer', itemId: 'design',
    source: { areaId: 'todo', index: 1 }, destination: { areaId: 'done', index: 1 },
    orders: [
      { areaId: 'todo', itemIds: ['research', 'build'] },
      { areaId: 'done', itemIds: ['review', 'design'] },
    ],
  });
  assert.deepEqual(next.todo.map((item) => item.id), ['research', 'build']);
  assert.deepEqual(next.done.map((item) => item.id), ['review', 'design']);
  assert.deepEqual(state.todo.map((item) => item.id), ['research', 'design', 'build']);
});
```

- [ ] **Step 2: Run demo-state RED**

Run: `node --import tsx --test test/unit/playground/demo-data.test.ts`

Expected: FAIL with missing `demo-data.js`.

- [ ] **Step 3: Implement immutable shared demo data**

Use stable public IDs and pure functions only. Do not share framework state objects. Provide literal initial state for `simple`, `two-lists`, `handle`, `empty`, `accept`, and `auto-scroll`; `reset` returns fresh arrays.

- [ ] **Step 4: Run demo-state GREEN**

Run: `node --import tsx --test test/unit/playground/demo-data.test.ts`

Expected: PASS.

- [ ] **Step 5: Implement Vanilla and React modules**

- Vanilla uses public `createSortable`, explicit `data-sortable-id`, immutable order application, and idempotent `destroy()`.
- React mounts a separate `createRoot`, renders actual `SortableRoot`/`SortableArea`, applies `change.updates`, and unmounts the root in `destroy()`.
- Both publish matching model/event/operation payloads and support scenario controls through `dispatch()`.

- [ ] **Step 6: Implement Vue and Svelte modules**

- Vue uses `createApp`, actual `SortableRoot`/`SortableArea`, and controlled `modelValue` updates.
- Svelte compiles `SvelteDemo.svelte`, mounts with Svelte 5 `mount`, uses actual `use:sortable`, and destroys with `unmount`.
- All four modules render consumer-owned list/listitem roles and accessible handle names.

- [ ] **Step 7: Run adapter build/type checks**

Run:

```sh
npm run typecheck
npm run playground:build
npm run example:build
node --import tsx --test test/unit/playground/demo-data.test.ts
```

Expected: all exit 0; built Playground includes React, Vue, Svelte runtime chunks and no runtime package export changes.

- [ ] **Step 8: Commit actual demos**

```sh
git add example/src/adapters test/unit/playground/demo-data.test.ts
git commit -m "feat: add sortable playground adapters"
```

---

### Task 4: Browser Acceptance And First Preview

**Files:**
- Create: `playwright.playground.config.ts`
- Create: `test/playwright/playground.spec.ts`
- Modify: `package.json`
- Modify: `reports/2026-08-12.md`

**Interfaces:**
- Consumes: built Playground routes and real adapter modules.
- Produces: Chromium-focused RED/GREEN, three-engine final gate, and a user-visible preview at port 4003.

- [ ] **Step 1: Write failing browser acceptance**

```ts
for (const adapter of ['vanilla', 'react', 'vue', 'svelte'] as const) {
  test(`${adapter} two-list route transfers controlled state`, async ({ page }) => {
    await page.goto(`/examples/two-lists/${adapter}`);
    await expect(page.getByRole('heading', { name: /Two Lists|두 목록/ })).toBeVisible();
    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
    await expect(page.getByLabel(/Controlled model|제어 모델/)).toContainText('"done"');
    await expect(page.getByLabel(/Last operation|마지막 작업/)).toContainText('transfer');
  });
}
```

Also cover canonical redirect, locale toggle preserving route, adapter switch destroy, View code matching the adapter, 360px overflow, keyboard tab semantics, reduced motion, Empty, Accept/Reject, Handle and Auto Scroll.

- [ ] **Step 2: Run Chromium RED**

Run: `npx playwright test --config=playwright.playground.config.ts --project=chromium`

Expected: FAIL because the Playground server/config or routes are not yet wired to the tests.

- [ ] **Step 3: Wire the isolated browser config and scripts**

Use base URL `http://127.0.0.1:4003`, `npm run dev` web server, retry 0, and Chromium/Firefox/WebKit projects. Add:

```json
"test:playground": "playwright test --config=playwright.playground.config.ts",
"verify:playground": "npm run playground:build && npm run test:playground"
```

Do not change the existing Task 11 fixture server or tests.

- [ ] **Step 4: Run focused browser GREEN**

Run:

```sh
npx playwright test --config=playwright.playground.config.ts --project=chromium
npx playwright test --config=playwright.playground.config.ts --project=chromium --grep "two-list route"
```

Expected: all focused tests pass with real order changes; no assertion may pass on status text without checking model order or DOM order.

- [ ] **Step 5: Run affected complete gates**

Run:

```sh
npm run verify
npm run verify:e2e
npm run verify:playground
.githooks/pre-commit
git diff --check
```

Expected: policy, unit, type, package build, Task 11 205 browser tests, and new Playground three-engine tests all pass.

- [ ] **Step 6: Update the report and commit the first preview**

Record date, changed files, focused RED/GREEN, exact test counts, omissions, and the remaining clone/host/animation/nested parity work in `reports/2026-08-12.md`.

```sh
git add package.json package-lock.json playwright.playground.config.ts test/playwright/playground.spec.ts reports/2026-08-12.md
git commit -m "test: verify sortable playground"
```

- [ ] **Step 7: Start the user preview**

Run: `npm run dev`

Expected: `http://127.0.0.1:4003/examples/simple/react` displays the Comins-style Playground and all adapter/example routes can be inspected. Keep the server local; do not deploy or expose it remotely.
