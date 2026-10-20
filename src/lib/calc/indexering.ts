// Indexcalculator: tarief dat meebeweegt met een gewogen mix van indexreeksen.
// Formule: nieuw tarief = basistarief × (vast deel + Σ(weging_i × index_i,peil / index_i,basis))
// De reeksen komen van CBS (src/data/indexreeksen.json, opgehaald met scripts/cbs-indexreeksen.mjs).
// Alle functies hier zijn puur: geen data-import, zodat ze los te testen zijn.

export type Periodesoort = 'maand' | 'jaar';

/** Periode als tekst: "2024" (jaar) of "2024-03" (maand). */
export type Periode = string;

/** Minimale vorm van een reeks: waarden per maand ("2024-03") en per jaar ("2024"). */
export interface ReeksWaarden {
  maanden: Record<string, number>;
  jaren: Record<string, number>;
}

export interface IndexOnderdeel {
  naam: string;
  /** Weging als fractie (0–1). */
  weging: number;
  /** Indexwaarde in de basisperiode. */
  basis: number;
  /** Indexwaarde in de peilperiode. */
  nu: number;
}

/** Som van de wegingen. */
export function somWegingen(onderdelen: Pick<IndexOnderdeel, 'weging'>[]): number {
  return onderdelen.reduce((s, o) => s + o.weging, 0);
}

/** Klopt de weging (wegingen plus vast deel samen 100 %)? */
export function wegingKlopt(onderdelen: Pick<IndexOnderdeel, 'weging'>[], tolerantie = 1e-6, vastDeel = 0): boolean {
  return Math.abs(somWegingen(onderdelen) + vastDeel - 1) <= tolerantie;
}

/**
 * Gewogen indexfactor: vast deel + Σ(weging_i × nu_i / basis_i).
 * Het vaste deel (fractie 0–1) wordt niet geïndexeerd; het telt mee met factor 1.
 */
export function indexFactor(onderdelen: IndexOnderdeel[], vastDeel = 0): number {
  return onderdelen.reduce((s, o) => {
    if (!(o.basis > 0)) throw new Error(`Basisindex van "${o.naam}" moet groter dan 0 zijn`);
    return s + o.weging * (o.nu / o.basis);
  }, vastDeel);
}

/** Nieuw tarief = basistarief × indexfactor. */
export function nieuwTarief(basistarief: number, onderdelen: IndexOnderdeel[], vastDeel = 0): number {
  return basistarief * indexFactor(onderdelen, vastDeel);
}

/* ---------- Perioden ---------- */

/** Waarde van een reeks in een periode, of undefined als CBS die niet publiceert. */
export function waardeOp(reeks: ReeksWaarden, soort: Periodesoort, periode: Periode): number | undefined {
  const w = soort === 'jaar' ? reeks.jaren[periode] : reeks.maanden[periode];
  return Number.isFinite(w) ? w : undefined;
}

/** Alle perioden van één reeks, oplopend. */
export function periodenVan(reeks: ReeksWaarden, soort: Periodesoort): Periode[] {
  return Object.keys(soort === 'jaar' ? reeks.jaren : reeks.maanden).sort();
}

/** Perioden waarin álle opgegeven reeksen een waarde hebben, oplopend. */
export function gemeenschappelijkePerioden(reeksen: ReeksWaarden[], soort: Periodesoort): Periode[] {
  if (reeksen.length === 0) return [];
  return periodenVan(reeksen[0], soort).filter((p) => reeksen.every((r) => waardeOp(r, soort, p) !== undefined));
}

/**
 * Kies een geldige periode: de gewenste als die beschikbaar is, anders de dichtstbijzijnde
 * (bij gelijke afstand de latere). Geeft undefined als er niets beschikbaar is.
 */
export function kiesPeriode(beschikbaar: Periode[], gewenst: Periode | undefined): Periode | undefined {
  if (beschikbaar.length === 0) return undefined;
  if (gewenst && beschikbaar.includes(gewenst)) return gewenst;
  if (!gewenst) return beschikbaar[beschikbaar.length - 1];
  const doel = periodeNummer(gewenst);
  let beste = beschikbaar[0];
  for (const p of beschikbaar) {
    if (Math.abs(periodeNummer(p) - doel) <= Math.abs(periodeNummer(beste) - doel)) beste = p;
  }
  return beste;
}

