#!/usr/bin/env node
// Haalt de gegeneraliseerde gemeentegrenzen op bij PDOK (CBS Gebiedsindelingen, OGC API Features)
// en schrijft een lichte GeoJSON naar public/data/gemeentegrenzen.geojson.
// De bronvermelding komt in src/data/gemeentegrenzen-bron.json (klein, wordt meegebundeld).
//
// Gebruik:            node scripts/pdok-gemeentegrenzen.mjs          (jaar = peiljaar in src/data/afval-gemeenten.json)
//                     node scripts/pdok-gemeentegrenzen.mjs 2024
// Achter een proxy:   NODE_USE_ENV_PROXY=1 node scripts/pdok-gemeentegrenzen.mjs
//
// Lichter maken zonder gaten tussen buurgemeenten:
// 1. Gedeelde grenzen worden opgesplitst in stukken tussen knooppunten (punten waar drie of meer
//    gemeenten of de buitenrand samenkomen). Beide buren krijgen hetzelfde vereenvoudigde stuk.
// 2. Elk stuk wordt vereenvoudigd met Douglas-Peucker (TOLERANTIE in graden).
// 3. Coördinaten worden afgerond op 4 decimalen (ca. 7 tot 11 meter).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const UIT_GEO = join(WORTEL, 'public', 'data', 'gemeentegrenzen.geojson');
const UIT_BRON = join(WORTEL, 'src', 'data', 'gemeentegrenzen-bron.json');
const BASIS = 'https://api.pdok.nl/cbs/gebiedsindelingen/ogc/v1';
const COLLECTIE = 'gemeente_gegeneraliseerd';
const TOLERANTIE = 0.0015;
const DECIMALEN = 4;

