#!/usr/bin/env node
// Maakt public/og-heffingenscan.png (1200 × 630), de algemene deelafbeelding van de Heffingenscan, in huisstijl 2.2:
// wit vlak, logo linksboven, titel als Inkt-tekstbalk met afgesneden hoek, huisstijlelement rechts.
// Gebruik:  PW_CHROME=/pad/naar/chromium node scripts/og-heffingenscan.mjs
// (zonder PW_CHROME gebruikt Playwright zijn eigen browser). De afbeelding is ingecheckt; draai dit script alleen
// opnieuw als titel of huisstijl verandert.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');
const bestand = (p) => readFileSync(join(PROJECT, 'public', p));
const data = (p, type) => `data:${type};base64,${bestand(p).toString('base64')}`;
const font = (gewicht) => `@font-face{font-family:'Poppins';font-weight:${gewicht};src:url(${data(`fonts/poppins-latin-${gewicht}-normal.woff2`, 'font/woff2')}) format('woff2');}`;

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><style>
${[400, 600, 700].map(font).join('\n')}
:root{--inkt:#5760a6;--purper:#9462a6;--violet:#b8aed6;--diepblauw:#007db5;--tekst:#111827}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#fff;font-family:'Poppins',sans-serif;color:var(--tekst);position:relative;overflow:hidden}
.logo{position:absolute;left:56px;top:0;width:160px;height:160px}
.element{position:absolute;right:0;top:0;width:520px;height:190px}
.element i{position:absolute;top:0;height:100%;transform:skewX(-35deg);transform-origin:top}
.balk{position:absolute;left:56px;top:200px;width:1000px;background:var(--inkt);color:#fff;font-weight:700;font-size:54px;line-height:1.22;padding:28px 150px 32px 40px;
 clip-path:polygon(0 0,100% 0,100% calc(100% - 80px),calc(100% - 80px) 100%,0 100%)}
.sub{position:absolute;left:56px;top:440px;font-size:27px;font-weight:600;color:var(--inkt);width:1090px}
.sub span{color:var(--diepblauw)}
.voet{position:absolute;left:56px;bottom:30px;font-size:20px;color:#4b5563}
</style></head><body>
<img class="logo" src="${data('logo-kplusv-512.png', 'image/png')}" alt="">
<div class="element" aria-hidden="true"><i style="left:180px;width:130px;background:var(--inkt)"></i><i style="left:300px;width:130px;background:var(--violet)"></i><i style="left:420px;width:130px;background:var(--purper)"></i></div>
<div class="balk">Wat kosten de heffingen op restafval uw gemeente?</div>
<div class="sub">Heffingenscan restafval <span>· afvalstoffenbelasting en CO2-heffing tot 2035</span></div>
<div class="voet">KplusV · Indicatief, prijspeil 2026 · Gratis voor elke gemeente</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, locale: 'nl-NL' });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: join(PROJECT, 'public', 'og-heffingenscan.png') });
await browser.close();
console.log('public/og-heffingenscan.png geschreven (1200 × 630)');
