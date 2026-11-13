#!/usr/bin/env node
// Haalt de cijfers per afvalstroom op bij CBS (OData v3, opendata.cbs.nl) en schrijft ze weg voor /stromen.
//
// Gebruik:            node scripts/cbs-stromen.mjs
// Achter een proxy:   NODE_USE_ENV_PROXY=1 node scripts/cbs-stromen.mjs
//
// Bronnen
// - 83452NED  Huishoudelijk afval per gemeente per inwoner (kg per inwoner, per afvalsoort) -> public/data/stromen-gemeenten.json
// - 83558NED  Gemeentelijke afvalstoffen; hoeveelheden (landelijke tijdreeks, kg/inw en kton, plus verwerking in %) -> src/data/stromen-landelijk.json
// Gemeentenamen, provincies en inwoners komen uit src/data/afval-gemeenten.json (zelfde peiljaar; bijwerken met cbs-afval-gemeenten.mjs).
// De koppeling stroom -> CBS-afvalsoorten staat in src/data/stromen-fracties.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://opendata.cbs.nl/ODataApi/odata';
const STATLINE = (id) => `https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${id}/table`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEM = '83452NED';
const LAND = '83558NED';
const EERSTE_JAAR = 2005;

const fr = JSON.parse(await readFile(join(ROOT, 'src/data/stromen-fracties.json'), 'utf8'));
const q = encodeURIComponent;
const r1 = (n) => Math.round(n * 10) / 10;

