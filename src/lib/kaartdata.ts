// Rekenhulp voor de Restafvalkaart: indicatoren, klassen voor de legenda, landelijke gemiddelden,
// rangorde en zoeken. Pure functies, getest in kaartdata.test.ts.

import type { GemeenteAfval } from '../data/gemeenten';

export type IndicatorId = 'restafval' | 'scheidingsPct' | 'totaal';

export interface Indicator {
  id: IndicatorId;
  label: string;
  kort: string;
  eenheid: string;
  decimalen: number;
  /** Ondergrenzen van klasse 2 t/m 5 (klasse 1 is alles eronder). Vaste, ronde grenzen zodat de
   *  legenda tussen jaren vergelijkbaar blijft. */
  grenzen: [number, number, number, number];
  /** Welke kant gunstig is; alleen gebruikt in teksten, niet in de kleur. */
  lagerIsBeter: boolean;
  uitleg: string;
}

export const indicatoren: Record<IndicatorId, Indicator> = {
  restafval: {
    id: 'restafval',
    label: 'Restafval per inwoner',
    kort: 'Restafval',
    eenheid: 'kg',
    decimalen: 0,
    grenzen: [100, 150, 200, 250],
    lagerIsBeter: true,
    uitleg: 'Fijn en grof huishoudelijk restafval in kilo per inwoner per jaar.',
  },
  scheidingsPct: {
    id: 'scheidingsPct',
    label: 'Gescheiden ingezameld',
    kort: 'Scheiding',
    eenheid: '%',
    decimalen: 0,
    grenzen: [50, 60, 70, 80],
    lagerIsBeter: false,
    uitleg: 'Deel van al het huishoudelijk afval dat gescheiden is ingezameld. Nascheiding telt niet mee.',
  },
  totaal: {
    id: 'totaal',
    label: 'Totaal huishoudelijk afval',
    kort: 'Totaal',
    eenheid: 'kg',
    decimalen: 0,
    grenzen: [400, 450, 500, 550],
    lagerIsBeter: true,
    uitleg: 'Alle ingezamelde huishoudelijke afvalstromen samen, in kilo per inwoner per jaar.',
  },
};

/** Sequentiële reeks van één tint (violet), licht naar donker. Gecontroleerd met de dataviz-validator:
 *  oplopende lichtheid, zichtbare stappen, lichtste stap ≥ 2:1 tegen wit. */
export const KLEUREN = ['#b3abe0', '#9087cb', '#6e63b4', '#4f4497', '#322873'] as const;
export const KLEUR_GEEN = '#ffffff';

export function waardeVan(g: GemeenteAfval, id: IndicatorId): number | null {
  const w = g[id];
  return typeof w === 'number' && Number.isFinite(w) ? w : null;
}

/** Klasse 0 t/m 4, of null als er geen waarde is. */
export function klasseVan(waarde: number | null, grenzen: readonly number[]): number | null {
  if (waarde === null) return null;
  let k = 0;
  for (const g of grenzen) if (waarde >= g) k++;
  return k;
}

export interface Klasse {
  index: number;
  kleur: string;
  van: number | null;
  tot: number | null;
  aantal: number;
}

/** De vijf klassen van een indicator, met het aantal gemeenten per klasse. */
export function klassen(lijst: GemeenteAfval[], id: IndicatorId): Klasse[] {
  const { grenzen } = indicatoren[id];
  const aantal = [0, 0, 0, 0, 0];
  for (const g of lijst) {
    const k = klasseVan(waardeVan(g, id), grenzen);
    if (k !== null) aantal[k]++;
  }
  return KLEUREN.map((kleur, i) => ({
    index: i,
    kleur,
    van: i === 0 ? null : grenzen[i - 1],
    tot: i === KLEUREN.length - 1 ? null : grenzen[i],
    aantal: aantal[i],
  }));
}

export function kleurVan(g: GemeenteAfval | undefined, id: IndicatorId): string {
  if (!g) return KLEUR_GEEN;
  const k = klasseVan(waardeVan(g, id), indicatoren[id].grenzen);
  return k === null ? KLEUR_GEEN : KLEUREN[k];
}

/**
 * Gemiddelde over gemeenten, gewogen naar inwoners. Gemeenten zonder waarde of zonder inwonertal
 * tellen niet mee. Benadert het landelijke CBS-cijfer, maar is er niet aan gelijk (CBS rekent met
 * tonnen; afronding per gemeente).
 */
