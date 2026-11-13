#!/usr/bin/env node
// Haalt de gemeentecijfers voor de Heffingenscan restafval op bij CBS (OData v3, opendata.cbs.nl)
// en schrijft src/data/heffingen-gemeenten.json en src/data/heffingen-voorbeeld.json.
//
// Gebruik:              node scripts/cbs-heffingenscan.mjs
// Achter een proxy:     NODE_USE_ENV_PROXY=1 node scripts/cbs-heffingenscan.mjs
// Andere kerncijfers:   node scripts/cbs-heffingenscan.mjs --kerncijfers=86358NED
// Alleen het voorbeeld: node scripts/cbs-heffingenscan.mjs --alleen-voorbeeld   (na een wijziging in tarieven of rekenregels; haalt niets op)
//
// Bronnen
// - 83452NED  Huishoudelijk afval per gemeente per inwoner: fijn en grof huishoudelijk restafval en
//             verbouwingsrestafval, kg per inwoner, nieuwste jaar met gemeentecijfers
// - 86053NED  Huishoudelijk restafval; nascheiding per gemeente: wat naar een nascheidingsinstallatie ging
//             en wat daarna nog is verbrand, kg per inwoner, zelfde jaar
// - 86165NED  Kerncijfers wijken en buurten 2025: inwoners en particuliere huishoudens op 1 januari 2025
// - provincie per gemeente: uit src/data/afval-gemeenten.json (scripts/cbs-afval-gemeenten.mjs)
//
// Waarom de kerncijfers van 2025 en niet de nieuwste tabel: het gepubliceerde voorbeeld (Overbetuwe, 48.945 inwoners
// en 20.585 huishoudens) rekent met 1 januari 2025, en de tests leggen die cijfers vast. Het script kijkt wel of CBS
// een nieuwere tabel heeft en zet die in het bestand onder bronnen.kerncijfers.nieuwer, zodat de pagina en de
// documentatie het kunnen melden. Overstappen: geef --kerncijfers=<tabel-id> mee en pas daarna de controlecijfers in
// src/lib/calc/heffingen.test.ts en het gepubliceerde voorbeeld samen aan (zie docs/stukken/heffingenscan.md).

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://opendata.cbs.nl/ODataApi/odata';
const STATLINE = (id) => `https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${id}/table`;
const PROJECT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(PROJECT, 'src', 'data');
const UIT = join(DATA, 'heffingen-gemeenten.json');
const UIT_VOORBEELD = join(DATA, 'heffingen-voorbeeld.json');

const AFVAL = '83452NED';
const NASCHEIDING = '86053NED';
const KERNCIJFERS_STANDAARD = '86165NED';
const VOORBEELD_SLUG = 'overbetuwe';

/** Afvalsoorten (zelfde sleutels in 83452NED en 86053NED). */
const FIJN = 'A025450';
const GROF = 'A025451';
const VERBOUWING = 'A025452';
const TE_VERBRANDEN = 'A052838';

/** Gangbare namen die afwijken van de CBS-naam: CBS-code → extra slugs. */
const EXTRA_ALIASSEN = {
  GM0518: ['den-haag'],
  GM0796: ['den-bosch'],
};

const argument = (naam) => process.argv.find((a) => a.startsWith(`--${naam}=`))?.split('=')[1];
const vlag = (naam) => process.argv.includes(`--${naam}`);

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
  let volgende = url;
  while (volgende) {
    const json = await haal(volgende);
    rijen.push(...json.value);
    volgende = json['odata.nextLink'] ?? null;
  }
  return rijen;
}

const q = (s) => encodeURIComponent(s);
const schoon = (s) => (typeof s === 'string' ? s.trim() : s);
const getalOfNull = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : null);

async function tabelInfo(id) {
  const info = (await haal(`${API}/${id}/TableInfos?$format=json`)).value[0];
  return {
    tabelId: id,
    titel: info.Title,
    gewijzigd: info.Modified.slice(0, 10),
    url: STATLINE(id),
    api: `${API}/${id}`,
    beschrijving: info.ShortDescription ?? '',
  };
}

function statusVan(beschrijving, jaar) {
  const blok = beschrijving.split(/Status van de cijfers:/i)[1] ?? '';
  const zin = blok.split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim();
  const voorlopig = new RegExp(`${jaar}[^.;]*?(nader voorlopig|voorlopig)`, 'i').exec(zin);
  return { tekst: zin, label: voorlopig ? voorlopig[1].toLowerCase() : 'definitief' };
}

