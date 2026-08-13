import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
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
  const [operation, setOperation] = useState<PlaygroundOperation | null>(null);
  const [source, setSource] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    'accept-destination': true,
  });
  const runtimeTarget = useRef<HTMLDivElement | null>(null);
  const runtimeHost = useRef<PlaygroundRuntimeHost | null>(null);
  const scenario = scenarioById(route.exampleId);

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
    if (runtimeTarget.current === null) return;
    if (runtimeHost.current === null) {
      runtimeHost.current = new PlaygroundRuntimeHost(runtimeTarget.current, {
        publishEvent: (event) => {
          setEvents((current) => [...current.slice(-19), event]);
        },
        publishModel: setModel,
        publishOperation: setOperation,
      });
    }

    let cancelled = false;
    setStatus('loading');
    setEvents([]);
    setOperation(null);
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

  const dispatch = (controlId: string, kind: 'button' | 'toggle'): void => {
    if (controlId === 'reset') {
      runtimeHost.current?.reset();
      return;
    }
    if (kind === 'toggle') {
      setToggles((current) => {
        const value = !(current[controlId] ?? false);
        runtimeHost.current?.dispatch(controlId, value);
        return { ...current, [controlId]: value };
      });
    }
  };

  return (
    <div className="cs-playground">
      <header className="cs-playground__header">
        <a className="cs-playground__brand" href="/examples/simple/react">
          <span className="cs-playground__brand-mark" aria-hidden="true">CS</span>
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
                <small>{item.api[0]}</small>
              </button>
            ))}
          </div>
          <div className="cs-playground__parity-note">
            <strong>Vue.Draggable parity</strong>
            <span>6 / 17 examples</span>
            <small>{locale === 'ko' ? 'Clone · Table · Nested 구현 예정' : 'Clone · Table · Nested next'}</small>
          </div>
        </aside>

        <main className="cs-playground__main">
          <section className="cs-playground__intro">
            <div>
              <span className="cs-playground__route">examples / {route.exampleId}</span>
              <h1>{scenario.title[locale]}</h1>
              <p>{scenario.description[locale]}</p>
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
              {scenario.controls.map((control) => (
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

          <div className="cs-playground__grid">
            <section className="cs-playground__panel cs-playground__workspace" aria-label={message('workspace', locale)}>
              <div className="cs-playground__panel-heading">
                <span>{message('workspace', locale)}</span>
                <span className={`cs-playground__status cs-playground__status--${status}`}>
                  {status === 'ready' ? 'Live' : status}
                </span>
              </div>
              {status === 'loading' && <p className="cs-playground__notice">{message('loading', locale)}</p>}
              {status === 'error' && <p className="cs-playground__notice" role="alert">{message('error', locale)}</p>}
              <div ref={runtimeTarget} className="cs-playground__runtime" data-playground-runtime />
            </section>

            <div className="cs-playground__inspectors">
              <section className="cs-playground__panel" aria-label={message('model', locale)}>
                <div className="cs-playground__panel-heading"><span>{message('model', locale)}</span><span>JSON</span></div>
                <pre data-playground-model>{JSON.stringify(model, null, 2)}</pre>
              </section>
              <section className="cs-playground__panel" aria-label={message('operation', locale)}>
                <div className="cs-playground__panel-heading"><span>{message('operation', locale)}</span></div>
                {operation === null
                  ? <p className="cs-playground__empty">{message('emptyOperation', locale)}</p>
                  : <pre>{JSON.stringify(operation, null, 2)}</pre>}
              </section>
            </div>
          </div>

          <section className="cs-playground__panel cs-playground__events" aria-label={message('events', locale)}>
            <div className="cs-playground__panel-heading"><span>{message('events', locale)}</span><span>{events.length}</span></div>
            {events.length === 0
              ? <p className="cs-playground__empty">{message('emptyEvents', locale)}</p>
              : <ol>{events.map((event, index) => <li key={`${index}-${event.name}`}><code>{event.name}</code>{event.reason && <span>{event.reason}</span>}</li>)}</ol>}
          </section>

          {showCode && (
            <section className="cs-playground__panel cs-playground__source" aria-label={message('code', locale)}>
              <div className="cs-playground__panel-heading"><span>{route.adapterId}.ts</span><span>read only</span></div>
              <pre><code>{source}</code></pre>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
