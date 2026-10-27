#!/usr/bin/env node
// Zet de gemeentegrenzen (public/data/gemeentegrenzen.geojson, gemaakt door pdok-gemeentegrenzen.mjs)
// om in SVG-paden voor de Restafvalkaart: public/data/gemeentekaart.json.
//
// Waarom: de kaart tekent de gemeenten als gewone SVG-vlakken, zonder kaartbibliotheek (Leaflet).
// Dat scheelt ruim 200 kB JavaScript, de pagina verschijnt direct en de vlakken zijn geen
// tabstops. De paden zijn al geprojecteerd en afgerond, zodat de browser niets hoeft te rekenen.
//
// Gebruik:  node scripts/pdok-gemeentekaart.mjs            (draait ook aan het eind van pdok-gemeentegrenzen.mjs)
//
// Projectie: equirectangulair met cos(52,15°) als breedtecorrectie. Op de schaal van Nederland is het
// verschil met RD (EPSG:28992) kleiner dan een pixel per gemeente; RD-omrekening is daarom niet nodig.
// Coördinaten: gehele getallen in een vak van BREEDTE eenheden breed (1 eenheid ≈ 130 meter),
// relatieve padcommando's (l) om het bestand klein te houden.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const WORTEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const IN = join(WORTEL, 'public', 'data', 'gemeentegrenzen.geojson');
const UIT = join(WORTEL, 'public', 'data', 'gemeentekaart.json');
const BREEDTE = 2000;
const MARGE = 10;
const COS = Math.cos((52.15 * Math.PI) / 180);

/** Zet een GeoJSON-collectie (MultiPolygon per gemeente, WGS84) om in SVG-paden. */
export function naarSvgKaart(geojson) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const f of geojson.features)
    for (const poly of f.geometry.coordinates)
      for (const ring of poly)
        for (const [lon, lat] of ring) {
          const x = lon * COS;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, -lat);
          maxY = Math.max(maxY, -lat);
        }
  const schaal = (BREEDTE - 2 * MARGE) / (maxX - minX);
  const hoogte = Math.round((maxY - minY) * schaal + 2 * MARGE);
  const px = (lon) => Math.round((lon * COS - minX) * schaal + MARGE);
  const py = (lat) => Math.round((-lat - minY) * schaal + MARGE);

  const gemeenten = geojson.features.map((f) => {
    let d = '';
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const poly of f.geometry.coordinates) {
      for (const ring of poly) {
        const punten = ring
          .map(([lon, lat]) => [px(lon), py(lat)])
          .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
        // Laatste punt = eerste punt: "z" sluit de ring.
        if (punten.length > 1 && punten[0][0] === punten.at(-1)[0] && punten[0][1] === punten.at(-1)[1]) punten.pop();
        if (punten.length < 3) continue;
        let [vx, vy] = punten[0];
        d += `M${vx} ${vy}l`;
        const stappen = [];
        for (const [x, y] of punten.slice(1)) {
          stappen.push(`${x - vx} ${y - vy}`);
          vx = x;
          vy = y;
        }
        // Compact: positieve getallen na een spatie, negatieve met hun eigen minteken.
        d += stappen.join(' ').replace(/ -/g, '-') + 'z';
        for (const [x, y] of punten) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
      }
    }
    return { c: f.properties.code, n: f.properties.naam, b: [x0, y0, x1, y1], d };
  });
  return { breedte: BREEDTE, hoogte, gemeenten };
}

async function main() {
  const geojson = JSON.parse(await readFile(IN, 'utf8'));
  const kaart = naarSvgKaart(geojson);
  const tekst = `{"breedte":${kaart.breedte},"hoogte":${kaart.hoogte},"gemeenten":[\n${kaart.gemeenten.map((g) => JSON.stringify(g)).join(',\n')}\n]}\n`;
  await writeFile(UIT, tekst);
  console.log(`${kaart.gemeenten.length} gemeenten, ${kaart.breedte} × ${kaart.hoogte}, ${Math.round(Buffer.byteLength(tekst) / 1024)} kB → ${UIT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((fout) => {
    console.error(fout.message);
    process.exit(1);
  });
}
