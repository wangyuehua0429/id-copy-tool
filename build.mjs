import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { build as esbuild } from 'esbuild';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('./', import.meta.url);

const pkg       = JSON.parse(await readFile(new URL('package.json', ROOT), 'utf8'));
const VERSION   = pkg.version;
const AUTHOR    = 'WYH';
const REPO_NAME = pkg.name || 'id-copy-watermark-tool';

const template = await readFile(new URL('src/index.template.html', ROOT), 'utf8');
const css      = await readFile(new URL('src/styles.css',           ROOT), 'utf8');
const vendor   = await readFile(new URL('vendor/pdf-lib.min.js',    ROOT), 'utf8');

const bundle = await esbuild({
  entryPoints: [fileURLToPath(new URL('src/main.js', ROOT))],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
  legalComments: 'none'
});
const app = bundle.outputFiles[0].text;

const html = template
  .replace('/* INLINE:CSS */',    () => css)
  .replace('/* INLINE:VENDOR */', () => vendor)
  .replace('/* INLINE:APP */',    () => app)
  .replaceAll('{{VERSION}}',      VERSION)
  .replaceAll('{{AUTHOR}}',       AUTHOR);

await mkdir(new URL('dist/', ROOT), { recursive: true });
await writeFile(new URL('dist/index.html', ROOT), html);
// 同步一份到仓库根的"中文名 artifact"，方便双击打开
await writeFile(new URL('证件复印小工具.html', ROOT), html);

const sizeKb = (html.length / 1024).toFixed(1);
console.log(`dist/index.html written (${sizeKb} KB, v${VERSION})`);
console.log(`证件复印小工具.html synced (${sizeKb} KB, v${VERSION})`);
