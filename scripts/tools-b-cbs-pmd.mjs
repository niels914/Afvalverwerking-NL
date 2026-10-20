#!/usr/bin/env node
// Haalt per gemeente het gescheiden ingezamelde PMD en het huishoudelijk restafval (kg per inwoner)
// en het aantal inwoners op bij CBS (OData v3) en schrijft src/data/tools-b-cbs-pmd.json.
// Ook het landelijk gemiddelde uit de tabel Gemeentelijke afvalstoffen komt erin.
//
// Gebruik:  node scripts/tools-b-cbs-pmd.mjs
// Achter een proxy:  NODE_USE_ENV_PROXY=1 node scripts/tools-b-cbs-pmd.mjs
//
// Hoort bij onderdeel tools-b (Rekenmodel bron- en nascheiding PMD). Zie docs/stukken/tools-b.md.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://opendata.cbs.nl/ODataApi/odata';
const STATLINE = (id) => `https://opendata.cbs.nl/statline/#/CBS/nl/dataset/${id}/table`;

const AFVAL_GEMEENTE = '83452NED'; // Huishoudelijk afval per gemeente per inwoner
const AFVAL_LANDELIJK = '83558NED'; // Gemeentelijke afvalstoffen; hoeveelheden
const KERNCIJFERS = '70072ned'; // Regionale kerncijfers Nederland (bevolking op 1 januari)

// Afvalsoorten in 83452NED. PMD telt als som van de vier gescheiden ingezamelde verpakkingsstromen,
// omdat sommige gemeenten kunststof, blik of drankenkartons apart inzamelen.
const SOORTEN = {
  pmdFractie: 'A025461',
  kunststof: 'A025458',
  drankenkartons: 'A025459',
  blik: 'A025460',
  restafval: 'A025450',
};

async function haal(pad) {
  const url = `${API}/${pad}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} bij ${url}`);
  return r.json();
}

async function alles(pad) {
  // CBS geeft maximaal 10.000 rijen per verzoek; volg odata.nextLink.
  const rijen = [];
  let volgende = pad;
  while (volgende) {
    const d = await haal(volgende);
    rijen.push(...d.value);
    const link = d['odata.nextLink'];
    volgende = link ? link.replace(`${API}/`, '') : null;
  }
  return rijen;
}

const info = async (id) => (await haal(`${id}/TableInfos`)).value[0];
const r1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

async function main() {
  const [infoGem, infoNl, infoKern] = await Promise.all([info(AFVAL_GEMEENTE), info(AFVAL_LANDELIJK), info(KERNCIJFERS)]);

  const perioden = (await haal(`${AFVAL_GEMEENTE}/Perioden`)).value.map((p) => p.Key).filter((k) => k.endsWith('JJ00'));
  const periode = perioden[perioden.length - 1];
  const jaar = Number(periode.slice(0, 4));

  const regio = new Map((await alles(`${AFVAL_GEMEENTE}/RegioS`)).map((r) => [r.Key.trim(), r.Title]));

  const filterSoort = Object.values(SOORTEN)
    .map((s) => `Afvalsoort eq '${s}'`)
    .join(' or ');
  const rijen = await alles(
    `${AFVAL_GEMEENTE}/TypedDataSet?$filter=Perioden eq '${periode}' and (${filterSoort}) and startswith(RegioS,'GM')&$select=Afvalsoort,RegioS,HoeveelheidHuishoudelijkAfval_1`,
  );

  const perGemeente = new Map();
  for (const r of rijen) {
    const code = r.RegioS.trim();
    const g = perGemeente.get(code) ?? {};
    const soort = Object.entries(SOORTEN).find(([, v]) => v === r.Afvalsoort.trim())?.[0];
    g[soort] = r.HoeveelheidHuishoudelijkAfval_1;
    perGemeente.set(code, g);
  }

  // Inwoners op 1 januari van hetzelfde jaar.
  const kernPeriode = `${jaar}JJ00`;
  const bevolking = await alles(
    `${KERNCIJFERS}/TypedDataSet?$filter=Perioden eq '${kernPeriode}' and startswith(RegioS,'GM')&$select=RegioS,TotaleBevolking_1`,
  );
  const inwoners = new Map(bevolking.map((b) => [b.RegioS.trim(), b.TotaleBevolking_1]));

  const gemeenten = [];
  for (const [code, g] of perGemeente) {
    if (g.restafval === null || g.restafval === undefined) continue; // geen cijfers dit jaar (opgeheven of geheim)
    const delen = [g.pmdFractie, g.kunststof, g.drankenkartons, g.blik];
    const pmd = delen.every((d) => d === null || d === undefined) ? null : r1(delen.reduce((s, d) => s + (d ?? 0), 0));
    gemeenten.push({
      code,
      naam: regio.get(code) ?? code,
      inwoners: inwoners.get(code) ?? null,
      pmdKgPerInw: pmd,
      restafvalKgPerInw: r1(g.restafval),
    });
  }
  gemeenten.sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));

  // Landelijk gemiddelde (laatste jaar in 83558NED).
  const nl = await alles(
    `${AFVAL_LANDELIJK}/TypedDataSet?$filter=startswith(Regiokenmerken,'NL01')&$select=Perioden,PMDFractie_133,KunststofVerpakkingen_130,Drankenkartons_131,MetalenVerpakkingenBlik_132,HuishoudelijkRestafval_123`,
  );
  const laatsteNl = nl.filter((r) => r.PMDFractie_133 !== null).at(-1);
  const landelijk = {
    jaar: Number(laatsteNl.Perioden.slice(0, 4)),
    pmdKgPerInw: r1(laatsteNl.PMDFractie_133 + (laatsteNl.KunststofVerpakkingen_130 ?? 0) + (laatsteNl.Drankenkartons_131 ?? 0) + (laatsteNl.MetalenVerpakkingenBlik_132 ?? 0)),
    restafvalKgPerInw: r1(laatsteNl.HuishoudelijkRestafval_123),
  };

  const uit = {
    peildatum: new Date().toISOString().slice(0, 10),
    jaar,
    bronnen: {
      gemeente: { tabelId: AFVAL_GEMEENTE, titel: infoGem.Title, gewijzigd: infoGem.Modified.slice(0, 10), url: STATLINE(AFVAL_GEMEENTE) },
      landelijk: { tabelId: AFVAL_LANDELIJK, titel: infoNl.Title, gewijzigd: infoNl.Modified.slice(0, 10), url: STATLINE(AFVAL_LANDELIJK) },
      inwoners: { tabelId: KERNCIJFERS, titel: infoKern.Title, gewijzigd: infoKern.Modified.slice(0, 10), url: STATLINE(KERNCIJFERS) },
    },
    toelichting:
      'pmdKgPerInw = PMD-fractie + kunststof verpakkingen + drankenkartons + metalen verpakkingen (blik), gescheiden ingezameld, kg per inwoner. restafvalKgPerInw = huishoudelijk restafval (fijn, zonder grof), kg per inwoner. inwoners = bevolking op 1 januari van hetzelfde jaar.',
    landelijk,
    gemeenten,
  };

  const doel = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'tools-b-cbs-pmd.json');
  await writeFile(doel, `${JSON.stringify(uit, null, 1)}\n`);
  const zonderInw = gemeenten.filter((g) => g.inwoners === null).length;
  console.log(`${gemeenten.length} gemeenten (${jaar}) geschreven naar ${doel}. Zonder inwonertal: ${zonderInw}. Landelijk ${landelijk.jaar}: ${landelijk.pmdKgPerInw} kg PMD/inw.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