/** Maakt van een periode een getal om te vergelijken: jaar × 12 + maand (jaar telt als juni). */
function periodeNummer(p: Periode): number {
  const [j, m] = p.split('-').map(Number);
  return j * 12 + (Number.isFinite(m) ? m - 1 : 5.5);
}

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** "2024-03" → "maart 2024"; "2024" → "2024". */
export function periodeLabel(p: Periode): string {
  const [j, m] = p.split('-');
  return m ? `${MAANDEN[Number(m) - 1]} ${j}` : j;
}

/**
 * Lijst perioden kort opschrijven: aaneengesloten maanden of jaren worden een bereik.
 * ["2026-01", "2026-02", "2026-03", "2026-06"] → "januari 2026 t/m maart 2026, juni 2026".
 */
export function periodeBereik(perioden: Periode[]): string {
  const p = [...perioden].sort();
  const stap = (a: Periode, b: Periode) => {
    const [ja, ma] = a.split('-').map(Number);
    const [jb, mb] = b.split('-').map(Number);
    return Number.isFinite(ma) ? jb * 12 + mb - (ja * 12 + ma) === 1 : jb - ja === 1;
  };
  const delen: string[] = [];
  for (let i = 0; i < p.length; ) {
    let j = i;
    while (j + 1 < p.length && stap(p[j], p[j + 1])) j++;
    delen.push(j > i ? `${periodeLabel(p[i])} t/m ${periodeLabel(p[j])}` : periodeLabel(p[i]));
    i = j + 1;
  }
  return delen.join(', ');
}

/** Is de tekst een geldige periode van deze soort? */
export function isPeriode(p: string, soort: Periodesoort): boolean {
  return soort === 'jaar' ? /^\d{4}$/.test(p) : /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
}

/* ---------- Gewogen berekening op één peilmoment ---------- */

export interface GewogenReeks {
  naam: string;
  /** Weging als fractie (0–1). */
  weging: number;
  reeks: ReeksWaarden;
}

/** Factor tussen twee perioden voor een gewogen mix. Undefined als een reeks een van de perioden mist. */
export function factorTussen(
  reeksen: GewogenReeks[],
  soort: Periodesoort,
  basis: Periode,
  peil: Periode,
  vastDeel = 0,
): number | undefined {
  const onderdelen: IndexOnderdeel[] = [];
  for (const r of reeksen) {
    if (r.weging === 0) continue;
    const b = waardeOp(r.reeks, soort, basis);
    const n = waardeOp(r.reeks, soort, peil);
    if (b === undefined || n === undefined) return undefined;
    onderdelen.push({ naam: r.naam, weging: r.weging, basis: b, nu: n });
  }
  return indexFactor(onderdelen, vastDeel);
}

/* ---------- Contractjaren ---------- */

export interface ContractjarenInvoer {
  basistarief: number;
  reeksen: GewogenReeks[];
  /** Niet-geïndexeerd deel (fractie 0–1). */
  vastDeel: number;
  soort: Periodesoort;
  /** Periode van het basisindexcijfer. */
  basisperiode: Periode;
  eersteJaar: number;
  laatsteJaar: number;
  /** 1 = indexcijfer van het voorgaande jaar (gebruikelijk bij een tarief per 1 januari), 0 = hetzelfde jaar. */
  verschuiving: 0 | 1;
  /** Peilmaand (1–12), alleen bij maandcijfers. */
  peilmaand: number;
  /** Maximale stijging per indexatiestap in procent (plafond uit het contract); null of undefined = geen plafond. */
  plafondPct?: number | null;
  /** Geen daling: een negatieve indexatie wordt niet toegepast. */
  geenDaling?: boolean;
}

export interface Contractjaar {
  jaar: number;
  peilperiode: Periode;
  factor: number;
  tarief: number;
  /** Stijging ten opzichte van het vorige contractjaar in procent; null voor de eerste regel. */
  stijgingPct: number | null;
  /** Tarief zonder plafond of bodem: basistarief × factor. */
  tariefZonderGrens: number;
  /** Heeft het plafond of de bodem deze stap begrensd? */
  begrensd: boolean;
}

/** Peilperiode voor een contractjaar: het jaar zelf of het jaar ervoor, bij maandcijfers met peilmaand. */
export function peilperiode(jaar: number, soort: Periodesoort, verschuiving: 0 | 1, peilmaand: number): Periode {
  const j = jaar - verschuiving;
  return soort === 'jaar' ? String(j) : `${j}-${String(peilmaand).padStart(2, '0')}`;
}

/**
 * Begrenst één indexatiestap (verhouding nieuwe factor / vorige factor) met plafond en bodem.
 * Plafond 3 % → stap hooguit 1,03. Geen daling → stap minstens 1.
 */
