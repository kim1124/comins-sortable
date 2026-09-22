import { posix, resolve } from 'node:path';
import { build } from 'esbuild';
import { compile } from 'svelte/compiler';
import type { Page } from '@playwright/test';

/** Compile the files a consumer can actually read in View code, without repo helpers. */
export async function bundleDisplayedExample(page: Page): Promise<void> {
  const files = new Map<string, string>();
  const selector = page.locator('[data-source-file]');
  const paths = await selector.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  for (const path of paths) {
    await selector.selectOption(path);
    files.set(path, await page.locator('.cs-playground__source pre').innerText());
  }
  await build({
    entryPoints: ['main.ts'], bundle: true, write: false, outfile: 'example.js',
    format: 'esm', jsx: 'automatic', logLevel: 'silent',
    external: ['react', 'react-dom', 'react-dom/*', 'react/*', 'vue', 'svelte', 'svelte/*'],
    alias: Object.fromEntries(['index', 'core', 'react', 'vue', 'svelte', 'styles.css'].map((entry) => [
      `comins-sortable${entry === 'index' ? '' : `/${entry}`}`,
      resolve(`dist/${entry === 'styles.css' ? entry : `${entry}.js`}`),
    ])),
    plugins: [{
      name: 'displayed-example',
      setup(context) {
        context.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === 'entry-point') return { path: 'main.ts', namespace: 'docs' };
          if (args.namespace !== 'docs' || !args.path.startsWith('.')) return;
          const raw = args.path.endsWith('?raw');
          const path = posix.normalize(posix.join(posix.dirname(args.importer), args.path.replace(/\?raw$/, '')));
          const resolved = [path, path.replace(/\.js$/, '.ts'), path.replace(/\.js$/, '.tsx')].find((candidate) => files.has(candidate));
          if (resolved === undefined) return { errors: [{ text: `Missing displayed dependency: ${path}` }] };
          return { path: resolved + (raw ? '?raw' : ''), namespace: 'docs', pluginData: { raw } };
        });
        context.onLoad({ filter: /.*/, namespace: 'docs' }, ({ path, pluginData }) => {
          const source = files.get(path.replace(/\?raw$/, ''))!;
          if (pluginData?.raw) return { contents: source, loader: 'text', resolveDir: process.cwd() };
          if (path.endsWith('.svelte')) return {
            contents: compile(source, { filename: path, generate: 'client', css: 'injected' }).js.code,
            loader: 'js', resolveDir: process.cwd(),
          };
          return { contents: source, loader: path.endsWith('.css') ? 'css' : path.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: process.cwd() };
        });
      },
    }],
  });
}
