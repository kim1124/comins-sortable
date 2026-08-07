import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const compiler = join(root, 'node_modules', 'typescript', 'bin', 'tsc');

await rm(dist, { recursive: true, force: true });
execFileSync(process.execPath, [compiler, '-p', 'tsconfig.build.json'], {
  cwd: root,
  stdio: 'inherit',
});

const styles = join(root, 'src', 'styles.css');
if (existsSync(styles)) {
  await mkdir(dist, { recursive: true });
  await copyFile(styles, join(dist, 'styles.css'));
}
