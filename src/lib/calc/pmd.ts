// Rekenmodel bron- en nascheiding PMD (pure functies, onderdeel tools-b).
//
// Beide routes worden vergeleken met dezelfde nulsituatie: al het PMD gaat met het restafval naar de verbranding.
//
// Bronscheiding
//   PMD ingezameld      = inwoners × respons bronscheiding (kg/inw) / 1000
//   netto kosten        = PMD × (inzamelkosten + overige kosten − inzamelvergoeding Verpact − verbrandingstarief)
// Nascheiding
//   restafval nascheider = inwoners × restafval naar nascheider (kg/inw) / 1000
//   PMD teruggewonnen    = inwoners × teruggewonnen PMD (kg/inw) / 1000
//   netto kosten         = restafval × (nascheidingskosten − nascheidingsvergoeding) − PMD teruggewonnen × verbrandingstarief
//
// De verbrandingstarief-term is de vermeden verbranding: PMD dat niet als restafval wordt verbrand.
// Teruggewonnen PMD bij nascheiding: kental 15–25 kg per inwoner uit IPR Normag (2021). Laat de gebruiker het veld leeg,
// dan is de nascheidingsuitkomst null.

export interface PmdInvoer {
  inwoners: number;
  /** kg PMD per inwoner per jaar, gescheiden ingezameld. */
  responsBron: number;
  /** € per ton ingezameld PMD: kosten van inzameling bij bronscheiding. */
  inzamelkostenBron: number;
  /** € per ton ingezameld PMD: overige kosten (bijv. flankerend beleid, residu na opschoning). 0 = niet meegerekend. */
  overigeKostenBron: number;
  /** € per ton ingezameld PMD: inzamelvergoeding Verpact volgens staffel. */
  vergoedingBron: number;
  /** kg restafval per inwoner dat naar de nascheider gaat. */
  restafvalNa: number;
  /** € per ton restafval: nascheidingskosten. */
  nascheidingskosten: number;
  /** € per ton restafval: nascheidingsvergoeding Verpact. */
  vergoedingNa: number;
  /** kg PMD per inwoner dat de nascheider terugwint. Kental; null als de gebruiker het veld leegmaakt. */
  teruggewonnenNa: number | null;
  /** € per ton restafval: verbrandingstarief inclusief afvalstoffenbelasting (vermeden kosten). */
  verbrandingstarief: number;
}

export interface PmdRoute {
  naam: 'Bronscheiding' | 'Nascheiding';
  /** Ton PMD gescheiden ingezameld of teruggewonnen; null als onbekend. */
  pmdTon: number | null;
  /** Bij nascheiding: ton restafval door de nascheider. Bij bronscheiding gelijk aan pmdTon. */
  grondslagTon: number;
  kosten: number;
  vergoeding: number;
  /** Vermeden verbrandingskosten; null als het tonnage onbekend is. */
  vermedenVerbranding: number | null;
  /** kosten − vergoeding − vermeden verbranding. Negatief = netto opbrengst. */
  netto: number | null;
  perInwoner: number | null;
  /** Netto per ton PMD. */
  perTonPmd: number | null;
}

export interface PmdVergelijking {
  bron: PmdRoute;
  na: PmdRoute;
  /** na.netto − bron.netto. Positief: bronscheiding is goedkoper. null als een route onvolledig is. */
  verschil: number | null;
}

const perInw = (bedrag: number | null, inwoners: number) => (bedrag === null ? null : inwoners > 0 ? bedrag / inwoners : 0);
const perTon = (bedrag: number | null, ton: number | null) => (bedrag === null || ton === null ? null : ton > 0 ? bedrag / ton : 0);

export function routeBron(i: PmdInvoer): PmdRoute {
  const pmdTon = (i.inwoners * i.responsBron) / 1000;
  const kosten = pmdTon * (i.inzamelkostenBron + i.overigeKostenBron);
  const vergoeding = pmdTon * i.vergoedingBron;
  const vermedenVerbranding = pmdTon * i.verbrandingstarief;
  const netto = kosten - vergoeding - vermedenVerbranding;
  return {
    naam: 'Bronscheiding',
    pmdTon,
    grondslagTon: pmdTon,
    kosten,
    vergoeding,
    vermedenVerbranding,
    netto,
    perInwoner: perInw(netto, i.inwoners),
    perTonPmd: perTon(netto, pmdTon),
  };
}

export function routeNa(i: PmdInvoer): PmdRoute {
  const grondslagTon = (i.inwoners * i.restafvalNa) / 1000;
  const pmdTon = i.teruggewonnenNa === null || !Number.isFinite(i.teruggewonnenNa) ? null : (i.inwoners * i.teruggewonnenNa) / 1000;
  const kosten = grondslagTon * i.nascheidingskosten;
  const vergoeding = grondslagTon * i.vergoedingNa;
  const vermedenVerbranding = pmdTon === null ? null : pmdTon * i.verbrandingstarief;
  const netto = vermedenVerbranding === null ? null : kosten - vergoeding - vermedenVerbranding;
  return {
    naam: 'Nascheiding',
    pmdTon,
    grondslagTon,
    kosten,
    vergoeding,
    vermedenVerbranding,
    netto,
    perInwoner: perInw(netto, i.inwoners),
    perTonPmd: perTon(netto, pmdTon),
  };
}

