import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  basename,
  dirname,
  join,
  relative,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const featureGuideNames = [
  '07-reorder-transfer.md',
  '08-copy-clone.md',
  '09-handle-acceptance.md',
  '10-animation-auto-scroll.md',
  '11-hosts-slots.md',
  '12-nested-tree.md',
  '13-placeholder.md',
  '14-lifecycle-errors.md',
];
const locales = [
  { directory: 'user', heading: '## Complete example' },
  { directory: 'ko', heading: '## 전체 예제' },
];

function extractCompleteExample(rootDir, relativePath, heading) {
  const source = readFileSync(join(rootDir, relativePath), 'utf8');
  const headingIndex = source.indexOf(heading);
  if (headingIndex < 0) {
    throw new Error(`${relativePath}: complete example heading is missing`);
  }

  const block = source.slice(headingIndex + heading.length).match(
    /^\s*```(tsx|ts)\r?\n([\s\S]*?)\r?\n```/,
  );
  if (!block) {
    throw new Error(`${relativePath}: TypeScript example block is missing`);
  }

  return { language: block[1], source: block[2] };
}

export function checkUserGuideExamples(options = {}) {
  const rootDir = options.rootDir ?? root;
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'comins-sortable-guide-examples-'));

  try {
    const files = [];
    for (const locale of locales) {
      for (const guideName of featureGuideNames) {
        const relativePath = join('docs', locale.directory, guideName);
        const example = extractCompleteExample(rootDir, relativePath, locale.heading);
        const outputName = `${locale.directory}-${basename(guideName, '.md')}.${example.language}`;
        const outputPath = join(temporaryRoot, outputName);
        writeFileSync(outputPath, `${example.source}\n`, 'utf8');
        files.push(outputPath);
      }
    }

    const stylesheetTypes = join(temporaryRoot, 'styles.d.ts');
    writeFileSync(
      stylesheetTypes,
      "declare module 'comins-sortable/styles.css';\n",
      'utf8',
    );
    files.push(stylesheetTypes);

    const configPath = join(temporaryRoot, 'tsconfig.json');
    const repositoryPath = relative(temporaryRoot, rootDir).replaceAll('\\', '/');
    writeFileSync(configPath, `${JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        strict: true,
        noUncheckedIndexedAccess: true,
        jsx: 'react-jsx',
        noEmit: true,
        skipLibCheck: true,
        paths: {
          'comins-sortable/core': [`${repositoryPath}/src/core.ts`],
          'comins-sortable/react': [`${repositoryPath}/src/react.ts`],
          react: [`${repositoryPath}/node_modules/@types/react/index.d.ts`],
          'react/*': [`${repositoryPath}/node_modules/@types/react/*`],
        },
      },
      files,
    }, null, 2)}\n`, 'utf8');

    const compilerPath = join(rootDir, 'node_modules', 'typescript', 'bin', 'tsc');
    const result = spawnSync(
      process.execPath,
      [compilerPath, '--project', configPath, '--pretty', 'false'],
      { cwd: rootDir, encoding: 'utf8' },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      const diagnostics = `${result.stdout}${result.stderr}`.trim();
      throw new Error(diagnostics || 'TypeScript example compilation failed');
    }

    return { examples: files.length - 1 };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkUserGuideExamples();
    process.stdout.write(`user-guide-example-check: ${result.examples} examples passed\n`);
  } catch (error) {
    process.stderr.write('user-guide-example-check: failed\n');
    if (error instanceof Error && error.message) {
      process.stderr.write(`${error.message}\n`);
    }
    process.exitCode = 1;
  }
}
