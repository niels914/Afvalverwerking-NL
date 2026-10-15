#!/usr/bin/env node
// Haalt de indexreeksen voor de Indexcalculator op bij CBS (OData v3, opendata.cbs.nl)
// en schrijft ze naar src/data/indexreeksen.json.
//
// Gebruik:  node scripts/cbs-indexreeksen.mjs
// Achter een proxy:  NODE_USE_ENV_PROXY=1 node scripts/cbs-indexreeksen.mjs
//
// Per reeks wordt vastgelegd: tabel-id, tabeltitel, gekozen dimensies, onderwerp, basisjaar,
// eenheid, datum waarop CBS de tabel voor het laatst wijzigde, peildatum (dag van ophalen),
// bron-URL (StatLine) en API-URL. Maand- én jaarcijfers worden alleen overgenomen zoals CBS ze
// publiceert; jaargemiddelden worden niet zelf berekend. Voorlopige cijfers krijgen een markering.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://opendata.cbs.nl/ODataApi/odata';
const STATLINE = (id) => `https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${id}/table`;
const VANAF_JAAR = 2015;

/**
 * Reeksdefinities. `dimensies` noemt per dimensie de sleutel (zonder opvulspaties).
 * De keuze is onderbouwd in docs/stukken/tools-a.md.
 */
// Niet opgenomen: PPI 192026 Gasoliën (85770NED). CBS laat daar veel maanden leeg (geheim of niet
// gepubliceerd, o.a. heel 2023 en 2024), waardoor een contractindexatie niet betrouwbaar te herleiden is.
const REEKSEN = [
  {
    id: 'cpi',
    naam: 'Consumentenprijsindex (CPI), alle bestedingen',
    kort: 'CPI',
    tabelId: '86141NED',
    dimensies: { Bestedingscategorieen: 'T001112' },
    onderwerp: 'CPI_1',
    eenheid: 'index',
    basisjaar: '2025=100',
    gebruik: 'Algemene prijsontwikkeling. Meest gebruikte reeks in verwerkings- en dienstverleningscontracten.',
  },
  {
    id: 'cao-afval',
    naam: 'Cao-lonen per uur incl. bijzondere beloningen, E Waterbedrijven en afvalbeheer',
    kort: 'Cao-lonen afvalbeheer',
    tabelId: '85663NED',
    dimensies: { CaoSectoren: 'T001020', BedrijfstakkenBranchesSBI2008: '348000', Versie: 'A045600' },
    onderwerp: 'CaoLonenPerUurInclBijzBeloningen_4',
    eenheid: 'index',
    basisjaar: '2020=100',
    gebruik: 'Loonkosten in de eigen bedrijfstak van verwerkers en inzamelaars (SBI E).',
  },
  {
    id: 'cao-vervoer',
    naam: 'Cao-lonen per uur incl. bijzondere beloningen, H Vervoer en opslag',
    kort: 'Cao-lonen vervoer',
    tabelId: '85663NED',
    dimensies: { CaoSectoren: 'T001020', BedrijfstakkenBranchesSBI2008: '383100', Versie: 'A045600' },
    onderwerp: 'CaoLonenPerUurInclBijzBeloningen_4',
    eenheid: 'index',
    basisjaar: '2020=100',
    gebruik: 'Loonkosten van chauffeurs en logistiek; gebruikt bij inzamel- en transportcontracten.',
  },
  {
    id: 'cao-totaal',
    naam: 'Cao-lonen per uur incl. bijzondere beloningen, alle economische activiteiten',
    kort: 'Cao-lonen totaal',
    tabelId: '85663NED',
    dimensies: { CaoSectoren: 'T001020', BedrijfstakkenBranchesSBI2008: 'T001081', Versie: 'A045600' },
    onderwerp: 'CaoLonenPerUurInclBijzBeloningen_4',
    eenheid: 'index',
    basisjaar: '2020=100',
    gebruik: 'Algemene loonontwikkeling; alternatief als het contract geen bedrijfstak noemt.',
  },
  {
    id: 'ppi-energie',
    naam: 'Producentenprijsindex (PPI) afzet binnenland, D Elektriciteit, gas, stoom en warmte',
    kort: 'PPI energie',
    tabelId: '85770NED',
    dimensies: { Afzetgebieden: 'A044075', AlleProdComCoderingen: 'A016899' },
    onderwerp: 'ProducentenprijsindexPPI_1',
    eenheid: 'index',
    basisjaar: '2021=100',
    gebruik: 'Energiekosten van installaties (elektriciteit, gas, warmte).',
  },
  {
    id: 'pomp-diesel',
    naam: 'Gemiddelde pompprijs diesel',
    kort: 'Pompprijs diesel',
    tabelId: '81567NED',
    dimensies: { Motorbrandstof: { zoekTitel: /diesel/i } },
    onderwerp: 'GemiddeldePompprijs_1',
    eenheid: 'euro per liter',
    basisjaar: 'geen index (prijs in euro per liter)',
    gebruik: 'Veel gebruikte brandstofreeks in inzamelcontracten; inclusief accijns en btw.',
  },
];

