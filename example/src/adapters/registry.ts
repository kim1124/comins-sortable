import type { PlaygroundAdapterId } from '../app/navigation.js';
import type { PlaygroundDemoModule } from '../playground/types.js';

export async function loadPlaygroundDemo(
  adapterId: PlaygroundAdapterId,
): Promise<PlaygroundDemoModule> {
  if (adapterId === 'vanilla') return (await import('./vanilla.js')).vanillaDemoModule;
  if (adapterId === 'react') return (await import('./react.js')).reactDemoModule;
  if (adapterId === 'vue') return (await import('./vue.js')).vueDemoModule;
  return (await import('./svelte.js')).svelteDemoModule;
}
