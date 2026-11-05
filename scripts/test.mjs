import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const folder = resolve(process.cwd(), 'tests');
const files = (await readdir(folder)).filter((name) => name.endsWith('.test.mjs')).map((name) => join(folder, name));
if (!files.length) {
  console.error('No test files were found.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
