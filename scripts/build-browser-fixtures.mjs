import { cp, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { build } from 'esbuild';
import { compile } from 'svelte/compiler';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.example-dist');
const isInsideRoot = (candidate) => {
  const path = relative(root, candidate);
  return path !== '' && !path.startsWith('..') && !isAbsolute(path);
};

if (!isInsideRoot(output) || output !== resolve(root, '.example-dist')) {
  throw new Error('Refusing to remove an unsafe fixture output path');
}

const sveltePlugin = {
  name: 'svelte-fixture',
  setup(buildContext) {
    buildContext.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      const compiled = compile(source, { filename: path, generate: 'client', css: 'injected' });
      return { contents: compiled.js.code, loader: 'js' };
    });
  },
};

export async function buildBrowserFixtures() {
  await rm(output, { recursive: true, force: true });
  await build({
    absWorkingDir: root,
    entryPoints: {
      'vanilla/main': 'example/vanilla/main.ts',
      'react/main': 'example/react/main.tsx',
      'vue/main': 'example/vue/main.ts',
      'svelte/main': 'example/svelte/main.ts',
    },
    bundle: true,
    format: 'esm',
    splitting: true,
    target: 'es2020',
    sourcemap: true,
    outdir: output,
    plugins: [sveltePlugin],
  });
  await cp(resolve(root, 'example', 'fixtures-index.html'), resolve(output, 'index.html'));
  await cp(resolve(root, 'example', 'shared.css'), resolve(output, 'shared.css'));
  for (const adapter of ['vanilla', 'react', 'vue', 'svelte']) {
    await cp(resolve(root, 'example', adapter, 'index.html'), resolve(output, adapter, 'index.html'));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildBrowserFixtures();