export function pmdVergelijking(i: PmdInvoer): PmdVergelijking {
  const bron = routeBron(i);
  const na = routeNa(i);
  return {
    bron,
    na,
    verschil: bron.netto === null || na.netto === null ? null : na.netto - bron.netto,
  };
}

/**
 * Teruggewonnen PMD (kg/inw) waarbij nascheiding even duur is als bronscheiding.
 * null als dat niet kan (verbrandingstarief 0 of geen inwoners).
 */
export function breakEvenTeruggewonnen(i: PmdInvoer): number | null {
  if (i.verbrandingstarief <= 0 || i.inwoners <= 0) return null;
  const bron = routeBron(i).netto as number;
  const naZonderVermeden = (i.inwoners * i.restafvalNa * (i.nascheidingskosten - i.vergoedingNa)) / 1000;
  // naZonderVermeden − (inw × x / 1000) × tarief = bron  →  x = (naZonderVermeden − bron) × 1000 / (inw × tarief)
  return ((naZonderVermeden - bron) * 1000) / (i.inwoners * i.verbrandingstarief);
}

/** Inzamelvergoeding bij bronscheiding voor een reeks vergoedingen per ton (bijv. per staffelcategorie). */
export function vergoedingVoorTonnage(pmdTon: number, euroPerTon: number): number {
  return pmdTon * euroPerTon;
}

/* ---------- Deellink ---------- */

const sleutels: Record<keyof PmdInvoer, string> = {
  inwoners: 'inw',
  responsBron: 'rb',
  inzamelkostenBron: 'kb',
  overigeKostenBron: 'ob',
  vergoedingBron: 'vb',
  restafvalNa: 'rn',
  nascheidingskosten: 'kn',
  vergoedingNa: 'vn',
  teruggewonnenNa: 'tn',
  verbrandingstarief: 'vt',
};

export function pmdNaarParams(i: PmdInvoer, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams(extra);
  for (const [k, s] of Object.entries(sleutels) as [keyof PmdInvoer, string][]) {
    const w = i[k];
    if (w !== null && Number.isFinite(w)) p.set(s, String(w));
  }
  return p;
}

export function pmdUitParams(p: URLSearchParams, standaard: PmdInvoer): PmdInvoer {
  const uit = { ...standaard };
  for (const [k, s] of Object.entries(sleutels) as [keyof PmdInvoer, string][]) {
    const t = p.get(s);
    if (t === null) continue;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) continue;
    (uit as Record<string, number | null>)[k] = n;
  }
  return uit;
}

/* ---------- Controle van de invoer ---------- */

export interface PmdGrenzen {
  /** Hoogste waarde voor teruggewonnen PMD in de bron (kg per inwoner). */
  teruggewonnenHoog: number;
  /** Aandeel PMD in restafval dat naar nascheiding gaat (0–1), volgens het kostenonderzoek. */
  pmdAandeelRestafval: number;
  /** Hoogste gescheiden ingezamelde hoeveelheid PMD van een gemeente volgens CBS (kg per inwoner). */
  responsMax: number;
  /** Inwoners van Nederland. */
  inwonersNl: number;
}

export interface PmdControle {
  fouten: string[];
  signalen: string[];
}

const kg = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')} kg`;

/** Controleert de invoer op onmogelijke en ongebruikelijke waarden. */
export function controleerPmd(i: PmdInvoer, g: PmdGrenzen): PmdControle {
  const fouten: string[] = [];
  const signalen: string[] = [];
  if (i.inwoners <= 0) fouten.push('Vul een aantal inwoners groter dan 0 in.');
  if (i.teruggewonnenNa !== null && i.teruggewonnenNa > i.restafvalNa)
    fouten.push(
      `Teruggewonnen PMD (${kg(i.teruggewonnenNa)} per inwoner) is meer dan het restafval dat naar de nascheider gaat (${kg(i.restafvalNa)}). Dat kan niet.`,
    );
  else if (i.teruggewonnenNa !== null && i.teruggewonnenNa > g.teruggewonnenHoog)
    signalen.push(
      `Teruggewonnen PMD van ${kg(i.teruggewonnenNa)} per inwoner ligt boven de hoogste praktijkwaarde in de bron (${kg(g.teruggewonnenHoog)}). Vraag de onderbouwing op bij de nascheider.`,
    );
  if (i.teruggewonnenNa !== null && i.teruggewonnenNa <= i.restafvalNa && i.teruggewonnenNa > i.restafvalNa * g.pmdAandeelRestafval)
    signalen.push(
      `Bij ${kg(i.restafvalNa)} restafval per inwoner zit er gemiddeld ${kg(i.restafvalNa * g.pmdAandeelRestafval)} PMD in. Het teruggewonnen PMD is hoger; dat is alleen haalbaar als uw restafval meer PMD bevat dan gemiddeld.`,
    );
  if (i.responsBron > g.responsMax * 1.2)
    signalen.push(
      `${kg(i.responsBron)} PMD per inwoner is meer dan de gemeente met de hoogste inzameling volgens CBS (${kg(g.responsMax)}). Controleer de waarde.`,
    );
  if (i.inwoners > g.inwonersNl) signalen.push('Het aantal inwoners is groter dan dat van heel Nederland. Controleer de waarde.');
  return { fouten, signalen };
}

