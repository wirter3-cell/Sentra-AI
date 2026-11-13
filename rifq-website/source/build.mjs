// Builds every page as one self-contained HTML file (three.js bundled, fonts and images inlined):
//   dist/site/index.html     the landing page (choose a path)
//   dist/site/hajj.html      Hajj & Umrah 3D (no pricing)
//   dist/site/alula.html     Tourism 3D in AlUla
//   dist/site/register.html  organisation registration (Firestore)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { build } from 'esbuild';
const root = new URL('.', import.meta.url).pathname;
const fsrc = root + 'node_modules/@fontsource/ibm-plex-sans-arabic/';

let fonts = '/* IBM Plex Sans Arabic — SIL Open Font License 1.1, © IBM Corp. */\n';
for (const w of [400, 500, 600, 700]) {
  const cssText = readFileSync(`${fsrc}${w}.css`, 'utf8');
  for (const block of cssText.split('/*').slice(1)) {
    const name = block.slice(0, block.indexOf('*/')).trim();
    if (!/-(arabic|latin)-\d+-normal$/.test(name)) continue;
    const b64 = readFileSync(`${fsrc}files/${name}.woff2`).toString('base64');
    fonts += block.slice(block.indexOf('@font-face')).trim().replace(/src:[^;]+;/, `src:url(data:font/woff2;base64,${b64}) format('woff2');`) + '\n';
  }
}
const img = (f) => 'data:image/webp;base64,' + readFileSync(root + 'assets/' + f).toString('base64');
const SCREENS = readdirSync(root + 'assets').filter((f) => f.endsWith('.webp') && !f.startsWith('preview-')).sort().map((f) => f.replace('.webp', ''));

async function bundle(entry, banner) {
  const r = await build({ entryPoints: [root + 'src/' + entry], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
  return (banner ? banner + '\n' : '') + r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
}
const THREE_NOTE = '/* three.js — MIT License, © 2010-2025 three.js authors */';
const FIREBASE_NOTE = '/* Firebase JS SDK — Apache License 2.0, © Google LLC */';

async function page({ template, entry, banner, screens, out, extra = {} }) {
  let html = readFileSync(root + 'src/' + template, 'utf8');
  const put = (k, val, required = true) => {
    const parts = html.split(k);
    if (parts.length === 1 && !required) return;
    if (parts.length !== 2) throw new Error(`${template}: placeholder ${k}`);
    html = parts.join(val);
  };
  put('/*__FONTS__*/', fonts);
  if (screens) put('/*__ASSETS__*/', JSON.stringify(Object.fromEntries(screens.map((k) => [k, img(k + '.webp')]))));
  if (entry) put('/*__SCRIPT__*/', await bundle(entry, banner));
  for (const [k, v] of Object.entries(extra)) put(k, v);
  mkdirSync(root + out.replace(/[^/]+$/, ''), { recursive: true });
  writeFileSync(root + out, html);
  console.log('wrote', out, (html.length / 1024 / 1024).toFixed(2), 'MB');
}

await page({ template: 'hajj.html', entry: 'scene.js', banner: THREE_NOTE, screens: SCREENS, out: 'dist/site/hajj.html' });
await page({ template: 'alula.html', entry: 'alula.js', banner: THREE_NOTE, screens: ['sos', 'sup-map', 'map', 'emergency'], out: 'dist/site/alula.html' });
await page({ template: 'register.html', entry: 'register.js', banner: FIREBASE_NOTE, out: 'dist/site/register.html' });
if (existsSync(root + 'src/index.html')) {
  const prev = (k) => (existsSync(root + `assets/preview-${k}.webp`) ? img(`preview-${k}.webp`) : '');
  await page({ template: 'index.html', out: 'dist/site/index.html', extra: { __PREVIEW_HAJJ__: prev('hajj'), __PREVIEW_ALULA__: prev('alula') } });
}
