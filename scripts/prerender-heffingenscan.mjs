#!/usr/bin/env node
// Maakt van de SPA-build een eigen HTML-pagina per gemeente, zodat een gedeelde link (LinkedIn, mail, zoekmachine)
// een eigen titel, beschrijving en deelafbeelding heeft. De pagina bevat ook een korte statische samenvatting in
// #root; React vervangt die zodra de app laadt.
//
// Gebruik (draait aan het eind van `npm run build`):
//   node scripts/prerender-heffingenscan.mjs                 schrijft in dist/
//   node scripts/prerender-heffingenscan.mjs --dist=/pad     andere buildmap (bijv. na `vite build --outDir ...`)
//
// Omgeving
//   URL                  Basis-URL van de site (Netlify zet die), bijv. https://voorbeeld.netlify.app. Zonder URL staan
//                        canonical en deelafbeelding als relatief pad; dat werkt in de browser maar niet voor crawlers.
//   VITE_INDEXEERBAAR    "true" = de site mag worden geïndexeerd: robots.txt gaat open en sitemap.xml wordt geschreven
//                        (de noindex-meta haalt vite.config.ts bij dezelfde schakelaar weg). Standaard uit. Vereist URL.
//
// De rekenlogica komt via de Vite-API (createServer + ssrLoadModule); er is geen extra pakket nodig.
// Elke gemeente krijgt dist/heffingenscan/<slug>/index.html, en elke alias (den-haag) ook, met canonical naar de slug.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, loadEnv } from 'vite';

const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argument = (naam) => process.argv.find((a) => a.startsWith(`--${naam}=`))?.split('=').slice(1).join('=');
const DIST = resolve(PROJECT, argument('dist') ?? 'dist');

const env = { ...loadEnv('production', PROJECT, 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))) };
const indexeerbaar = env.VITE_INDEXEERBAAR === 'true';
const basis = (process.env.URL ?? '').replace(/\/+$/, '');

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`prerender-heffingenscan: ${join(DIST, 'index.html')} bestaat niet. Bouw eerst met vite build.`);
  process.exit(1);
}
if (indexeerbaar && !basis) {
  console.error('prerender-heffingenscan: VITE_INDEXEERBAAR=true vraagt om de omgevingsvariabele URL (voor de sitemap), bijvoorbeeld URL=https://www.voorbeeld.nl');
  process.exit(1);
}


/**
 * Preload-links voor de lazy pagina-chunk en alles wat die nodig heeft. Zonder deze links ontdekt de browser de chunk pas
 * als index-*.js is uitgevoerd; met de links laadt hij parallel en staat de pagina eerder in beeld.
 * De lijst komt uit de __vite__mapDeps-aanroep van de route in index-*.js (Vite 5).
 */
async function preloadLinks(dist, routeNaam) {
  const assets = await readdir(join(dist, 'assets')).catch(() => []);
  const indexBestand = assets.find((f) => /^index-.*\.js$/.test(f));
  if (!indexBestand) return '';
  const code = await readFile(join(dist, 'assets', indexBestand), 'utf8');
  const lijst = /m\.f\|\|\(m\.f=\[([^\]]*)\]\)/.exec(code)?.[1];
  const aanroep = new RegExp(`import\\("\\./${routeNaam}-[\\w-]+\\.js"\\),__vite__mapDeps\\(\\[([\\d,]+)\\]\\)`).exec(code)?.[1];
  if (!lijst || !aanroep) return '';
  const namen = [...lijst.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return aanroep
    .split(',')
    .map((i) => namen[Number(i)])
    .filter(Boolean)
    .map((n) => (n.endsWith('.css') ? `<link rel="preload" as="style" crossorigin href="/${n}" />` : `<link rel="modulepreload" crossorigin href="/${n}" />`))
    .join('\n    ');
}

