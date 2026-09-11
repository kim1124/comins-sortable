import type {
  PlaygroundBridge,
  PlaygroundDemoHandle,
  PlaygroundDemoInput,
  PlaygroundDemoModule,
} from './types.js';

export class PlaygroundRuntimeHost {
  readonly #container: HTMLElement;
  readonly #sink: PlaygroundBridge;
  #generation = 0;
  #handle: PlaygroundDemoHandle | null = null;

  constructor(container: HTMLElement, bridge: PlaygroundBridge) {
    this.#container = container;
    this.#sink = bridge;
  }

  async mount(module: PlaygroundDemoModule, input: PlaygroundDemoInput): Promise<void> {
    const generation = ++this.#generation;
    this.#release();
    delete this.#container.dataset.playgroundMounted;
    this.#container.replaceChildren();

    const handle = await module.mount(
      this.#container,
      input,
      this.#bridgeFor(generation),
    );

    if (generation !== this.#generation) {
      handle.destroy();
      return;
    }

    this.#handle = handle;
    this.#container.dataset.playgroundMounted = `${input.exampleId}/${input.adapterId}`;
  }

  dispatch(controlId: string, value?: string | number | boolean): void {
    this.#handle?.dispatch(controlId, value);
  }

  reset(): void {
    this.#handle?.reset();
  }

  destroy(): void {
    if (this.#handle === null && this.#generation < 0) return;
    this.#generation = -1;
    this.#release();
    delete this.#container.dataset.playgroundMounted;
    this.#container.replaceChildren();
  }

  #release(): void {
    const current = this.#handle;
    this.#handle = null;
    try {
      current?.destroy();
    } finally {
      delete this.#container.dataset.playgroundDragging;
    }
  }

  #bridgeFor(generation: number): PlaygroundBridge {
    const current = () => generation === this.#generation;
    return {
      publishEvent: (event) => {
        if (!current()) return;
        if (event.name === 'dragStart') this.#container.dataset.playgroundDragging = '';
        if (event.name === 'afterDrag') delete this.#container.dataset.playgroundDragging;
        this.#sink.publishEvent(event);
      },
      publishModel: (model) => {
        if (current()) this.#sink.publishModel(model);
      },
      publishOperation: (operation) => {
        if (current()) this.#sink.publishOperation(operation);
      },
    };
  }
}