export function gewogenGemiddelde(lijst: GemeenteAfval[], id: IndicatorId): number | null {
  let som = 0;
  let gewicht = 0;
  for (const g of lijst) {
    const w = waardeVan(g, id);
    if (w === null || !g.inwoners) continue;
    if (id === 'scheidingsPct') {
      // Percentage wegen naar de hoeveelheid afval (inwoners × totaal), zoals een landelijk percentage.
      if (g.totaal === null) continue;
      som += w * g.inwoners * g.totaal;
      gewicht += g.inwoners * g.totaal;
    } else {
      som += w * g.inwoners;
      gewicht += g.inwoners;
    }
  }
  return gewicht > 0 ? som / gewicht : null;
}

/**
 * Plaats van een gemeente in de rangorde. Plaats 1 = gunstigste waarde (minste restafval of
 * hoogste scheidingspercentage). Gelijke waarden krijgen dezelfde plaats.
 */
export function rangVan(g: GemeenteAfval, lijst: GemeenteAfval[], id: IndicatorId): { plaats: number; van: number } | null {
  const eigen = waardeVan(g, id);
  if (eigen === null) return null;
  const waarden = lijst.map((x) => waardeVan(x, id)).filter((w): w is number => w !== null);
  const beter = indicatoren[id].lagerIsBeter ? waarden.filter((w) => w < eigen).length : waarden.filter((w) => w > eigen).length;
  return { plaats: beter + 1, van: waarden.length };
}

export interface Kerncijfers {
  inwoners: number;
  aantalGemeenten: number;
  restafvalKgPerInw: number | null;
  scheidingsPct: number | null;
  totaalKgPerInw: number | null;
  /** Restafval in ton per jaar (som over gemeenten met inwonertal). */
  restafvalTon: number;
}

/** Kerncijfers voor een groep gemeenten (land, provincie of later een samenwerkingsverband). */
export function kerncijfers(lijst: GemeenteAfval[]): Kerncijfers {
  return {
    inwoners: lijst.reduce((s, g) => s + (g.inwoners ?? 0), 0),
    aantalGemeenten: lijst.length,
    restafvalKgPerInw: gewogenGemiddelde(lijst, 'restafval'),
    scheidingsPct: gewogenGemiddelde(lijst, 'scheidingsPct'),
    totaalKgPerInw: gewogenGemiddelde(lijst, 'totaal'),
    restafvalTon: lijst.reduce((s, g) => s + (g.inwoners ? (g.restafval * g.inwoners) / 1000 : 0), 0),
  };
}

/** Maakt een naam vergelijkbaar: kleine letters, zonder accenten, leestekens en "'s-". */
export function normaliseer(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^'s-|^'t |^s-/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Zoekt gemeenten op naam of CBS-code. Eerst namen die met de zoekterm beginnen, dan de rest. */
export function zoekGemeenten(term: string, lijst: GemeenteAfval[], max = 8): GemeenteAfval[] {
  const t = normaliseer(term);
  if (!t) return [];
  const code = term.trim().toUpperCase();
  const begin: GemeenteAfval[] = [];
  const midden: GemeenteAfval[] = [];
  for (const g of lijst) {
    const n = normaliseer(g.naam);
    if (n.startsWith(t) || g.code === code) begin.push(g);
    else if (n.includes(t)) midden.push(g);
  }
  return [...begin, ...midden].slice(0, max);
}

/** Vindt één gemeente bij een exacte naam (genormaliseerd) of code. */
export function vindGemeente(term: string, lijst: GemeenteAfval[]): GemeenteAfval | undefined {
  const t = normaliseer(term);
  const code = term.trim().toUpperCase();
  return lijst.find((g) => g.code === code || normaliseer(g.naam) === t);
}

/** CSV met puntkomma en decimale komma (opent goed in Nederlandse Excel). */
export function naarCsv(lijst: GemeenteAfval[], peiljaar: number): string {
  const kop = [
    'CBS-code',
    'Gemeente',
    'Provincie',
    'Inwoners',
    `Restafval kg/inw ${peiljaar}`,
    'Fijn restafval kg/inw',
    'Grof restafval kg/inw',
    'Gescheiden ingezameld %',
    'Totaal huishoudelijk afval kg/inw',
    'GFT kg/inw',
    'Papier en karton kg/inw',
    'PMD kg/inw',
    'Glas kg/inw',
    'Textiel kg/inw',
    `Restafval kg/inw ${peiljaar - 1}`,
  ];
  const getal = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
  const veilig = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rijen = lijst.map((g) =>
    [
      g.code,
      veilig(g.naam),
      veilig(g.provincie ?? ''),
      getal(g.inwoners),
      getal(g.restafval),
      getal(g.fijnRest),
      getal(g.grofRest),
      getal(g.scheidingsPct),
      getal(g.totaal),
      getal(g.gft),
      getal(g.papier),
      getal(g.pmd),
      getal(g.glas),
      getal(g.textiel),
      getal(g.restafvalVorigJaar),
    ].join(';'),
  );
  return [kop.join(';'), ...rijen].join('\r\n');
}
