import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const files = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(full);
  }
}
for (const folder of ['src', 'scripts', 'tests']) {
  try { await walk(resolve(root, folder)); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.webmanifest'), 'utf8'));
if (!manifest.name || !manifest.start_url || !Array.isArray(manifest.icons) || !manifest.icons.length) throw new Error('PWA manifest is incomplete.');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const path of ['./styles.css', './manifest.webmanifest', './src/app.js', './sw.js']) {
  if (!html.includes(path) && path !== './sw.js') throw new Error(`index.html does not reference ${path}`);
}
for (const icon of manifest.icons) {
  const path = resolve(root, icon.src.replace(/^\.\//, ''));
  await access(path);
}
const serviceWorker = await readFile(resolve(root, 'sw.js'), 'utf8');
const shellMatch = serviceWorker.match(/const APP_SHELL\s*=\s*\[([\s\S]*?)\];/);
if (!shellMatch) throw new Error('The service worker app-shell list is missing.');
const shellPaths = [...shellMatch[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
for (const path of shellPaths) {
  await access(resolve(root, path.replace(/^\.\//, '')));
}
console.log(`Syntax and project checks passed (${files.length} JavaScript files and ${shellPaths.length} offline assets checked).`);
