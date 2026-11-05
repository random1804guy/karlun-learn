import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const out = resolve(root, 'dist');
const required = ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js', 'src', 'public'];
for (const item of required) {
  try { await stat(resolve(root, item)); }
  catch { throw new Error(`Build input is missing: ${item}`); }
}
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const item of required) {
  await cp(resolve(root, item), resolve(out, item), { recursive: true });
}
console.log(`Built Karlun Learn into ${out}`);
console.log('This static build is ready for HTTPS hosting (for example, GitHub Pages).');
