import type { PlaygroundAdapterId } from '../app/navigation.js';
import type { PlaygroundDemoInput } from './types.js';

export interface PlaygroundSourceFile { path: string; code: string }

export const primarySourcePath: Record<PlaygroundAdapterId, string> = {
  vanilla: 'adapters/vanilla.ts', react: 'adapters/react.tsx',
  vue: 'adapters/vue.ts', svelte: 'adapters/SvelteDemo.svelte',
};

// Only package entry paths change in the displayed copy. Keep demo helpers visible.
function publicImports(code: string): string {
  return code.replace(/(['"])\.\.\/\.\.\/\.\.\/src\/(index|core|react|vue|svelte)\.js\1/g,
    (_match, quote: string, entry: string) => `${quote}comins-sortable${entry === 'index' ? '' : `/${entry}`}${quote}`)
    .replace(/(['"])\.\.\/\.\.\/src\/styles\.css\1/g, '$1comins-sortable/styles.css$1');
}

export async function loadSourceFiles(adapter: PlaygroundAdapterId, primary: string): Promise<PlaygroundSourceFile[]> {
  const common = await Promise.all([
    import('../adapters/demo-data.ts?raw'), import('./types.ts?raw'),
    import('../app/navigation.ts?raw'), import('../app/locale.ts?raw'), import('../styles.css?raw'), import('../vite-env.d.ts?raw'),
  ]);
  const paths = ['adapters/demo-data.ts', 'playground/types.ts', 'app/navigation.ts', 'app/locale.ts', 'styles.css', 'vite-env.d.ts'];
  const files = [{ path: primarySourcePath[adapter], code: primary },
    ...common.map((source, index) => ({ path: paths[index]!, code: source.default }))];
  if (adapter === 'react' || adapter === 'vue') files.push({
    path: 'adapters/adapter-ready.ts', code: (await import('../adapters/adapter-ready.ts?raw')).default,
  });
  if (adapter === 'svelte') files.push(
    { path: 'adapters/svelte.ts', code: (await import('../adapters/svelte.ts?raw')).default },
    { path: 'adapters/SvelteTreeArea.svelte', code: (await import('../adapters/SvelteTreeArea.svelte?raw')).default },
  );
  return files.map((file) => ({ ...file, code: publicImports(file.code) }));
}

export function exampleEntry(input: PlaygroundDemoInput): PlaygroundSourceFile {
  return {
    path: 'main.ts',
    code: `import 'comins-sortable/styles.css';
import './styles.css';
import { ${input.adapterId}DemoModule } from './adapters/${input.adapterId}.js';
import type { PlaygroundBridge } from './playground/types.js';

// Call mountExample with an existing DOM container after the page has mounted.
// The returned handle provides dispatch, reset, setLocale and destroy.
export function mountExample(container: HTMLElement, bridge: PlaygroundBridge) {
  return ${input.adapterId}DemoModule.mount(container, {
    adapterId: '${input.adapterId}',
    exampleId: '${input.exampleId}',
    locale: '${input.locale}',
  }, bridge);
}
`,
  };
}
