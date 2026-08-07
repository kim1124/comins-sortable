import { execFileSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = globSync('test/unit/**/*.test.ts', { cwd: root }).sort();

if (files.length === 0) throw new Error('unit test files are missing');

execFileSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
  cwd: root,
  stdio: 'inherit',
});
