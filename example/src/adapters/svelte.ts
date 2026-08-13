import { mount, unmount } from 'svelte';

import type { PlaygroundDemoModule } from '../playground/types.js';
import SvelteDemo from './SvelteDemo.svelte';
import source from './SvelteDemo.svelte?raw';

interface DemoCommands {
  dispatch(controlId: string, value?: string | number | boolean): void;
  reset(): void;
  destroyScope(): void;
}

export const svelteDemoModule: PlaygroundDemoModule = {
  adapterId: 'svelte',
  source,
  mount(container, input, bridge) {
    const commands: { current: DemoCommands | null } = { current: null };
    const component = mount(SvelteDemo, {
      target: container,
      props: { input, bridge, commands },
    });
    let destroyed = false;
    return {
      dispatch(controlId, value) { commands.current?.dispatch(controlId, value); },
      reset() { commands.current?.reset(); },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        const current = commands.current;
        void unmount(component);
        current?.destroyScope();
        commands.current = null;
      },
    };
  },
};