async function haal(url) {
  for (let poging = 1; poging <= 3; poging++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) return res.json();
    if (poging === 3) throw new Error(`${res.status} ${res.statusText} bij ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * poging));
  }
}

function periodeSleutel(key) {
  const m = /^(\d{4})(MM|JJ)(\d{2})$/.exec(key.trim());
  if (!m) return null;
  if (m[2] === 'JJ') return { soort: 'jaar', sleutel: m[1], jaar: Number(m[1]) };
  return { soort: 'maand', sleutel: `${m[1]}-${m[3]}`, jaar: Number(m[1]) };
}

function ontbrekendeMaanden(sleutels) {
  if (sleutels.length === 0) return [];
  const set = new Set(sleutels);
  const uit = [];
  let [j, m] = sleutels[0].split('-').map(Number);
  const eind = sleutels[sleutels.length - 1];
  for (;;) {
    const k = `${j}-${String(m).padStart(2, '0')}`;
    if (k > eind) break;
    if (!set.has(k)) uit.push(k);
    if (++m > 12) {
      m = 1;
      j++;
    }
  }
  return uit;
}

async function haalReeks(def) {
  const info = (await haal(`${API}/${def.tabelId}/TableInfos?$format=json`)).value[0];
  // Echte sleutels opzoeken (CBS vult sleutels op met spaties).
  const filters = [];
  const dimensieTitels = {};
  for (const [dim, gezocht] of Object.entries(def.dimensies)) {
    const waarden = (await haal(`${API}/${def.tabelId}/${dim}?$format=json`)).value;
    const hit =
      typeof gezocht === 'string' ? waarden.find((w) => w.Key.trim() === gezocht) : waarden.find((w) => gezocht.zoekTitel.test(w.Title));
    if (!hit) throw new Error(`${def.tabelId}: waarde ${String(gezocht)} niet gevonden in dimensie ${dim}`);
    filters.push(`${dim} eq '${hit.Key}'`);
    dimensieTitels[dim] = hit.Title.trim();
  }
  const perioden = (await haal(`${API}/${def.tabelId}/Perioden?$format=json`)).value;
  const status = new Map(perioden.map((p) => [p.Key.trim(), p.Status]));
  const onderwerpen = (await haal(`${API}/${def.tabelId}/DataProperties?$format=json`)).value;
  const onderwerpTitel = onderwerpen.find((o) => o.Key === def.onderwerp)?.Title ?? def.onderwerp;

  const query = new URLSearchParams({
    $format: 'json',
    $filter: filters.join(' and '),
    $select: `Perioden,${def.onderwerp}`,
  });
  const apiUrl = `${API}/${def.tabelId}/TypedDataSet?${query}`;
  const rijen = (await haal(apiUrl)).value;

  const maanden = {};
  const jaren = {};
  const voorlopig = [];
  for (const r of rijen) {
    const p = periodeSleutel(r.Perioden);
    const w = r[def.onderwerp];
    if (!p || p.jaar < VANAF_JAAR || typeof w !== 'number') continue;
    (p.soort === 'jaar' ? jaren : maanden)[p.sleutel] = w;
    if (/voorlopig/i.test(status.get(r.Perioden.trim()) ?? '')) voorlopig.push(p.sleutel);
  }
  const maandSleutels = Object.keys(maanden).sort();
  const gaten = ontbrekendeMaanden(maandSleutels);
  if (gaten.length) console.warn(`\n  Let op: ${def.tabelId} mist ${gaten.length} maanden: ${gaten.join(', ')}`);
  const jaarSleutels = Object.keys(jaren).sort();
  if (maandSleutels.length === 0) throw new Error(`${def.tabelId}: geen maandcijfers ontvangen`);

  return {
    id: def.id,
    naam: def.naam,
    kort: def.kort,
    gebruik: def.gebruik,
    tabelId: def.tabelId,
    tabelTitel: info.Title.trim(),
    dimensies: dimensieTitels,
    onderwerp: onderwerpTitel,
    eenheid: def.eenheid,
    basisjaar: def.basisjaar,
    tabelGewijzigd: info.Modified,
    bronUrl: STATLINE(def.tabelId),
    apiUrl,
    eersteMaand: maandSleutels[0],
    laatsteMaand: maandSleutels[maandSleutels.length - 1],
    laatsteJaar: jaarSleutels.length ? Number(jaarSleutels[jaarSleutels.length - 1]) : null,
    voorlopig: voorlopig.sort(),
    maanden: Object.fromEntries(maandSleutels.map((k) => [k, maanden[k]])),
    jaren: Object.fromEntries(jaarSleutels.map((k) => [k, jaren[k]])),
  };
}

const vandaag = new Date().toISOString().slice(0, 10);
const reeksen = [];
for (const def of REEKSEN) {
  process.stdout.write(`${def.tabelId} ${def.kort} … `);
  const r = await haalReeks(def);
  console.log(`${Object.keys(r.maanden).length} maanden (${r.eersteMaand} t/m ${r.laatsteMaand}), ${Object.keys(r.jaren).length} jaren`);
  reeksen.push(r);
}

const uit = {
  peildatum: vandaag,
  bron: 'Centraal Bureau voor de Statistiek (CBS), StatLine Open Data (OData v3)',
  licentie: 'CC BY 4.0, bron: CBS',
  script: 'scripts/cbs-indexreeksen.mjs',
  reeksen,
};
const doel = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'indexreeksen.json');
await writeFile(doel, `${JSON.stringify(uit, null, 1)}\n`);
console.log(`Geschreven: ${doel}`);
