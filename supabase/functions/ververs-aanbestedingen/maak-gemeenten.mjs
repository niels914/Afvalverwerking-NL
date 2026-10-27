// Maakt gemeenten.ts: gemeentenaam -> provincie, uit CBS "Gebieden in Nederland" 2013 tot en met 2026.
// Alle jaren, zodat ook opgeheven gemeenten in oudere aankondigingen (vanaf 2013) herkend worden.
//
// Draaien (vanuit de projectmap): NODE_USE_ENV_PROXY=1 node supabase/functions/ververs-aanbestedingen/maak-gemeenten.mjs
// Daarna de Edge Function opnieuw uitrollen en één keer verversen (zie docs/stukken/aanbestedingen.md).

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABELLEN = {
  2013: '82000NED', 2014: '82496NED', 2015: '82949NED', 2016: '83287NED', 2017: '83553NED', 2018: '83859NED',
  2019: '84378NED', 2020: '84721NED', 2021: '84929NED', 2022: '85067NED', 2023: '85385NED', 2024: '85755NED',
  2025: '86059NED', 2026: '86247NED',
};
const API = 'https://opendata.cbs.nl/ODataApi/odata';

const haal = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} bij ${url}`);
  return r.json();
};

/** Zelfde normalisatie als normaliseerNaam() in afleiding.ts. */
const norm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[.]/g, '').replace(/\s+/g, ' ').trim();

const perNaam = new Map(); // naam -> Set(provincie)
for (const [jaar, id] of Object.entries(TABELLEN)) {
  const props = (await haal(`${API}/${id}/DataProperties?$format=json`)).value;
  const groep = props.find((p) => p.Title === 'Provincies');
  const naamKol = props.find((p) => p.ParentID === groep.ID && p.Title === 'Naam').Key;
  const gemKol = props.find((p) => p.Title === 'Naam' && props.find((g) => g.ID === p.ParentID)?.Title === 'Codes en namen van gemeenten').Key;
  const rijen = (await haal(`${API}/${id}/TypedDataSet?$select=${gemKol},${naamKol}&$format=json`)).value;
  for (const r of rijen) {
    const gem = norm(r[gemKol]);
    const prov = r[naamKol].trim().replace(/^Friesland$/, 'Fryslân');
    if (!gem || !prov) continue;
    if (!perNaam.has(gem)) perNaam.set(gem, new Set());
    perNaam.get(gem).add(prov);
  }
  console.log(jaar, id, rijen.length, 'gemeenten');
}

// Gangbare namen die TenderNed-opdrachtgevers gebruiken naast de officiële CBS-naam.
const ALIASSEN = { 'den haag': "'s-gravenhage", 'den bosch': "'s-hertogenbosch", 's-hertogenbosch': "'s-hertogenbosch" };
for (const [alias, officieel] of Object.entries(ALIASSEN)) if (perNaam.has(officieel)) perNaam.set(alias, perNaam.get(officieel));

const uit = {};
let dubbel = 0;
for (const [naam, provs] of [...perNaam].sort(([a], [b]) => a.localeCompare(b))) {
  if (provs.size === 1) uit[naam] = [...provs][0];
  else dubbel++;
}
console.log(Object.keys(uit).length, 'namen;', dubbel, 'namen met meer provincies overgeslagen');

const vandaag = new Date().toISOString().slice(0, 10);
const tekst = `// Gegenereerd door maak-gemeenten.mjs op ${vandaag}. Niet met de hand aanpassen.
// Bron: CBS, "Gebieden in Nederland" 2013 tot en met 2026 (open data, CC BY 4.0), https://opendata.cbs.nl/ (tabellen ${Object.values(TABELLEN).join(', ')}).
// Sleutel: gemeentenaam genormaliseerd (kleine letters, zonder accenten en punten). Waarde: provincie.
// Namen die in verschillende jaren bij verschillende provincies hoorden, zijn weggelaten.

export const GEMEENTEN_BRON = {
  naam: 'CBS, Gebieden in Nederland 2013-2026',
  url: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/86247NED/table',
  peildatum: '${vandaag}',
};

export const GEMEENTE_PROVINCIE: Record<string, string> = ${JSON.stringify(uit, null, 0).replace(/","/g, '",\n  "').replace(/^\{/, '{\n  ').replace(/\}$/, ',\n}')};
`;
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'gemeenten.ts'), tekst);