export function begrensStap(stap: number, plafondPct?: number | null, geenDaling?: boolean): number {
  let s = stap;
  if (plafondPct !== null && plafondPct !== undefined && Number.isFinite(plafondPct)) s = Math.min(s, 1 + plafondPct / 100);
  if (geenDaling) s = Math.max(s, 1);
  return s;
}

/**
 * Tarief per contractjaar: steeds basistarief × factor(peilperiode van dat jaar ten opzichte van de basisperiode).
 * Contractjaren waarvoor CBS (nog) geen cijfer heeft, worden overgeslagen.
 *
 * Met een plafond of bodem wordt per stap geïndexeerd (zoals een contract dat jaarlijks doet):
 *   tarief_J = tarief_vorige × begrensd(factor_J / factor_vorige), met factor = 1 en tarief = basistarief vóór de eerste stap.
 * Zonder plafond en bodem is dat precies basistarief × factor_J.
 */
export function tariefPerContractjaar(inv: ContractjarenInvoer): Contractjaar[] {
  const uit: Contractjaar[] = [];
  const grenzen = (inv.plafondPct !== null && inv.plafondPct !== undefined) || !!inv.geenDaling;
  let vorigeFactor = 1;
  let vorigTarief = inv.basistarief;
  for (let jaar = inv.eersteJaar; jaar <= inv.laatsteJaar; jaar++) {
    const peil = peilperiode(jaar, inv.soort, inv.verschuiving, inv.peilmaand);
    const factor = factorTussen(inv.reeksen, inv.soort, inv.basisperiode, peil, inv.vastDeel);
    if (factor === undefined) continue;
    const tariefZonderGrens = inv.basistarief * factor;
    const stap = factor / vorigeFactor;
    const begrensdeStap = grenzen ? begrensStap(stap, inv.plafondPct, inv.geenDaling) : stap;
    const tarief = grenzen ? vorigTarief * begrensdeStap : tariefZonderGrens;
    const vorige = uit[uit.length - 1];
    uit.push({
      jaar,
      peilperiode: peil,
      factor,
      tarief,
      stijgingPct: vorige ? (tarief / vorige.tarief - 1) * 100 : null,
      tariefZonderGrens,
      begrensd: Math.abs(begrensdeStap - stap) > 1e-12,
    });
    vorigeFactor = factor;
    vorigTarief = tarief;
  }
  return uit;
}

/** Verschil tussen twee contractjaren: in euro en in procent van jaar A. */
export function vergelijkJaren(rijen: Contractjaar[], a: number, b: number): { verschil: number; verschilPct: number } | undefined {
  const ra = rijen.find((r) => r.jaar === a);
  const rb = rijen.find((r) => r.jaar === b);
  if (!ra || !rb) return undefined;
  return { verschil: rb.tarief - ra.tarief, verschilPct: (rb.tarief / ra.tarief - 1) * 100 };
}

/* ---------- Oude vorm: reeks per jaar ---------- */

export interface Reeks {
  naam: string;
  weging: number;
  waarden: Record<number, number>;
}

export interface TariefJaar {
  jaar: number;
  factor: number;
  tarief: number;
  /** Stijging ten opzichte van het vorige jaar in procent; null voor het startjaar. */
  stijgingPct: number | null;
}

/**
 * Tarief per jaar, steeds ten opzichte van het startjaar (basisjaar).
 * Jaren zonder waarde in een van de reeksen worden overgeslagen.
 */
export function tariefPerJaar(basistarief: number, reeksen: Reeks[], startjaar: number, eindjaar: number): TariefJaar[] {
  const uitkomst: TariefJaar[] = [];
  for (let jaar = startjaar; jaar <= eindjaar; jaar++) {
    if (!reeksen.every((r) => Number.isFinite(r.waarden[jaar]) && Number.isFinite(r.waarden[startjaar]))) continue;
    const onderdelen = reeksen.map((r) => ({ naam: r.naam, weging: r.weging, basis: r.waarden[startjaar], nu: r.waarden[jaar] }));
    const factor = indexFactor(onderdelen);
    const tarief = basistarief * factor;
    const vorige = uitkomst[uitkomst.length - 1];
    uitkomst.push({ jaar, factor, tarief, stijgingPct: vorige ? (tarief / vorige.tarief - 1) * 100 : null });
  }
  return uitkomst;
}

/* ---------- Invoer in de URL ---------- */

