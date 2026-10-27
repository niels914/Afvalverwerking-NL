#!/usr/bin/env node
// Haalt de cijfers over huishoudelijk afval per gemeente op bij CBS (OData v3, opendata.cbs.nl)
// en schrijft ze naar src/data/afval-gemeenten.json.
//
// Gebruik:            node scripts/cbs-afval-gemeenten.mjs
// Achter een proxy:   NODE_USE_ENV_PROXY=1 node scripts/cbs-afval-gemeenten.mjs
// Ander peiljaar:     node scripts/cbs-afval-gemeenten.mjs 2023   (standaard: laatste jaar met cijfers)
//
// Bronnen
// - 83452NED  Huishoudelijk afval per gemeente per inwoner (kg per inwoner, per afvalsoort)
// - 03759ned  Bevolking op 1 januari en gemiddeld (gemiddelde bevolking, voor gewogen gemiddelden en tonnen)
// - 85755NED e.v.  Gebieden in Nederland <jaar> (provincie per gemeente)
// - 83558NED  Gemeentelijke afvalstoffen; hoeveelheden (landelijk cijfer, ter controle van de rekenwijze)
//
// Afleidingen (staan ook in docs/stukken/inhoud.md):
// - restafval        = huishoudelijk restafval (fijn) + grof huishoudelijk restafval   [kg/inw]
// - nietGescheiden   = fijn + grof restafval + verbouwingsrestafval                     [kg/inw]
// - scheidingsPct    = (totaal huishoudelijk afval − nietGescheiden) / totaal × 100
//   Dit is de CBS-definitie van 'gescheiden ingezameld'. Het script controleert dat het landelijke
//   cijfer dat hieruit volgt binnen 1 procentpunt ligt van het CBS-cijfer in 83558NED.
//   Nascheiding van restafval telt hier NIET mee (CBS meet inzameling, niet verwerking).

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://opendata.cbs.nl/ODataApi/odata';
const STATLINE = (id) => `https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${id}/table`;
const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
// Twee bestanden: de rijen (alleen geladen door de kaart) en een kleine kop met bron en kerncijfers
// (ook gebruikt op de homepage, zodat die de 342 rijen niet hoeft te laden).
const UIT = join(DATA, 'afval-gemeenten.json');
const UIT_BRON = join(DATA, 'afval-bron.json');

const TABEL = '83452NED';
const BEVOLKING = '03759ned';
const LANDELIJK = '83558NED';

/** Afvalsoorten in 83452NED (sleutel → veldnaam in de uitvoer). */
const SOORTEN = {
  A025448: 'totaal',
  A025450: 'fijnRest',
  A025451: 'grofRest',
  A025452: 'verbouwingRest',
  A025454: 'gft',
  A025455: 'papier',
  A025456: 'textiel',
  A025457: 'glas',
  A025458: 'kunststof',
  A025459: 'drankenkartons',
  A025460: 'blik',
  A025461: 'pmdFractie',
};

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
const r1 = (n) => Math.round(n * 10) / 10;

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

async function afvalPerSoort(jaar) {
  const filter = `Perioden eq '${jaar}JJ00' and (${Object.keys(SOORTEN)
    .map((k) => `Afvalsoort eq '${k}'`)
    .join(' or ')})`;
  const rijen = await alles(`${API}/${TABEL}/TypedDataSet?$format=json&$filter=${q(filter)}`);
  const perGemeente = new Map();
  for (const r of rijen) {
    const code = schoon(r.RegioS);
    if (!code.startsWith('GM')) continue;
    const waarde = r.HoeveelheidHuishoudelijkAfval_1;
    if (waarde === null || waarde === undefined) continue;
    const g = perGemeente.get(code) ?? {};
    g[SOORTEN[schoon(r.Afvalsoort)]] = waarde;
    perGemeente.set(code, g);
  }
  return perGemeente;
}

async function laatsteJaar() {
  const perioden = (await haal(`${API}/${TABEL}/Perioden?$format=json`)).value.map((p) => p.Key).sort().reverse();
  for (const p of perioden) {
    const jaar = Number(p.slice(0, 4));
    const filter = `Perioden eq '${p}' and Afvalsoort eq 'A025450'`;
    const rijen = (await haal(`${API}/${TABEL}/TypedDataSet?$format=json&$filter=${q(filter)}`)).value;
    if (rijen.filter((r) => r.HoeveelheidHuishoudelijkAfval_1 !== null).length > 300) return jaar;
  }
  throw new Error('Geen jaar met gemeentecijfers gevonden.');
}

async function bevolking(jaar) {
  const filter = `Perioden eq '${jaar}JJ00' and Geslacht eq 'T001038' and Leeftijd eq '10000' and BurgerlijkeStaat eq 'T001019' and substringof('GM',RegioS)`;
  const rijen = await alles(`${API}/${BEVOLKING}/TypedDataSet?$format=json&$filter=${q(filter)}`);
  const m = new Map();
  for (const r of rijen) {
    const n = r.GemiddeldeBevolking_2 ?? r.BevolkingOp1Januari_1;
    if (n) m.set(schoon(r.RegioS), Math.round(n));
  }
  return m;
}