async function haal(url, pogingen = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (fout) {
      if (i >= pogingen) throw new Error(`Ophalen mislukt (${url}): ${fout.message}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}
async function alles(url) {
  const rijen = [];
  for (let u = url; u; ) {
    const j = await haal(u);
    rijen.push(...j.value);
    u = j['odata.nextLink'] ?? null;
  }
  return rijen;
}
async function tabelInfo(id) {
  const info = (await haal(`${API}/${id}/TableInfos?$format=json`)).value[0];
  const blok = (info.ShortDescription ?? '').split(/Status van de cijfers:/i)[1] ?? '';
  return {
    tabelId: id,
    titel: info.Title,
    gewijzigd: info.Modified.slice(0, 10),
    url: STATLINE(id),
    api: `${API}/${id}`,
    status: blok.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim(),
  };
}
const som = (waarden) => {
  const echt = waarden.filter((w) => typeof w === 'number');
  return echt.length ? echt.reduce((a, b) => a + b, 0) : null;
};

async function main() {
  const basis = JSON.parse(await readFile(join(ROOT, 'src/data/afval-gemeenten.json'), 'utf8'));
  const jaar = basis.peiljaar;
  const [infoGem, infoLand] = await Promise.all([tabelInfo(GEM), tabelInfo(LAND)]);

  // Per gemeente, per CBS-afvalsoort.
  const perFractie = {};
  for (const [id, f] of Object.entries(fr.fracties)) {
    const filter = `Perioden eq '${jaar}JJ00' and Afvalsoort eq '${f.afvalsoort}'`;
    const rijen = await alles(`${API}/${GEM}/TypedDataSet?$format=json&$filter=${q(filter)}`);
    const m = new Map();
    for (const r of rijen) {
      const code = String(r.RegioS).trim();
      if (code.startsWith('GM') && typeof r.HoeveelheidHuishoudelijkAfval_1 === 'number') m.set(code, r.HoeveelheidHuishoudelijkAfval_1);
    }
    perFractie[id] = m;
    console.log(`${id}: ${m.size} gemeenten`);
  }
  const gemeenten = basis.gemeenten.map((g) => {
    const rij = { code: g.code, naam: g.naam, provincie: g.provincie, inwoners: g.inwoners };
    const stromen = {};
    for (const [stroom, ids] of Object.entries(fr.stromen)) {
      const v = som(ids.map((id) => perFractie[id].get(g.code)));
      stromen[stroom] = v === null ? null : r1(v);
    }
    return { ...rij, ...stromen };
  });
  // Controle tegen de eigen kaartdata: restafval moet gelijk zijn aan fijn + grof van afval-gemeenten.json.
  for (const g of gemeenten) {
    const ref = basis.gemeenten.find((b) => b.code === g.code);
    if (g.restafval !== null && Math.abs(g.restafval - ref.restafval) > 0.11) throw new Error(`Restafval wijkt af voor ${g.code}`);
    for (const k of ['gft', 'papier', 'glas', 'textiel', 'pmd']) {
      if (g[k] !== null && ref[k] !== null && Math.abs(g[k] - ref[k]) > 0.11) throw new Error(`${k} wijkt af voor ${g.code}`);
    }
  }
  const ontbrekend = Object.fromEntries(Object.keys(fr.stromen).map((s) => [s, gemeenten.filter((g) => g[s] === null).length]));
  await mkdir(join(ROOT, 'public/data'), { recursive: true });
  const kop = {
    peiljaar: jaar,
    opgehaald: new Date().toISOString().slice(0, 10),
    bron: infoGem,
    inwonersBron: 'Inwonertal en provincie zoals op de Restafvalkaart (CBS 03759ned en Gebieden in Nederland).',
    stromen: Object.keys(fr.stromen),
    aantalZonderCijfer: ontbrekend,
  };
  const tekst = `{\n  "kop": ${JSON.stringify(kop)},\n  "gemeenten": [\n${gemeenten.map((g) => `    ${JSON.stringify(g)}`).join(',\n')}\n  ]\n}\n`;
  JSON.parse(tekst);
  await writeFile(join(ROOT, 'public/data/stromen-gemeenten.json'), tekst);

  // Landelijke tijdreeks.
  const filter = `substringof('NL01',Regiokenmerken)`;
  const rijen = (await haal(`${API}/${LAND}/TypedDataSet?$format=json&$filter=${q(filter)}`)).value
    .map((r) => ({ ...r, jaar: Number(String(r.Perioden).slice(0, 4)) }))
    .filter((r) => r.jaar >= EERSTE_JAAR)
    .sort((a, b) => a.jaar - b.jaar);
  const jaren = rijen.map((r) => r.jaar);
  const reeksen = {};
  const fractieReeksen = {};
  for (const [id, f] of Object.entries(fr.fracties)) {
    fractieReeksen[id] = { kg: rijen.map((r) => r[f.kg] ?? null), kton: rijen.map((r) => r[f.kton] ?? null) };
  }
  for (const [stroom, ids] of Object.entries(fr.stromen)) {
    const optel = (veld) => jaren.map((_, i) => {
      const v = som(ids.map((id) => fractieReeksen[id][veld][i]));
      return v === null ? null : r1(v);
    });
    reeksen[stroom] = { kg: optel('kg'), kton: optel('kton') };
  }
  const verwerking = {};
  for (const [soort, velden] of Object.entries(fr.verwerking)) {
    verwerking[soort] = Object.fromEntries(Object.entries(velden).map(([k, veld]) => [k, rijen.map((r) => r[veld] ?? null)]));
  }
  const uit = {
    opgehaald: kop.opgehaald,
    bron: infoLand,
    jaren,
    totaal: { kg: rijen.map((r) => r.TotaalHuishoudelijkAfval_122), kton: rijen.map((r) => r.TotaalHuishoudelijkAfval_2) },
    gemeentenInTelling: { aantal: rijen.at(-1).GemeentenInPopulatie_199 },
    reeksen,
    fracties: Object.fromEntries(Object.entries(fractieReeksen).map(([id, v]) => [id, { titel: fr.fracties[id].titel, ...v }])),
    verwerking,
  };
  await writeFile(join(ROOT, 'src/data/stromen-landelijk.json'), `${JSON.stringify(uit)}\n`);
  console.log(`Landelijk ${jaren[0]}-${jaren.at(-1)}; gemeenten ${gemeenten.length} (peiljaar ${jaar}); zonder cijfer:`, ontbrekend);
}

main().catch((f) => {
  console.error(f.message);
  process.exit(1);
});