export interface IndexInvoer {
  soort: Periodesoort;
  basistarief: number;
  /** Reeks in het gratis deel. */
  reeks: string;
  basisperiode: Periode;
  peilperiode: Periode;
  /** Weging per reeks-id in procent (Pro). */
  wegingPct: Record<string, number>;
  /** Vast deel in procent (Pro). */
  vastPct: number;
  eersteJaar: number;
  laatsteJaar: number;
  verschuiving: 0 | 1;
  peilmaand: number;
  /** Plafond per indexatiestap in procent (Pro); null = geen plafond. */
  plafondPct: number | null;
  /** Geen negatieve indexatie (Pro). */
  geenDaling: boolean;
}

const getal = (s: string | null): number | undefined => {
  if (s === null || s.trim() === '') return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Invoer naar URL-parameters (korte sleutels, punt als decimaalteken). */
export function indexInvoerNaarParams(inv: IndexInvoer): URLSearchParams {
  const p = new URLSearchParams();
  p.set('soort', inv.soort);
  p.set('tarief', String(inv.basistarief));
  p.set('reeks', inv.reeks);
  p.set('basis', inv.basisperiode);
  p.set('peil', inv.peilperiode);
  p.set('weging', Object.entries(inv.wegingPct).map(([id, w]) => `${id}:${w}`).join(','));
  p.set('vast', String(inv.vastPct));
  p.set('van', String(inv.eersteJaar));
  p.set('tot', String(inv.laatsteJaar));
  p.set('verschuiving', String(inv.verschuiving));
  p.set('maand', String(inv.peilmaand));
  if (inv.plafondPct !== null) p.set('max', String(inv.plafondPct));
  if (inv.geenDaling) p.set('bodem', '1');
  return p;
}

/**
 * Leest invoer uit URL-parameters. Onbekende of ongeldige waarden vallen terug op de standaard,
 * zodat een gedeelde link nooit een kapotte berekening oplevert.
 */
export function indexInvoerUitParams(p: URLSearchParams, standaard: IndexInvoer, geldigeReeksen: string[]): IndexInvoer {
  const soort: Periodesoort = p.get('soort') === 'maand' ? 'maand' : p.get('soort') === 'jaar' ? 'jaar' : standaard.soort;
  const tarief = getal(p.get('tarief'));
  const reeks = p.get('reeks');
  const basis = p.get('basis');
  const peil = p.get('peil');
  const wegingPct: Record<string, number> = { ...standaard.wegingPct };
  const wegingTekst = p.get('weging');
  if (wegingTekst) {
    for (const id of geldigeReeksen) wegingPct[id] = 0;
    for (const deel of wegingTekst.split(',')) {
      const [id, w] = deel.split(':');
      const n = getal(w ?? null);
      if (geldigeReeksen.includes(id) && n !== undefined && n >= 0 && n <= 100) wegingPct[id] = n;
    }
  }
  const vast = getal(p.get('vast'));
  const van = getal(p.get('van'));
  const tot = getal(p.get('tot'));
  const maand = getal(p.get('maand'));
  const verschuiving = p.get('verschuiving');
  const plafond = getal(p.get('max'));
  const bodem = p.get('bodem');
  const jaarOk = (n: number | undefined) => n !== undefined && Number.isInteger(n) && n >= 2000 && n <= 2100;
  return {
    soort,
    basistarief: tarief !== undefined && tarief >= 0 ? tarief : standaard.basistarief,
    reeks: reeks && geldigeReeksen.includes(reeks) ? reeks : standaard.reeks,
    basisperiode: basis && isPeriode(basis, soort) ? basis : soort === standaard.soort ? standaard.basisperiode : '',
    peilperiode: peil && isPeriode(peil, soort) ? peil : soort === standaard.soort ? standaard.peilperiode : '',
    wegingPct,
    vastPct: vast !== undefined && vast >= 0 && vast <= 100 ? vast : standaard.vastPct,
    eersteJaar: jaarOk(van) ? van! : standaard.eersteJaar,
    laatsteJaar: jaarOk(tot) ? tot! : standaard.laatsteJaar,
    verschuiving: verschuiving === '0' ? 0 : verschuiving === '1' ? 1 : standaard.verschuiving,
    peilmaand: maand !== undefined && Number.isInteger(maand) && maand >= 1 && maand <= 12 ? maand : standaard.peilmaand,
    // Ontbreekt de sleutel in een gedeelde link, dan is er geen plafond of bodem afgesproken.
    plafondPct: plafond !== undefined && plafond >= 0 && plafond <= 100 ? plafond : p.has('max') || p.toString() === '' ? standaard.plafondPct : null,
    geenDaling: bodem === null ? (p.toString() === '' ? standaard.geenDaling : false) : bodem === '1',
  };
}