async function provincies(jaar) {
  const catalogus = await haal(
    `https://opendata.cbs.nl/ODataCatalog/Tables?$format=json&$filter=${q(`Title eq 'Gebieden in Nederland ${jaar}'`)}&$select=Identifier,Title`,
  );
  const id = catalogus.value[0]?.Identifier;
  if (!id) return { tabelId: null, perGemeente: new Map() };
  const props = (await haal(`${API}/${id}/DataProperties?$format=json`)).value;
  // Zoek de groep 'Provincies' en neem het eerstvolgende Naam-veld.
  const i = props.findIndex((p) => p.Type === 'TopicGroup' && /^Provincies$/i.test(p.Title));
  const naamVeld = props.slice(i + 1).find((p) => /^Naam/.test(p.Key))?.Key;
  const rijen = await alles(`${API}/${id}/TypedDataSet?$format=json`);
  const m = new Map();
  for (const r of rijen) m.set(schoon(r.RegioS), schoon(r[naamVeld]));
  return { tabelId: id, perGemeente: m };
}

async function landelijk(jaar) {
  const filter = `Perioden eq '${jaar}JJ00' and substringof('NL01',Regiokenmerken)`;
  const r = (await haal(`${API}/${LANDELIJK}/TypedDataSet?$format=json&$filter=${q(filter)}`)).value[0];
  if (!r) return null;
  return {
    totaal: r.TotaalHuishoudelijkAfval_122,
    fijnRest: r.HuishoudelijkRestafval_123,
    grofRest: r.GrofHuishoudelijkRestafval_124,
    verbouwingRest: r.Verbouwingsrestafval_125,
    gescheidenPct: r.TotaalHuishoudelijkAfval_171,
  };
}

/** Laatste jaar met een landelijk cijfer in 83558NED (loopt vaak een jaar voor op de gemeentetabel). */
async function landelijkLaatste() {
  const perioden = (await haal(`${API}/${LANDELIJK}/Perioden?$format=json`)).value.map((p) => p.Key).sort().reverse();
  for (const p of perioden.slice(0, 3)) {
    const jaar = Number(p.slice(0, 4));
    const land = await landelijk(jaar);
    if (land && land.totaal) return { jaar, ...land };
  }
  return null;
}

async function namen() {
  const rijen = (await haal(`${API}/${TABEL}/RegioS?$format=json`)).value;
  return new Map(rijen.map((r) => [schoon(r.Key), schoon(r.Title)]));
}

