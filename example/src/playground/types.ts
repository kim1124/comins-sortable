import type {
  PlaygroundAdapterId,
  PlaygroundExampleId,
} from '../app/navigation.js';
import type { PlaygroundLocale } from '../app/locale.js';

export interface PlaygroundDemoInput {
  adapterId: PlaygroundAdapterId;
  exampleId: PlaygroundExampleId;
  locale: PlaygroundLocale;
}

export interface PlaygroundEvent {
  name: string;
  status?: string;
  reason?: string;
  areaId?: string;
  itemId?: string;
}

export interface PlaygroundLocation {
  areaId: string;
  index: number;
}

export interface PlaygroundOperation {
  operation: string;
  itemId: string;
  source: PlaygroundLocation;
  destination: PlaygroundLocation;
}

export type PlaygroundModel = Readonly<Record<string, readonly string[]>>;

export interface PlaygroundBridge {
  publishModel(model: PlaygroundModel): void;
  publishEvent(event: PlaygroundEvent): void;
  publishOperation(operation: PlaygroundOperation | null): void;
}

export interface PlaygroundDemoHandle {
  dispatch(controlId: string, value?: string | number | boolean): void;
  setLocale?(locale: PlaygroundLocale): void;
  reset(): void;
  destroy(): void;
}

export interface PlaygroundDemoModule {
  adapterId: PlaygroundAdapterId;
  source: string;
  mount(
    container: HTMLElement,
    input: PlaygroundDemoInput,
    bridge: PlaygroundBridge,
  ): Promise<PlaygroundDemoHandle> | PlaygroundDemoHandle;
}

export interface PlaygroundControl {
  id: string;
  label: Record<PlaygroundLocale, string>;
  kind: 'button' | 'toggle' | 'range' | 'select';
  options?: readonly { value: string; label: Record<PlaygroundLocale, string> }[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
}

export interface PlaygroundScenario {
  id: PlaygroundExampleId;
  title: Record<PlaygroundLocale, string>;
  description: Record<PlaygroundLocale, string>;
  api: readonly string[];
  controls: readonly PlaygroundControl[];
}