/** Nieuwste jaar waarvoor meer dan 300 gemeenten een cijfer voor fijn restafval hebben. */
async function laatsteJaar() {
  const perioden = (await haal(`${API}/${AFVAL}/Perioden?$format=json`)).value.map((p) => p.Key).sort().reverse();
  for (const p of perioden) {
    const filter = `Perioden eq '${p}' and Afvalsoort eq '${FIJN}'`;
    const rijen = (await haal(`${API}/${AFVAL}/TypedDataSet?$format=json&$filter=${q(filter)}`)).value;
    if (rijen.filter((r) => schoon(r.RegioS).startsWith('GM') && r.HoeveelheidHuishoudelijkAfval_1 !== null).length > 300) return Number(p.slice(0, 4));
  }
  throw new Error('Geen jaar met gemeentecijfers gevonden in 83452NED.');
}

/** code → { soort: kg per inwoner } voor de gevraagde afvalsoorten. */
async function perGemeente(tabel, jaar, soorten, veld) {
  const filter = `Perioden eq '${jaar}JJ00' and (${soorten.map((k) => `Afvalsoort eq '${k}'`).join(' or ')})`;
  const rijen = await alles(`${API}/${tabel}/TypedDataSet?$format=json&$filter=${q(filter)}`);
  const m = new Map();
  for (const r of rijen) {
    const code = schoon(r.RegioS);
    if (!code.startsWith('GM')) continue;
    const g = m.get(code) ?? {};
    g[schoon(r.Afvalsoort)] = getalOfNull(r[veld]);
    m.set(code, g);
  }
  return m;
}

async function namen() {
  const rijen = (await haal(`${API}/${AFVAL}/RegioS?$format=json`)).value;
  return new Map(rijen.map((r) => [schoon(r.Key), schoon(r.Title)]));
}

/** Inwoners en particuliere huishoudens per gemeente uit een tabel Kerncijfers wijken en buurten. */
async function kerncijfers(tabel) {
  const props = (await haal(`${API}/${tabel}/DataProperties?$format=json`)).value;
  const inwVeld = props.find((p) => /^AantalInwoners_/.test(p.Key))?.Key;
  const hhVeld = props.find((p) => /^HuishoudensTotaal_/.test(p.Key))?.Key;
  if (!inwVeld || !hhVeld) throw new Error(`Velden voor inwoners of huishoudens niet gevonden in ${tabel}.`);
  const filter = `substringof('GM',WijkenEnBuurten)`;
  const rijen = await alles(`${API}/${tabel}/TypedDataSet?$format=json&$filter=${q(filter)}&$select=WijkenEnBuurten,${inwVeld},${hhVeld}`);
  const m = new Map();
  for (const r of rijen) m.set(schoon(r.WijkenEnBuurten), { inwoners: getalOfNull(r[inwVeld]), huishoudens: getalOfNull(r[hhVeld]) });
  return m;
}

/** Alle tabellen "Kerncijfers wijken en buurten <jaar>" in de CBS-catalogus, nieuwste eerst. */
async function kerncijferTabellen() {
  const filter = `substringof('Kerncijfers wijken en buurten 20',Title)`;
  const cat = await haal(`https://opendata.cbs.nl/ODataCatalog/Tables?$format=json&$filter=${q(filter)}&$select=Identifier,Title`);
  return cat.value
    .map((t) => ({ tabelId: t.Identifier, jaar: Number(/(\d{4})\s*$/.exec(t.Title.trim())?.[1]) }))
    .filter((t) => Number.isInteger(t.jaar))
    .sort((a, b) => b.jaar - a.jaar);
}

/** Naam voor de URL: kleine letters, zonder accenten en leestekens, woorden met koppeltekens. */
export function slugVan(naam) {
  return naam
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Slugs voor alle gemeenten. "Hengelo (O.)" wordt "hengelo" (met "hengelo-o" als alias), maar "Bergen (L.)" en
 * "Bergen (NH.)" houden hun toevoeging, omdat de kale naam dan niet uniek is.
 */
export function maakSlugs(gemeenten) {
  const kaal = (naam) => naam.replace(/\s*\([^)]*\)\s*$/, '');
  const telling = new Map();
  for (const g of gemeenten) telling.set(slugVan(kaal(g.naam)), (telling.get(slugVan(kaal(g.naam))) ?? 0) + 1);
  const bezet = new Set();
  const uit = new Map();
  for (const g of gemeenten) {
    const kort = slugVan(kaal(g.naam));
    const vol = slugVan(g.naam);
    const slug = telling.get(kort) === 1 ? kort : vol;
    if (bezet.has(slug)) throw new Error(`Slug niet uniek: ${slug} (${g.naam})`);
    bezet.add(slug);
    uit.set(g.code, { slug, aliassen: [...new Set([...(vol !== slug ? [vol] : []), ...(EXTRA_ALIASSEN[g.code] ?? [])])] });
  }
  for (const [code, s] of uit) {
    for (const a of s.aliassen) {
      if (bezet.has(a)) throw new Error(`Alias botst met een slug: ${a} (${code})`);
      bezet.add(a);
    }
  }
  return uit;
}