/* ---------- Bandbreedte ---------- */

export type PmdVariant = 'teruggewonnenNa' | 'verbrandingstarief' | 'nascheidingskosten';
export type PmdVarianten = Partial<Record<PmdVariant, { laag: number; midden: number; hoog: number }>>;

/** Velden die gelijk zijn aan de middelste waarde van hun variant (dus niet door de gebruiker aangepast). */
export function volgendeVarianten(i: PmdInvoer, varianten: PmdVarianten): PmdVariant[] {
  return (Object.keys(varianten) as PmdVariant[]).filter((k) => i[k] === varianten[k]!.midden);
}

/** Alle combinaties van laag en hoog voor de velden die hun variant volgen. */
export function pmdCombinaties(i: PmdInvoer, varianten: PmdVarianten): PmdInvoer[] {
  let combinaties: PmdInvoer[] = [i];
  for (const k of volgendeVarianten(i, varianten)) {
    const v = varianten[k]!;
    combinaties = combinaties.flatMap((c) => [
      { ...c, [k]: v.laag },
      { ...c, [k]: v.hoog },
    ]);
  }
  return combinaties;
}

/**
 * Bandbreedte van de netto kosten per route, van het verschil en van het omslagpunt in nascheidingstarief, als de
 * kentallen tussen laag en hoog variëren. Alleen velden die gelijk zijn aan de middelste waarde (dus niet door de
 * gebruiker aangepast) variëren mee. Rekent alle combinaties van laag en hoog door en geeft per uitkomst het minimum
 * en maximum.
 */
export function pmdBandbreedte(i: PmdInvoer, varianten: PmdVarianten) {
  const volgt = volgendeVarianten(i, varianten);
  if (volgt.length === 0) return null;
  const combinaties = pmdCombinaties(i, varianten);
  const uitkomsten = combinaties.map(pmdVergelijking);
  const bereik = (w: (number | null)[]) => {
    const x = w.filter((n): n is number => n !== null && Number.isFinite(n));
    return x.length ? { laag: Math.min(...x), hoog: Math.max(...x) } : null;
  };
  return {
    volgt,
    bron: bereik(uitkomsten.map((v) => v.bron.netto)),
    na: bereik(uitkomsten.map((v) => v.na.netto)),
    verschil: bereik(uitkomsten.map((v) => v.verschil)),
    omslagTarief: bereik(combinaties.map(omslagNascheidingskosten)),
  };
}

/**
 * Nascheidingstarief (€ per ton restafval) waarbij nascheiding even duur is als bronscheiding. Ligt het tarief van de
 * nascheider lager, dan is nascheiding goedkoper. null als het niet te berekenen is (geen restafval of teruggewonnen
 * PMD onbekend).
 *   restafval × (k − vergoeding) − PMD terug × verbrandingstarief = netto bronscheiding
 *   k = (netto bronscheiding + PMD terug × verbrandingstarief) / restafval + vergoeding
 */
export function omslagNascheidingskosten(i: PmdInvoer): number | null {
  const restTon = (i.inwoners * i.restafvalNa) / 1000;
  if (restTon <= 0 || i.teruggewonnenNa === null || !Number.isFinite(i.teruggewonnenNa)) return null;
  const pmdNaTon = (i.inwoners * i.teruggewonnenNa) / 1000;
  const bron = routeBron(i).netto as number;
  return (bron + pmdNaTon * i.verbrandingstarief) / restTon + i.vergoedingNa;
}

/**
 * Mag de tool een conclusie trekken over welke route goedkoper is? Alleen als de gebruiker een eigen
 * nascheidingstarief heeft ingevuld: het kental heeft in de bron geen vaste eenheid (zie tools-b-pmd.ts).
 * Een eigen waarde is elke waarde die afwijkt van het kental.
 */
export function pmdConclusieMogelijk(i: PmdInvoer, kentalNascheidingskosten: number): boolean {
  return i.nascheidingskosten !== kentalNascheidingskosten;
}
