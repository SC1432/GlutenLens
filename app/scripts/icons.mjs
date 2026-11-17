// Renders public/favicon.svg to the PNG icons the manifest and iOS need.
// Uses the Playwright Chromium installed in the dev environment.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Playwright isn't a project dependency; resolve the globally installed one.
const { chromium } = createRequire(import.meta.url)('playwright');

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

const targets = [
  { name: 'pwa-192.png', size: 192, pad: 0, radius: true },
  { name: 'pwa-512.png', size: 512, pad: 0, radius: true },
  // Maskable: full-bleed background, artwork inside the 80% safe zone.
  { name: 'pwa-maskable-512.png', size: 512, pad: 0.12, radius: false },
  // iOS applies its own corner mask; give it a square, full-bleed icon.
  { name: 'apple-touch-icon.png', size: 180, pad: 0, radius: false },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  const art = t.radius ? svg : svg.replace('rx="112"', 'rx="0"');
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<body style="margin:0;background:#1f5f4a;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">
       <div style="width:${inner}px;height:${inner}px">${art.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
     </body>`,
  );
  await page.screenshot({ path: out(t.name), omitBackground: t.radius });
}
await browser.close();
console.log('icons written');