async function haalGemeenten() {
  const kerntabel = argument('kerncijfers') ?? KERNCIJFERS_STANDAARD;
  const jaar = Number(argument('jaar')) || (await laatsteJaar());
  console.log(`Peiljaar afval ${jaar}, kerncijfers uit ${kerntabel}`);
  const [infoAfval, infoNa, infoKern, afval, na, kern, naam, kerntabellen, bestaand] = await Promise.all([
    tabelInfo(AFVAL),
    tabelInfo(NASCHEIDING),
    tabelInfo(kerntabel),
    perGemeente(AFVAL, jaar, [FIJN, GROF, VERBOUWING], 'HoeveelheidHuishoudelijkAfval_1'),
    perGemeente(NASCHEIDING, jaar, [FIJN, GROF, VERBOUWING, TE_VERBRANDEN], 'HuishoudelijkRestafvalKgPerInwoner_1'),
    kerncijfers(kerntabel),
    namen(),
    kerncijferTabellen(),
    readFile(join(DATA, 'afval-gemeenten.json'), 'utf8').then(JSON.parse),
  ]);
  const provincie = new Map(bestaand.gemeenten.map((g) => [g.code, g.provincie]));
  const kernJaar = Number(/(\d{4})\s*$/.exec(infoKern.titel.trim())?.[1]);

  const rijen = [];
  const zonderKern = [];
  for (const [code, a] of afval) {
    // Zonder fijn restafval valt er niets te rekenen.
    if (a[FIJN] === null || a[FIJN] === undefined) continue;
    const k = kern.get(code);
    if (!k || !k.inwoners || !k.huishoudens) {
      zonderKern.push(code);
      continue;
    }
    const n = na.get(code) ?? {};
    // Nascheiding: CBS laat de cellen leeg bij gemeenten die niet nascheiden. Een nul telt als "geen nascheiding".
    const naFijn = n[FIJN] ? n[FIJN] : null;
    const naAangeboden = naFijn || n[GROF] || n[VERBOUWING] ? Math.round(((n[FIJN] ?? 0) + (n[GROF] ?? 0) + (n[VERBOUWING] ?? 0)) * 10) / 10 : null;
    rijen.push({
      code,
      naam: (naam.get(code) ?? code).replace(/\s*\((gemeente|PV)\)$/, ''),
      provincie: provincie.get(code) ?? null,
      inwoners: k.inwoners,
      huishoudens: k.huishoudens,
      fijn: a[FIJN],
      grof: a[GROF] ?? null,
      verbouwing: a[VERBOUWING] ?? null,
      // Fijn huishoudelijk restafval dat naar een nascheidingsinstallatie ging (kg per inwoner).
      nascheiding: naFijn,
      // Alle restafval (fijn, grof en verbouwing) dat naar nascheiding ging, en wat daarvan nog is verbrand.
      nascheidingAangeboden: naAangeboden,
      nascheidingVerbrand: naAangeboden !== null ? (n[TE_VERBRANDEN] ?? null) : null,
    });
  }
  if (rijen.length < 300) throw new Error(`Te weinig gemeenten (${rijen.length}); uitvoer niet geschreven.`);
  if (zonderKern.length) throw new Error(`Geen inwoners of huishoudens in ${kerntabel} voor: ${zonderKern.join(', ')}. Kies een tabel met dezelfde gemeentelijke indeling.`);
  const zonderProvincie = rijen.filter((g) => !g.provincie).map((g) => g.code);
  if (zonderProvincie.length) console.warn(`Zonder provincie (draai eerst scripts/cbs-afval-gemeenten.mjs): ${zonderProvincie.join(', ')}`);

  const sorteer = new Intl.Collator('nl', { sensitivity: 'base', ignorePunctuation: true });
  rijen.sort((x, y) => sorteer.compare(x.naam.replace(/^'s-/, ''), y.naam.replace(/^'s-/, '')));
  const slugs = maakSlugs(rijen);
  const gemeenten = rijen.map((g) => ({ code: g.code, naam: g.naam, ...slugs.get(g.code), ...Object.fromEntries(Object.entries(g).slice(2)) }));

  const nieuwer = kerntabellen.find((t) => t.jaar > kernJaar);
  const kop = {
    opgehaald: new Date().toISOString().slice(0, 10),
    aantalGemeenten: gemeenten.length,
    aantalMetNascheiding: gemeenten.filter((g) => g.nascheiding !== null).length,
    bronnen: {
      afval: {
        tabelId: infoAfval.tabelId,
        titel: infoAfval.titel,
        gewijzigd: infoAfval.gewijzigd,
        url: infoAfval.url,
        api: infoAfval.api,
        peiljaar: jaar,
        status: statusVan(infoAfval.beschrijving, jaar),
        velden: 'Huishoudelijk restafval (fijn), grof huishoudelijk restafval en verbouwingsrestafval, kg per inwoner',
      },
      nascheiding: {
        tabelId: infoNa.tabelId,
        titel: infoNa.titel,
        gewijzigd: infoNa.gewijzigd,
        url: infoNa.url,
        api: infoNa.api,
        peiljaar: jaar,
        status: statusVan(infoNa.beschrijving, jaar),
        velden: 'Huishoudelijk restafval dat naar nascheiding ging en het restafval dat daarna is verbrand, kg per inwoner',
      },
      kerncijfers: {
        tabelId: infoKern.tabelId,
        titel: infoKern.titel,
        gewijzigd: infoKern.gewijzigd,
        url: infoKern.url,
        api: infoKern.api,
        peildatum: `${kernJaar}-01-01`,
        velden: 'Aantal inwoners en totaal particuliere huishoudens op 1 januari',
        // Nieuwere tabel bij CBS waarmee de scan nog niet rekent (zie de kop van scripts/cbs-heffingenscan.mjs).
        nieuwer: nieuwer ? { tabelId: nieuwer.tabelId, peildatum: `${nieuwer.jaar}-01-01`, url: STATLINE(nieuwer.tabelId) } : null,
      },
      provincie: { bestand: 'src/data/afval-gemeenten.json', peiljaar: bestaand.peiljaar },
    },
  };
  // Eén gemeente per regel: leesbaar in een diff en compact.
  const tekst = `${JSON.stringify(kop, null, 2).replace(/\n}$/, '')},\n  "gemeenten": [\n${gemeenten.map((g) => `    ${JSON.stringify(g)}`).join(',\n')}\n  ]\n}\n`;
  JSON.parse(tekst);
  await writeFile(UIT, tekst);
  console.log(`${gemeenten.length} gemeenten geschreven naar ${UIT} (${kop.aantalMetNascheiding} met nascheiding)`);
  if (nieuwer) console.log(`Let op: CBS heeft nieuwere kerncijfers (${nieuwer.tabelId}, 1 januari ${nieuwer.jaar}). De scan rekent met ${infoKern.tabelId}.`);
}