async function haal(url, pogingen = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/geo+json, application/json' }, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (fout) {
      if (i >= pogingen) throw new Error(`Ophalen mislukt (${url}): ${fout.message}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function bepaalJaar() {
  const arg = Number(process.argv[2]);
  if (arg) return arg;
  try {
    const afval = JSON.parse(await readFile(join(WORTEL, 'src', 'data', 'afval-gemeenten.json'), 'utf8'));
    return afval.peiljaar;
  } catch {
    throw new Error('Geef een jaar op of draai eerst scripts/cbs-afval-gemeenten.mjs.');
  }
}

/** Afstand van punt p tot lijnstuk a-b (in graden, voldoende voor vereenvoudigen). */
function afstand(p, a, b) {
  const [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function douglasPeucker(punten, tol) {
  if (punten.length <= 2) return punten;
  const houd = new Uint8Array(punten.length);
  houd[0] = houd[punten.length - 1] = 1;
  const stapel = [[0, punten.length - 1]];
  while (stapel.length) {
    const [van, tot] = stapel.pop();
    let max = 0;
    let idx = -1;
    for (let i = van + 1; i < tot; i++) {
      const d = afstand(punten[i], punten[van], punten[tot]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (idx !== -1 && max > tol) {
      houd[idx] = 1;
      stapel.push([van, idx], [idx, tot]);
    }
  }
  return punten.filter((_, i) => houd[i]);
}

const sleutel = (p) => `${p[0]},${p[1]}`;

/** Oppervlakte van een ring (graden², alleen voor het weggooien van splinters). */
function oppervlakte(ring) {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(s / 2);
}

function vereenvoudig(features) {
  // Alle ringen verzamelen met een uniek nummer.
  const ringen = [];
  for (const f of features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) ringen.push(ring);
  }
  // Per punt: in welke ringen komt het voor?
  const gebruik = new Map();
  ringen.forEach((ring, r) => {
    for (let i = 0; i < ring.length - 1; i++) {
      const k = sleutel(ring[i]);
      const set = gebruik.get(k) ?? new Set();
      set.add(r);
      gebruik.set(k, set);
    }
  });
  const handtekening = (p) => [...gebruik.get(sleutel(p))].sort((a, b) => a - b).join('|');

  const cache = new Map();
  const nieuweRingen = ringen.map((ring) => {
    const open = ring.slice(0, -1);
    const n = open.length;
    // Knooppunt: de verzameling ringen verandert ten opzichte van een buurpunt.
    const knoop = open.map((p, i) => {
      const h = handtekening(p);
      return h !== handtekening(open[(i - 1 + n) % n]) || h !== handtekening(open[(i + 1) % n]);
    });
    let start = knoop.indexOf(true);
    if (start === -1) {
      // Geen knooppunten (eiland zonder buren): hele ring als één stuk.
      const vereenvoudigd = douglasPeucker(ring, TOLERANTIE);
      return vereenvoudigd.length >= 4 ? vereenvoudigd : ring;
    }
    const uit = [];
    let i = start;
    do {
      const stuk = [open[i]];
      let j = (i + 1) % n;
      while (!knoop[j]) {
        stuk.push(open[j]);
        j = (j + 1) % n;
      }
      stuk.push(open[j]);
      // Zelfde stuk in omgekeerde richting bij de buurgemeente: één keer vereenvoudigen.
      const voor = stuk.map(sleutel).join(';');
      const terug = [...stuk].reverse().map(sleutel).join(';');
      let v = cache.get(voor);
      if (!v) {
        const omgekeerd = cache.get(terug);
        v = omgekeerd ? [...omgekeerd].reverse() : douglasPeucker(stuk, TOLERANTIE);
        cache.set(voor, v);
      }
      uit.push(...v.slice(0, -1));
      i = j;
    } while (i !== start);
    uit.push(uit[0]);
    return uit.length >= 4 ? uit : ring;
  });

  // Terugzetten in de features, afronden en splinters weglaten.
  const f = 10 ** DECIMALEN;
  const rond = (p) => [Math.round(p[0] * f) / f, Math.round(p[1] * f) / f];
  let r = 0;
  return features.map((feat) => {
    const isPoly = feat.geometry.type === 'Polygon';
    const polys = isPoly ? [feat.geometry.coordinates] : feat.geometry.coordinates;
    const nieuw = polys
      .map((poly) =>
        poly
          .map(() => nieuweRingen[r++])
          .map((ring) => ring.map(rond).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1])),
      )
      .filter((poly) => poly[0].length >= 4 && oppervlakte(poly[0]) > 1e-7)
      .map((poly) => [poly[0], ...poly.slice(1).filter((gat) => gat.length >= 4)]);
    return {
      type: 'Feature',
      properties: { code: feat.properties.statcode, naam: feat.properties.statnaam },
      geometry: { type: 'MultiPolygon', coordinates: nieuw },
    };
  });
}

async function main() {
  const jaar = await bepaalJaar();
  const url = `${BASIS}/collections/${COLLECTIE}/items?f=json&limit=1000&jaarcode=${jaar}`;
  console.log(`Ophalen ${url}`);
  const features = [];
  let volgende = url;
  while (volgende) {
    const json = await haal(volgende);
    features.push(...json.features);
    volgende = json.links?.find((l) => l.rel === 'next')?.href ?? null;
  }
  if (features.length < 300) throw new Error(`Te weinig gemeenten ontvangen (${features.length}).`);
  const collectie = await haal(`${BASIS}/collections/${COLLECTIE}?f=json`);

  const punten = (fs) => fs.reduce((s, f) => s + JSON.stringify(f.geometry.coordinates).split('],[').length, 0);
  const licht = vereenvoudig(features).sort((a, b) => a.properties.code.localeCompare(b.properties.code));
  const geojson = { type: 'FeatureCollection', features: licht };
  const tekst = JSON.stringify(geojson);

  const bron = {
    jaar,
    aantal: licht.length,
    opgehaald: new Date().toISOString().slice(0, 10),
    uitgever: 'CBS en Kadaster via PDOK',
    titel: `CBS Gebiedsindelingen, ${collectie.title ?? COLLECTIE} (jaarcode ${jaar})`,
    url: 'https://www.pdok.nl/ogc-apis/-/article/cbs-gebiedsindelingen',
    api: url,
    licentie: 'CC BY 4.0 (zie PDOK-datasetpagina)',
    bewerking: `Vereenvoudigd met Douglas-Peucker (tolerantie ${TOLERANTIE} graden, gedeelde grenzen gelijk gehouden) en afgerond op ${DECIMALEN} decimalen.`,
    bestand: '/data/gemeentegrenzen.geojson',
    bytes: Buffer.byteLength(tekst),
  };
  await mkdir(dirname(UIT_GEO), { recursive: true });
  await writeFile(UIT_GEO, tekst);
  await writeFile(UIT_BRON, `${JSON.stringify(bron, null, 2)}\n`);
  console.log(`${licht.length} gemeenten, ${punten(features)} → ${punten(licht)} punten, ${Math.round(bron.bytes / 1024)} kB`);
}

main().catch((fout) => {
  console.error(fout.message);
  process.exit(1);
});