async function main() {
  const jaar = Number(process.argv[2]) || (await laatsteJaar());
  console.log(`Peiljaar ${jaar}`);
  const [info, infoBev, infoLand, perSoort, vorigJaar, inwoners, prov, land, naam, laatsteLand] = await Promise.all([
    tabelInfo(TABEL),
    tabelInfo(BEVOLKING),
    tabelInfo(LANDELIJK),
    afvalPerSoort(jaar),
    afvalPerSoort(jaar - 1),
    bevolking(jaar),
    provincies(jaar),
    landelijk(jaar),
    namen(),
    landelijkLaatste(),
  ]);

  const gemeenten = [];
  for (const [code, a] of perSoort) {
    // Zonder fijn restafval geen bruikbare rij. Ontbreekt alleen het totaal (CBS publiceert het
    // soms niet), dan blijft de gemeente op de kaart zonder scheidingspercentage.
    if (a.fijnRest === undefined) continue;
    const totaal = a.totaal ?? null;
    const grof = a.grofRest ?? 0;
    const verbouwing = a.verbouwingRest ?? 0;
    const restafval = a.fijnRest + grof;
    const nietGescheiden = restafval + verbouwing;
    const v = vorigJaar.get(code);
    const pmd = ['kunststof', 'drankenkartons', 'blik', 'pmdFractie'].reduce((s, k) => s + (a[k] ?? 0), 0);
    gemeenten.push({
      code,
      naam: (naam.get(code) ?? code).replace(/\s*\((gemeente|PV)\)$/, ''),
      provincie: prov.perGemeente.get(code) ?? null,
      inwoners: inwoners.get(code) ?? null,
      totaal,
      fijnRest: a.fijnRest,
      grofRest: grof,
      verbouwingRest: verbouwing,
      restafval: r1(restafval),
      scheidingsPct: totaal && totaal > 0 ? r1(((totaal - nietGescheiden) / totaal) * 100) : null,
      gft: a.gft ?? null,
      papier: a.papier ?? null,
      glas: a.glas ?? null,
      textiel: a.textiel ?? null,
      pmd: r1(pmd),
      restafvalVorigJaar: v && v.fijnRest !== undefined ? r1(v.fijnRest + (v.grofRest ?? 0)) : null,
    });
  }
  const sorteer = new Intl.Collator('nl', { sensitivity: 'base', ignorePunctuation: true });
  gemeenten.sort((x, y) => sorteer.compare(x.naam.replace(/^'s-/, ''), y.naam.replace(/^'s-/, '')));

  // Controle van de rekenwijze tegen het landelijke CBS-cijfer.
  let controle = null;
  if (land) {
    const eigen = ((land.totaal - land.fijnRest - land.grofRest - land.verbouwingRest) / land.totaal) * 100;
    controle = {
      tabelId: LANDELIJK,
      landelijkTotaalKgPerInw: land.totaal,
      landelijkRestafvalKgPerInw: land.fijnRest + land.grofRest,
      landelijkScheidingsPctCbs: land.gescheidenPct,
      landelijkScheidingsPctBerekend: r1(eigen),
    };
    if (Math.abs(eigen - land.gescheidenPct) > 1) {
      throw new Error(`Rekenwijze wijkt af van CBS: berekend ${eigen.toFixed(1)} %, CBS ${land.gescheidenPct} %.`);
    }
  }

  const zonderInwoners = gemeenten.filter((g) => !g.inwoners).map((g) => g.code);
  if (gemeenten.length < 300) throw new Error(`Te weinig gemeenten (${gemeenten.length}); uitvoer niet geschreven.`);

  const uitvoer = {
    peiljaar: jaar,
    opgehaald: new Date().toISOString().slice(0, 10),
    status: statusVan(info.beschrijving, jaar),
    bron: { tabelId: info.tabelId, titel: info.titel, gewijzigd: info.gewijzigd, url: info.url, api: info.api, uitgever: 'CBS' },
    bevolking: {
      tabelId: infoBev.tabelId,
      titel: infoBev.titel,
      gewijzigd: infoBev.gewijzigd,
      url: infoBev.url,
      onderwerp: `Gemiddelde bevolking ${jaar}`,
    },
    provincies: prov.tabelId ? { tabelId: prov.tabelId, url: STATLINE(prov.tabelId) } : null,
    controle,
    // Landelijk cijfer van het nieuwste jaar (voor de homepage). Restafval = fijn + grof, zoals op de kaart;
    // CBS-nieuwsberichten tellen verbouwingsrestafval vaak mee, daarom staat dat apart.
    landelijkActueel: laatsteLand
      ? {
          jaar: laatsteLand.jaar,
          tabelId: LANDELIJK,
          url: STATLINE(LANDELIJK),
          gewijzigd: infoLand.gewijzigd,
          status: statusVan(infoLand.beschrijving, laatsteLand.jaar),
          totaalKgPerInw: laatsteLand.totaal,
          restafvalKgPerInw: laatsteLand.fijnRest + laatsteLand.grofRest,
          verbouwingsrestafvalKgPerInw: laatsteLand.verbouwingRest,
          scheidingsPct: laatsteLand.gescheidenPct,
        }
      : null,
    definities: {
      restafval: 'Fijn huishoudelijk restafval + grof huishoudelijk restafval, kg per inwoner (CBS 83452NED).',
      scheidingsPct:
        'Gescheiden ingezameld deel van al het huishoudelijk afval: (totaal − fijn restafval − grof restafval − verbouwingsrestafval) / totaal. Nascheiding telt niet mee.',
      pmd: 'Kunststof verpakkingen + drankenkartons + metalen verpakkingen + gemengde PMD-fractie (gescheiden ingezameld).',
    },
    gemeenten,
  };
  // Eén gemeente per regel: leesbaar in een diff en compact.
  const { gemeenten: rijen, ...kop } = uitvoer;
  const tekst = `{\n  "peiljaar": ${jaar},\n  "gemeenten": [\n${rijen.map((g) => `    ${JSON.stringify(g)}`).join(',\n')}\n  ]\n}\n`;
  JSON.parse(tekst);
  await writeFile(UIT, tekst);
  const opRestafval = [...rijen].sort((a, b) => a.restafval - b.restafval);
  const kort = (g) => ({ code: g.code, naam: g.naam, restafval: g.restafval });
  const samenvatting = {
    aantalGemeenten: rijen.length,
    restafvalOnder100: rijen.filter((g) => g.restafval < 100).length,
    // Voor het tekstalternatief van de kleine kaart op de homepage.
    laagste: kort(opRestafval[0]),
    hoogste: kort(opRestafval.at(-1)),
  };
  await writeFile(UIT_BRON, `${JSON.stringify({ ...kop, samenvatting }, null, 2)}\n`);
  console.log(`${gemeenten.length} gemeenten geschreven naar ${UIT}`);
  if (zonderInwoners.length) console.warn(`Zonder inwonertal: ${zonderInwoners.join(', ')}`);
  if (controle) console.log(`Controle landelijk: berekend ${controle.landelijkScheidingsPctBerekend} %, CBS ${controle.landelijkScheidingsPctCbs} %`);
}

main().catch((fout) => {
  console.error(fout.message);
  process.exit(1);
});
