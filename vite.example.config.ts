import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { compile } from 'svelte/compiler';
import { defineConfig, type Plugin } from 'vite';

const projectRoot = import.meta.dirname;
const exampleRoot = resolve(projectRoot, 'example');

function sveltePlaygroundPlugin(): Plugin {
  return {
    name: 'comins-sortable-svelte-playground',
    async transform(_, id) {
      if (!id.endsWith('.svelte')) return null;
      const source = await readFile(id, 'utf8');
      const compiled = compile(source, {
        filename: id,
        generate: 'client',
        css: 'injected',
      });
      return { code: compiled.js.code, map: compiled.js.map ?? null };
    },
  };
}

export default defineConfig({
  root: exampleRoot,
  plugins: [sveltePlaygroundPlugin()],
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  server: {
    host: '127.0.0.1',
    port: 4003,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4003,
    strictPort: true,
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(projectRoot, '.playground-dist'),
    target: 'es2020',
  },
});
