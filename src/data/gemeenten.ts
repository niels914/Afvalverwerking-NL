import type { Gemeente } from './types';

// FICTIEF: verzonnen gemeenten met verzonnen cijfers en fictieve CBS-codes (GM9xxx bestaat niet).
// Vervang deze lijst door de echte Restafvalkaart-data per gemeente: zelfde velden, één rij per gemeente.
// Zie README, "Echte data inlezen".

const J = 2025;

export const gemeenten: Gemeente[] = [
  // Afvalsamenwerking Regio Noord
  { cbsCode: 'GM9001', naam: 'Noordveen', samenwerkingsverbandId: 'regio-noord', inwoners: 61200, restafvalKgPerInw: 168, scheidingsPct: 62.4, jaar: J },
  { cbsCode: 'GM9002', naam: 'Wierhorn', samenwerkingsverbandId: 'regio-noord', inwoners: 24800, restafvalKgPerInw: 141, scheidingsPct: 66.1, jaar: J },
  { cbsCode: 'GM9003', naam: 'Eemsterland', samenwerkingsverbandId: 'regio-noord', inwoners: 33500, restafvalKgPerInw: 152, scheidingsPct: 64.0, jaar: J },
  { cbsCode: 'GM9004', naam: 'Hogeweerd', samenwerkingsverbandId: 'regio-noord', inwoners: 18900, restafvalKgPerInw: 129, scheidingsPct: 69.3, jaar: J },
  // Afvalsamenwerking Veenstreek
  { cbsCode: 'GM9011', naam: 'Turfveen', samenwerkingsverbandId: 'veenstreek', inwoners: 42100, restafvalKgPerInw: 118, scheidingsPct: 71.8, jaar: J },
  { cbsCode: 'GM9012', naam: 'Hunzedal', samenwerkingsverbandId: 'veenstreek', inwoners: 27300, restafvalKgPerInw: 104, scheidingsPct: 74.2, jaar: J },
  { cbsCode: 'GM9013', naam: 'Compasdorp', samenwerkingsverbandId: 'veenstreek', inwoners: 15600, restafvalKgPerInw: 97, scheidingsPct: 76.5, jaar: J },
  // Reinigingsbedrijf Merengebied
  { cbsCode: 'GM9021', naam: 'Merenwold', samenwerkingsverbandId: 'merengebied', inwoners: 38700, restafvalKgPerInw: 92, scheidingsPct: 78.1, jaar: J },
  { cbsCode: 'GM9022', naam: 'Fjildwerd', samenwerkingsverbandId: 'merengebied', inwoners: 29400, restafvalKgPerInw: 86, scheidingsPct: 79.6, jaar: J },
  { cbsCode: 'GM9023', naam: 'Lindewier', samenwerkingsverbandId: 'merengebied', inwoners: 21800, restafvalKgPerInw: 99, scheidingsPct: 77.0, jaar: J },
  // Milieusamenwerking Oostgrens
  { cbsCode: 'GM9031', naam: 'Dinkelveld', samenwerkingsverbandId: 'oostgrens', inwoners: 52400, restafvalKgPerInw: 81, scheidingsPct: 81.2, jaar: J },
  { cbsCode: 'GM9032', naam: 'Grensmark', samenwerkingsverbandId: 'oostgrens', inwoners: 34100, restafvalKgPerInw: 76, scheidingsPct: 82.7, jaar: J },
  { cbsCode: 'GM9033', naam: 'Esveen', samenwerkingsverbandId: 'oostgrens', inwoners: 26200, restafvalKgPerInw: 88, scheidingsPct: 80.4, jaar: J },
  { cbsCode: 'GM9034', naam: 'Berkelhof', samenwerkingsverbandId: 'oostgrens', inwoners: 19700, restafvalKgPerInw: 72, scheidingsPct: 83.9, jaar: J },
  // Grondstoffendienst Polderland
  { cbsCode: 'GM9041', naam: 'Nieuwkavel', samenwerkingsverbandId: 'polderland', inwoners: 79600, restafvalKgPerInw: 189, scheidingsPct: 55.3, jaar: J },
  { cbsCode: 'GM9042', naam: 'Oostvaart', samenwerkingsverbandId: 'polderland', inwoners: 46300, restafvalKgPerInw: 164, scheidingsPct: 59.8, jaar: J },
  { cbsCode: 'GM9043', naam: 'Dijkpolder', samenwerkingsverbandId: 'polderland', inwoners: 22900, restafvalKgPerInw: 143, scheidingsPct: 63.5, jaar: J },
  // Reinigingsdienst Rivierenland
  { cbsCode: 'GM9051', naam: 'Lingeoord', samenwerkingsverbandId: 'rivierenland', inwoners: 44800, restafvalKgPerInw: 109, scheidingsPct: 73.4, jaar: J },
  { cbsCode: 'GM9052', naam: 'Waaldijk', samenwerkingsverbandId: 'rivierenland', inwoners: 37200, restafvalKgPerInw: 101, scheidingsPct: 75.1, jaar: J },
  { cbsCode: 'GM9053', naam: 'Bommelwaard', samenwerkingsverbandId: 'rivierenland', inwoners: 28600, restafvalKgPerInw: 94, scheidingsPct: 76.8, jaar: J },
  // Grondstoffenbedrijf Kustzone
  { cbsCode: 'GM9061', naam: 'Duinwijk', samenwerkingsverbandId: 'kustzone', inwoners: 92300, restafvalKgPerInw: 214, scheidingsPct: 48.6, jaar: J },
  { cbsCode: 'GM9062', naam: 'Zeeburgh', samenwerkingsverbandId: 'kustzone', inwoners: 58100, restafvalKgPerInw: 196, scheidingsPct: 51.9, jaar: J },
  { cbsCode: 'GM9063', naam: 'Strandmeer', samenwerkingsverbandId: 'kustzone', inwoners: 31400, restafvalKgPerInw: 177, scheidingsPct: 56.2, jaar: J },
  // Milieudienst Groene Hart-West
  { cbsCode: 'GM9071', naam: 'Plassenoord', samenwerkingsverbandId: 'groene-hart-west', inwoners: 48900, restafvalKgPerInw: 158, scheidingsPct: 60.7, jaar: J },
  { cbsCode: 'GM9072', naam: 'Gouweland', samenwerkingsverbandId: 'groene-hart-west', inwoners: 35600, restafvalKgPerInw: 147, scheidingsPct: 62.9, jaar: J },
  { cbsCode: 'GM9073', naam: 'Wetering', samenwerkingsverbandId: 'groene-hart-west', inwoners: 17800, restafvalKgPerInw: 131, scheidingsPct: 66.4, jaar: J },
  // Inzamelcoöperatie Deltagemeenten
  { cbsCode: 'GM9081', naam: 'Scheldeoord', samenwerkingsverbandId: 'deltagemeenten', inwoners: 41300, restafvalKgPerInw: 137, scheidingsPct: 65.8, jaar: J },
  { cbsCode: 'GM9082', naam: 'Polderkerke', samenwerkingsverbandId: 'deltagemeenten', inwoners: 23700, restafvalKgPerInw: 126, scheidingsPct: 68.2, jaar: J },
  { cbsCode: 'GM9083', naam: 'Veerhaven', samenwerkingsverbandId: 'deltagemeenten', inwoners: 14900, restafvalKgPerInw: 119, scheidingsPct: 70.1, jaar: J },
  // Afvalregio Zandgronden
  { cbsCode: 'GM9091', naam: 'Heidebeek', samenwerkingsverbandId: 'zandgronden', inwoners: 66500, restafvalKgPerInw: 112, scheidingsPct: 72.6, jaar: J },
  { cbsCode: 'GM9092', naam: 'Dommelrode', samenwerkingsverbandId: 'zandgronden', inwoners: 39800, restafvalKgPerInw: 98, scheidingsPct: 75.9, jaar: J },
  { cbsCode: 'GM9093', naam: 'Akkerveld', samenwerkingsverbandId: 'zandgronden', inwoners: 25100, restafvalKgPerInw: 91, scheidingsPct: 77.3, jaar: J },
  // Afvalsamenwerking Maasvallei
  { cbsCode: 'GM9101', naam: 'Maasbeek', samenwerkingsverbandId: 'maasvallei', inwoners: 47600, restafvalKgPerInw: 103, scheidingsPct: 74.0, jaar: J },
  { cbsCode: 'GM9102', naam: 'Peeloord', samenwerkingsverbandId: 'maasvallei', inwoners: 32200, restafvalKgPerInw: 95, scheidingsPct: 76.2, jaar: J },
  { cbsCode: 'GM9103', naam: 'Roerhoven', samenwerkingsverbandId: 'maasvallei', inwoners: 20500, restafvalKgPerInw: 108, scheidingsPct: 73.1, jaar: J },
  // Afvalschap Heuvelland-Zuid
  { cbsCode: 'GM9111', naam: 'Geuldal', samenwerkingsverbandId: 'heuvelland-zuid', inwoners: 29800, restafvalKgPerInw: 124, scheidingsPct: 67.5, jaar: J },
  { cbsCode: 'GM9112', naam: 'Mergelberg', samenwerkingsverbandId: 'heuvelland-zuid', inwoners: 22400, restafvalKgPerInw: 117, scheidingsPct: 69.0, jaar: J },
];