/**
 * Rekent het voorbeeld (Overbetuwe) en het landelijke totaal door met de rekenlogica van de site en schrijft
 * heffingen-voorbeeld.json. Zo kan de homepage die cijfers tonen zonder de hele dataset te laden.
 * De rekenlogica wordt via de Vite-API geladen (TypeScript, zelfde code als de site).
 */
async function schrijfVoorbeeld() {
  const { createServer } = await import('vite');
  const server = await createServer({ root: PROJECT, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
  try {
    const { maakVoorbeeld } = await server.ssrLoadModule('/src/lib/calc/heffingen.ts');
    const data = JSON.parse(await readFile(UIT, 'utf8'));
    const voorbeeld = maakVoorbeeld(data, VOORBEELD_SLUG);
    await writeFile(UIT_VOORBEELD, `${JSON.stringify(voorbeeld, null, 2)}\n`);
    console.log(`Voorbeeld ${voorbeeld.voorbeeld.naam} en landelijk totaal geschreven naar ${UIT_VOORBEELD}`);
  } finally {
    await server.close();
  }
}

async function main() {
  if (!vlag('alleen-voorbeeld')) await haalGemeenten();
  await schrijfVoorbeeld();
}

// Alleen uitvoeren als het script zelf wordt gestart (de tests importeren slugVan en maakSlugs).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((fout) => {
    console.error(fout.message);
    process.exit(1);
  });
}