const server = await createServer({ root: PROJECT, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true } });
try {
  const calc = await server.ssrLoadModule('/src/lib/calc/heffingen.ts');
  const dataMod = await server.ssrLoadModule('/src/data/heffingen-gemeenten.ts');
  const tarieven = await server.ssrLoadModule('/src/data/heffingen-tarieven.ts');
  const fmt = await server.ssrLoadModule('/src/lib/format.ts');
  const { euro, getal } = fmt;
  const gemeenten = dataMod.heffingGemeenten;
  const sjabloon = await readFile(join(DIST, 'index.html'), 'utf8');
  const afbeelding = `${basis}/og-heffingenscan.png`;
  const status = tarieven.wetsstatus.kort;
  const preloadGemeente = await preloadLinks(DIST, 'HeffingenscanGemeente');
  const preloadLijst = await preloadLinks(DIST, 'Heffingenscan');
  const pad = tarieven.heffingPaden[tarieven.heffingStandaard.pad];

  /** Zet titel, beschrijving, canonical, Open Graph en samenvatting in een kopie van index.html. */
  function maakPagina({ titel, beschrijving, canonicalPad, samenvatting, preload = '' }) {
    const url = `${basis}${canonicalPad}`;
    const tags = [
      `<link rel="canonical" href="${esc(url)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:locale" content="nl_NL" />`,
      `<meta property="og:site_name" content="KplusV, Restafvalkaart" />`,
      `<meta property="og:title" content="${esc(titel)}" />`,
      `<meta property="og:description" content="${esc(beschrijving)}" />`,
      `<meta property="og:url" content="${esc(url)}" />`,
      `<meta property="og:image" content="${esc(afbeelding)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="Heffingenscan restafval van KplusV: wat kosten de heffingen op restafval uw gemeente?" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(titel)}" />`,
      `<meta name="twitter:description" content="${esc(beschrijving)}" />`,
      `<meta name="twitter:image" content="${esc(afbeelding)}" />`,
    ]
      .concat(preload ? [preload] : [])
      .join('\n    ');
    let html = sjabloon;
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titel)}</title>`);
    html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(beschrijving)}" />`);
    html = html.replace('</head>', `    ${tags}\n  </head>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${samenvatting}</div>`);
    if (!html.includes(esc(titel)) || !html.includes('rel="canonical"') || !html.includes(samenvatting.slice(0, 30))) throw new Error(`Pagina ${canonicalPad} is niet goed opgebouwd`);
    return html;
  }

  const tabelRegel = (jaar, r) => `<tr><th scope="row">${jaar}</th><td>${esc(euro(r.totaal))}</td><td>${esc(euro(r.perHuishouden))}</td></tr>`;

  let aantal = 0;
  // Sitemap: de openbare pagina's van de site (niet: inloggen, account en aanmelden), dan de Heffingenscan per gemeente.
  const stromenMod = await server.ssrLoadModule('/src/data/stromen.ts');
  const openbaar = [
    '/',
    '/heffingenscan',
    '/stromen',
    ...stromenMod.stromen.map((s) => `/stromen/${s.id}`),
    '/restafvalkaart',
    '/tools',
    '/tools/aanbestedingstool',
    '/tools/indexcalculator',
    '/tools/co2-heffingenscan',
    '/tools/bodemassencalculator',
    '/tools/pmd-rekenmodel',
    '/aanbestedingsarchief',
    '/kennisbank',
    '/nieuws',
    '/lidmaatschap',
    '/over-het-platform',
    '/algemene-voorwaarden',
    '/privacy',
    '/cookies',
    '/toegankelijkheid',
    '/disclaimer',
  ];
  const sitemap = openbaar.map((pad) => (pad === '/' ? `${basis}/` : `${basis}${pad}`));
  for (const g of gemeenten) {
    const invoer = calc.standaardInvoer(g);
    const v = calc.vergelijkPaden(invoer);
    const r26 = calc.jaarUit(v.gekozen, 2026);
    const r30 = calc.jaarUit(v.gekozen, 2030);
    const r35 = calc.jaarUit(v.gekozen, 2035);
    const titel = `Heffingenscan ${g.naam}: ${euro(r35.totaal)} aan heffingen op restafval in 2035`;
    const beschrijving = `Wat kosten de afvalstoffenbelasting en de CO2-heffing op afvalverbranding ${g.naam} tot 2035? In 2026 ${euro(r26.totaal)}, in 2035 ${euro(r35.totaal)} (${euro(r35.perHuishouden)} per huishouden). Indicatief, prijspeil ${tarieven.PRIJSPEIL}.`;
    // Zelfde klassen en tekst als de intro van de app (wrap, intro, balk): het eerste beeld verspringt dan niet en de
    // browser telt deze tekst al als grootste element, ook voordat de app geladen is.
    const intro = `${esc(g.naam)} heeft ${esc(getal(g.inwoners))} inwoners en ${esc(getal(g.huishoudens))} huishoudens en ${esc(getal(g.fijn, 1))} kg fijn restafval per inwoner. De berekening volgt het tariefpad van het ${pad.status === 'wetsvoorstel' ? 'wetsvoorstel ' : ''}${esc(pad.naam)}, in prijspeil ${tarieven.PRIJSPEIL}. Het is een indicatieve berekening.`;
    const samenvatting =
      `<main class="wrap hs-statisch"><div class="hs-pagina stapel"><section class="intro"><h1 class="balk inkt">Heffingenscan restafval: ${esc(g.naam)}</h1><p>${intro}</p></section>` +
      `<p>In 2035 kosten de afvalstoffenbelasting en de CO2-heffing op afvalverbranding ${esc(g.naam)} ${esc(euro(r35.totaal))} per jaar, tegen ${esc(euro(r26.totaal))} in 2026.</p>` +
      `<div class="tabel-container"><table><caption>Heffingen op restafval, ${esc(g.naam)}</caption><thead><tr><th scope="col">Jaar</th><th scope="col">Totaal</th><th scope="col">Per huishouden</th></tr></thead><tbody>${tabelRegel(2026, r26)}${tabelRegel(2030, r30)}${tabelRegel(2035, r35)}</tbody></table></div>` +
      `<p>${esc(status)}${g.nascheiding !== null ? ' CBS meldt nascheiding voor deze gemeente: de bedragen zijn een bovengrens.' : ''}</p>` +
      `<p><a href="/heffingenscan">Heffingenscan restafval voor alle gemeenten</a></p></div></main>`;
    const mappen = [g.slug, ...g.aliassen];
    for (const slug of mappen) {
      const html = maakPagina({ titel, beschrijving, canonicalPad: `/heffingenscan/${g.slug}`, samenvatting, preload: preloadGemeente });
      const map = join(DIST, 'heffingenscan', slug);
      await mkdir(map, { recursive: true });
      await writeFile(join(map, 'index.html'), html);
      aantal++;
    }
    sitemap.push(`${basis}/heffingenscan/${g.slug}`);
  }

  // Overzichtspagina.
  const land = calc.landelijkTotaal(gemeenten);
  const l26 = land.jaren[0];
  const l35 = land.jaren[land.jaren.length - 1];
  const titelLijst = 'Heffingenscan restafval: wat kosten de heffingen uw gemeente?';
  const beschrijvingLijst = `Wat kosten de afvalstoffenbelasting en de CO2-heffing op afvalverbranding uw gemeente tot 2035? Kies uw gemeente en zie het in totaal en per huishouden. Alle gemeenten samen: ${euro(l35.totaal / 1e6)} miljoen euro in 2035 (bovengrens). Gratis, indicatief.`;
  const lijstSamenvatting =
    `<main class="wrap hs-statisch"><div class="hs-pagina stapel"><section class="intro"><h1 class="balk inkt">Heffingenscan restafval</h1><p>Wat kosten de afvalstoffenbelasting en de CO2-heffing op afvalverbranding uw gemeente tot 2035? Kies uw gemeente en zie het in totaal en per huishouden. De scan is gratis en vraagt geen account.</p></section>` +
    `<p>Alle ${gemeenten.length} gemeenten samen: ${esc(euro(l26.totaal / 1e6))} miljoen euro in 2026 en ${esc(euro(l35.totaal / 1e6))} miljoen in 2035, een bovengrens in prijspeil ${tarieven.PRIJSPEIL}. ${esc(status)}</p></div></main>`;
  await mkdir(join(DIST, 'heffingenscan'), { recursive: true });
  await writeFile(join(DIST, 'heffingenscan', 'index.html'), maakPagina({ titel: titelLijst, beschrijving: beschrijvingLijst, canonicalPad: '/heffingenscan', samenvatting: lijstSamenvatting, preload: preloadLijst }));

  if (indexeerbaar) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
    await writeFile(join(DIST, 'sitemap.xml'), xml);
    await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${basis}/sitemap.xml\n`);
  }

  console.log(`prerender-heffingenscan: ${aantal} gemeentepagina's (incl. aliassen) en het overzicht in ${DIST}; basis-URL ${basis || '(relatief)'}; indexeerbaar: ${indexeerbaar ? 'ja, robots.txt en sitemap.xml geschreven' : 'nee'}`);
} finally {
  await server.close();
}
