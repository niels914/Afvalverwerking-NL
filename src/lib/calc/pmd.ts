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
// Teruggewonnen PMD bij nascheiding heeft geen openbare bron; zonder die invoer is de nascheidingsuitkomst null.

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
  /** kg PMD per inwoner dat de nascheider terugwint. Geen openbare bron: null tot de gebruiker invult. */
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
  return { naam: 'Bronscheiding', pmdTon, grondslagTon: pmdTon, kosten, vergoeding, vermedenVerbranding, netto, perInwoner: perInw(netto, i.inwoners), perTonPmd: perTon(netto, pmdTon) };
}

export function routeNa(i: PmdInvoer): PmdRoute {
  const grondslagTon = (i.inwoners * i.restafvalNa) / 1000;
  const pmdTon = i.teruggewonnenNa === null || !Number.isFinite(i.teruggewonnenNa) ? null : (i.inwoners * i.teruggewonnenNa) / 1000;
  const kosten = grondslagTon * i.nascheidingskosten;
  const vergoeding = grondslagTon * i.vergoedingNa;
  const vermedenVerbranding = pmdTon === null ? null : pmdTon * i.verbrandingstarief;
  const netto = vermedenVerbranding === null ? null : kosten - vergoeding - vermedenVerbranding;
  return { naam: 'Nascheiding', pmdTon, grondslagTon, kosten, vergoeding, vermedenVerbranding, netto, perInwoner: perInw(netto, i.inwoners), perTonPmd: perTon(netto, pmdTon) };
}

export function pmdVergelijking(i: PmdInvoer): PmdVergelijking {
  const bron = routeBron(i);
  const na = routeNa(i);
  return { bron, na, verschil: bron.netto === null || na.netto === null ? null : na.netto - bron.netto };
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
