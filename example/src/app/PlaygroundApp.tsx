import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type CSSProperties,
} from 'react';

import {
  adapterIds,
  playgroundPath,
  resolvePlaygroundRoute,
  type PlaygroundRoute,
} from './navigation.js';
import {
  readPlaygroundLocale,
  writePlaygroundLocale,
  type PlaygroundLocale,
} from './locale.js';
import { message } from './messages.js';
import { loadPlaygroundDemo } from '../adapters/registry.js';
import { PlaygroundRuntimeHost } from '../playground/runtime-host.js';
import {
  playgroundScenarios,
  scenarioById,
} from '../playground/scenarios.js';
import type {
  PlaygroundDemoModule,
  PlaygroundEvent,
  PlaygroundModel,
  PlaygroundOperation,
} from '../playground/types.js';

const adapterNames = {
  vanilla: 'Vanilla',
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
} as const;

const defaultToggles: Readonly<Record<string, boolean>> = {
  'accept-destination': true,
  'invert-swap': false,
};

const defaultValues: Readonly<Record<string, number>> = {
  'swap-threshold': 0.5,
};

async function loadDemoModule(route: PlaygroundRoute): Promise<PlaygroundDemoModule> {
  return loadPlaygroundDemo(route.adapterId);
}

export function PlaygroundApp(): ReactElement {
  const [route, setRoute] = useState(() => resolvePlaygroundRoute(location.pathname));
  const [locale, setLocale] = useState<PlaygroundLocale>(() =>
    readPlaygroundLocale(localStorage),
  );
  const [model, setModel] = useState<PlaygroundModel>({});
  const [events, setEvents] = useState<readonly PlaygroundEvent[]>([]);
  const [dragStart, setDragStart] = useState<(PlaygroundEvent & { sequence: number }) | null>(null);
  const [operation, setOperation] = useState<PlaygroundOperation | null>(null);
  const [source, setSource] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => ({ ...defaultToggles }));
  const [values, setValues] = useState<Record<string, number>>(() => ({ ...defaultValues }));
  const runtimeTarget = useRef<HTMLDivElement | null>(null);
  const runtimeHost = useRef<PlaygroundRuntimeHost | null>(null);
  const sourcePanel = useRef<HTMLElement | null>(null);
  const scenario = scenarioById(route.exampleId);
  // Show the upward path used by the comparison instructions on every adapter.
  const threshold = values['swap-threshold'] ?? 0.5;
  const upwardBoundary = (toggles['invert-swap'] ? (1 - threshold) / 2 : (1 + threshold) / 2) * 100;

  useEffect(() => {
    const canonical = playgroundPath(route);
    if (location.pathname !== canonical) history.replaceState(null, '', canonical);
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(resolvePlaygroundRoute(location.pathname));
    addEventListener('popstate', onPopState);
    return () => removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    writePlaygroundLocale(localStorage, locale);
  }, [locale]);

  useEffect(() => {
    if (!showCode) return;
    sourcePanel.current?.scrollIntoView({ block: 'start' });
  }, [showCode]);

  useEffect(() => {
    if (runtimeTarget.current === null) return;
    if (runtimeHost.current === null) {
      runtimeHost.current = new PlaygroundRuntimeHost(runtimeTarget.current, {
        publishEvent: (event) => {
          setEvents((current) => [...current.slice(-19), event]);
          if (event.name === 'dragStart') {
            setDragStart((current) => ({ ...event, sequence: (current?.sequence ?? 0) + 1 }));
          }
        },
        publishModel: setModel,
        publishOperation: setOperation,
      });
    }

    let cancelled = false;
    setStatus('loading');
    setEvents([]);
    setDragStart(null);
    setOperation(null);
    setToggles({ ...defaultToggles });
    setValues({ ...defaultValues });
    void loadDemoModule(route)
      .then(async (demoModule) => {
        if (cancelled) return;
        setSource(demoModule.source);
        await runtimeHost.current?.mount(demoModule, { ...route, locale });
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [route]);

  useEffect(
    () => () => {
      runtimeHost.current?.destroy();
      runtimeHost.current = null;
    },
    [],
  );

  const navigate = (next: PlaygroundRoute): void => {
    const path = playgroundPath(next);
    history.pushState(null, '', path);
    setRoute(next);
  };

  const dispatch = (controlId: string, kind: 'button' | 'toggle' | 'range', value?: number): void => {
    if (controlId === 'reset') {
      setToggles({ ...defaultToggles });
      setValues({ ...defaultValues });
      runtimeHost.current?.reset();
      return;
    }
    if (kind === 'range' && value !== undefined) {
      setValues((current) => ({ ...current, [controlId]: value }));
      runtimeHost.current?.dispatch(controlId, value);
      return;
    }
    if (kind === 'toggle') {
      setToggles((current) => {
        const value = !(current[controlId] ?? false);
        runtimeHost.current?.dispatch(controlId, value);
        return { ...current, [controlId]: value };
      });
      return;
    }
    runtimeHost.current?.dispatch(controlId);
  };

  return (
    <div className="cs-playground">
      <header className="cs-playground__header">
        <a className="cs-playground__brand" href="/examples/simple/react">
          <span className="cs-playground__brand-mark" aria-hidden="true">co</span>
          <span>
            <strong>{message('brand', locale)}</strong>
            <small>{message('eyebrow', locale)}</small>
          </span>
        </a>
        <div className="cs-playground__header-actions">
          <span>{message('locale', locale)}</span>
          <button
            className="cs-playground__locale"
            type="button"
            onClick={() => setLocale((current) => (current === 'ko' ? 'en' : 'ko'))}
            aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
          >
            {locale === 'ko' ? 'EN' : 'KO'}
          </button>
        </div>
      </header>

      <div className="cs-playground__body">
        <aside className="cs-playground__sidebar" aria-label={message('examples', locale)}>
          <p className="cs-playground__nav-label">{message('examples', locale)}</p>
          <div className="cs-playground__example-tabs" role="tablist" aria-orientation="vertical">
            {playgroundScenarios.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === route.exampleId}
                className="cs-playground__example-tab"
                onClick={() => navigate({ ...route, exampleId: item.id })}
              >
                <span>{item.title[locale]}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="cs-playground__main">
          <section className="cs-playground__intro">
            <div>
              <span className="cs-playground__route">examples / {route.exampleId}</span>
              <h1>{scenario.title[locale]}</h1>
              <p>{scenario.description[locale]}</p>
              <p>{locale === 'ko'
                ? '왼쪽 핸들을 잡아 이동하고, 본문 글자는 드래그로 선택하여 복사할 수 있습니다.'
                : 'Drag the left handle to move an item. Select text in the card body to copy it.'}</p>
              <div className="cs-playground__api-list" aria-label="API">
                {scenario.api.map((api) => <code key={api}>{api}</code>)}
              </div>
            </div>
            <button
              className="cs-playground__code-button"
              type="button"
              onClick={() => setShowCode((current) => !current)}
              aria-expanded={showCode}
            >
              {showCode ? message('hideCode', locale) : message('viewCode', locale)}
            </button>
          </section>

          <div className="cs-playground__adapter-tabs" role="tablist" aria-label={message('adapters', locale)}>
            {adapterIds.map((adapterId) => (
              <button
                key={adapterId}
                type="button"
                role="tab"
                aria-selected={adapterId === route.adapterId}
                onClick={() => navigate({ ...route, adapterId })}
              >
                <span aria-hidden="true" className={`cs-adapter-dot cs-adapter-dot--${adapterId}`} />
                {adapterNames[adapterId]}
              </button>
            ))}
          </div>

          <section className="cs-playground__controls" aria-label={message('controls', locale)}>
            <div>
              <span className="cs-playground__section-label">{message('controls', locale)}</span>
              <p>{locale === 'ko' ? '실행 중 옵션을 변경할 수 있습니다.' : 'Change options while the demo is running.'}</p>
            </div>
            <div className="cs-playground__control-actions">
              {scenario.controls.map((control) => control.kind === 'range' ? (
                <label key={control.id} className="cs-playground__range">
                  <span>{control.label[locale]} <output>{values[control.id] ?? control.defaultValue}</output></span>
                  <input
                    aria-label={control.label[locale]}
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={values[control.id] ?? control.defaultValue}
                    onChange={(event) => dispatch(control.id, control.kind, Number(event.currentTarget.value))}
                  />
                </label>
              ) : (
                <button
                  key={control.id}
                  type="button"
                  className={control.kind === 'toggle' && toggles[control.id] ? 'is-active' : undefined}
                  aria-pressed={control.kind === 'toggle' ? (toggles[control.id] ?? false) : undefined}
                  onClick={() => dispatch(control.id, control.kind)}
                >
                  {control.label[locale]}
                </button>
              ))}
            </div>
          </section>

          <section className="cs-playground__panel cs-playground__workspace" aria-label={message('workspace', locale)}>
            <div className="cs-playground__panel-heading">
              <span>{message('workspace', locale)}</span>
              <span className={`cs-playground__status cs-playground__status--${status}`}>
                {status === 'ready' ? 'Live' : status}
              </span>
            </div>
            {status === 'loading' && <p className="cs-playground__notice">{message('loading', locale)}</p>}
            {status === 'error' && <p className="cs-playground__notice" role="alert">{message('error', locale)}</p>}
            {route.exampleId === 'thresholds' && (
              <div className="cs-playground__threshold-guide" data-threshold-guide>
                <p>{locale === 'ko'
                  ? 'Design을 위쪽 Research 카드로 천천히 이동하세요. 포인터가 색칠된 영역에 들어가면 Research 앞으로 순서가 바뀝니다. 0.2와 0.8을 비교해 보세요.'
                  : 'Slowly drag Design upward onto Research. Its order changes before Research when the pointer enters the shaded area. Compare 0.2 with 0.8.'}</p>
                <span>{locale === 'ko'
                  ? `↑ 위로 이동: 카드 상단 ${Math.round(upwardBoundary)}%까지 전환 영역 · 아래로 이동할 때는 반대 방향 적용`
                  : `↑ Moving up: top ${Math.round(upwardBoundary)}% is active · moving down uses the opposite edge`}</span>
              </div>
            )}
            <div ref={runtimeTarget}
              className={`cs-playground__runtime${route.exampleId === 'thresholds' ? ' cs-playground__runtime--thresholds' : ''}`}
              style={route.exampleId === 'thresholds' ? { '--cs-demo-threshold-up': `${upwardBoundary}%` } as CSSProperties : undefined}
              data-playground-runtime />
          </section>
          <output hidden data-playground-model>{JSON.stringify(model)}</output>
          <output hidden data-playground-operation>{JSON.stringify(operation)}</output>
          <output hidden data-playground-drag-start>{JSON.stringify(dragStart)}</output>

          <section className="cs-playground__panel cs-playground__events" aria-label={message('events', locale)}>
            <div className="cs-playground__panel-heading"><span>{message('events', locale)}</span><span>{events.length}</span></div>
            {events.length === 0
              ? <p className="cs-playground__empty">{message('emptyEvents', locale)}</p>
              : <ol>{events.map((event, index) => <li key={`${index}-${event.name}`}><code>{event.name}</code>{event.reason && <span>{event.reason}</span>}</li>)}</ol>}
          </section>

          {showCode && (
            <section
              ref={sourcePanel}
              className="cs-playground__panel cs-playground__source"
              aria-label={message('code', locale)}
            >
              <div className="cs-playground__panel-heading"><span>{route.adapterId}.ts</span><span>read only</span></div>
              <pre><code>{source}</code></pre>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
