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

/* ---------- Afronding ---------- */

/**
 * Afronding zoals een contract die voorschrijft. Contracten verschillen hierin; de tool laat de keuze aan de gebruiker
 * en zet de gekozen afronding in de uitkomst en de CSV.
 */
export interface Afronding {
  /** Indexcijfers afronden op dit aantal decimalen vóór het rekenen; null = zoals CBS ze publiceert. */
  indexDecimalen: number | null;
  /** Indexfactor (en bij jaar-op-jaar indexeren de stap per jaar) afronden; null = niet afronden. */
  factorDecimalen: number | null;
  /** Tarief per jaar afronden op hele centen. Bij jaar-op-jaar indexeren rekent het volgende jaar verder met het afgeronde tarief. */
  tariefCenten: boolean;
}

/** Geen enkele tussentijdse afronding. */
export const GEEN_AFRONDING: Afronding = { indexDecimalen: null, factorDecimalen: null, tariefCenten: false };

/**
 * Rekenkundig afronden (helft naar boven, weg van nul) op een aantal decimalen. Null of undefined = niet afronden.
 * Het geschaalde getal gaat eerst naar 15 significante cijfers, zodat bijvoorbeeld 1,005 op twee decimalen 1,01 wordt
 * en niet 1,00 (1,005 × 100 is in zwevende komma 100,4999…).
 */
export function rondAf(n: number, decimalen: number | null | undefined): number {
  if (decimalen === null || decimalen === undefined || !Number.isFinite(n)) return n;
  const schaal = 10 ** decimalen;
  const r = Math.round(Number((Math.abs(n) * schaal).toPrecision(15))) / schaal;
  return n < 0 && r !== 0 ? -r : r;
}

/** Tarief volgens de afronding: op hele centen of onafgerond. */
export function rondTarief(tarief: number, afronding: Afronding = GEEN_AFRONDING): number {
  return afronding.tariefCenten ? rondAf(tarief, 2) : tarief;
}

/** Korte omschrijving van de afronding, voor uitkomst en CSV. */
export function afrondingTekst(a: Afronding): string {
  const delen = [
    a.indexDecimalen === null ? 'indexcijfers zoals CBS ze publiceert' : `indexcijfers op ${a.indexDecimalen} decima${a.indexDecimalen === 1 ? 'al' : 'len'}`,
    a.factorDecimalen === null ? 'indexfactor niet afgerond' : `indexfactor op ${a.factorDecimalen} decimalen`,
    a.tariefCenten ? 'tarief op hele centen' : 'tarief niet afgerond',
  ];
  return delen.join(', ');
}

/** Factor tussen twee perioden voor een gewogen mix. Undefined als een reeks een van de perioden mist. */
export function factorTussen(
  reeksen: GewogenReeks[],
  soort: Periodesoort,
  basis: Periode,
  peil: Periode,
  vastDeel = 0,
  afronding: Afronding = GEEN_AFRONDING,
): number | undefined {
  const onderdelen: IndexOnderdeel[] = [];
  for (const r of reeksen) {
    if (r.weging === 0) continue;
    const b = waardeOp(r.reeks, soort, basis);
    const n = waardeOp(r.reeks, soort, peil);
    if (b === undefined || n === undefined) return undefined;
    onderdelen.push({ naam: r.naam, weging: r.weging, basis: rondAf(b, afronding.indexDecimalen), nu: rondAf(n, afronding.indexDecimalen) });
  }
  return rondAf(indexFactor(onderdelen, vastDeel), afronding.factorDecimalen);
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
  /** Afronding volgens het contract; standaard geen. */
  afronding?: Afronding;
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
  const afr = inv.afronding ?? GEEN_AFRONDING;
  let vorigeFactor = 1;
  let vorigTarief = inv.basistarief;
  for (let jaar = inv.eersteJaar; jaar <= inv.laatsteJaar; jaar++) {
    const peil = peilperiode(jaar, inv.soort, inv.verschuiving, inv.peilmaand);
    const factor = factorTussen(inv.reeksen, inv.soort, inv.basisperiode, peil, inv.vastDeel, afr);
    if (factor === undefined) continue;
    const tariefZonderGrens = rondTarief(inv.basistarief * factor, afr);
    // Jaar-op-jaar: de stap wordt net als de factor afgerond, het tarief op centen; het volgende jaar bouwt daarop voort.
    const stap = grenzen ? rondAf(factor / vorigeFactor, afr.factorDecimalen) : factor / vorigeFactor;
    const begrensdeStap = grenzen ? begrensStap(stap, inv.plafondPct, inv.geenDaling) : stap;
    const tarief = grenzen ? rondTarief(vorigTarief * begrensdeStap, afr) : tariefZonderGrens;
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

/**
 * Welke twee contractjaren de uitkomst laat zien: de gekozen jaren als die een tarief hebben, anders het eerste en het
 * laatste contractjaar met cijfers. Jaar B is het jaar van de grote tegel; het tarief komt uit dezelfde rij als de tabel
 * (met de verschuiving van de peilperiode, de begrenzing en de afronding).
 */
export function kiesContractjaren(
  rijen: Contractjaar[],
  vergelijk: [number, number] | null,
): { a?: Contractjaar; b?: Contractjaar; verschil?: { verschil: number; verschilPct: number } } {
  if (rijen.length === 0) return {};
  const zoek = (j: number | undefined) => (j === undefined ? undefined : rijen.find((r) => r.jaar === j));
  const a = zoek(vergelijk?.[0]) ?? rijen[0];
  const b = zoek(vergelijk?.[1]) ?? rijen[rijen.length - 1];
  return { a, b, verschil: vergelijkJaren(rijen, a.jaar, b.jaar) };
}

/** Verschil tussen twee contractjaren: in euro en in procent van jaar A. */
export function vergelijkJaren(rijen: Contractjaar[], a: number, b: number): { verschil: number; verschilPct: number } | undefined {
  const ra = rijen.find((r) => r.jaar === a);
  const rb = rijen.find((r) => r.jaar === b);
  if (!ra || !rb) return undefined;
  return { verschil: rb.tarief - ra.tarief, verschilPct: (rb.tarief / ra.tarief - 1) * 100 };
}

/* ---------- Eigen reeks ---------- */

/** Id van de eigen reeks in wegingen en in de keuze van de reeks. */
export const EIGEN_REEKS_ID = 'eigen';
/** Hoeveel perioden een eigen reeks maximaal heeft (ook in de deellink). */
export const MAX_EIGEN_PERIODEN = 400;
/** Langste naam voor de eigen reeks. */
export const MAX_EIGEN_NAAM = 80;

const MAAND_AFKORTING: Record<string, number> = {
  jan: 1, feb: 2, mrt: 3, maa: 3, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12,
};

/** Periodetekst lezen: "2024", "2024-09", "2024/9", "2024M09" (CBS), "2024 september" of "september 2024". */
export function leesPeriode(t: string): Periode | undefined {
  const s = t.trim().toLowerCase().replace(/\*$/, '').trim();
  let m = /^(\d{4})$/.exec(s);
  if (m) return m[1];
  m = /^(\d{4})\s*(?:[-/]|m)\s*(\d{1,2})$/.exec(s);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = /^(\d{4})\s+([a-z]+)\.?$/.exec(s) ?? /^([a-z]+)\.?\s+(\d{4})$/.exec(s);
  if (m) {
    const [jaar, naam] = /^\d{4}$/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const maand = MAAND_AFKORTING[naam.slice(0, 3)];
    if (maand) return `${jaar}-${String(maand).padStart(2, '0')}`;
  }
  return undefined;
}

/** Getal lezen zoals het in een contract of spreadsheet staat: "102,5", "102.5" of "1.024,5". */
function leesWaarde(t: string): number | undefined {
  const s = t.trim();
  if (!/^[\d.,]+$/.test(s)) return undefined;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export interface EigenReeks {
  waarden: ReeksWaarden;
  /** Regels die niet te lezen waren, met regelnummer. */
  fouten: string[];
}

/**
 * Leest een eigen indexreeks uit tekst: één periode per regel, gevolgd door het indexcijfer. Scheidingsteken: spatie,
 * tab (plakken uit een spreadsheet), puntkomma of dubbele punt. Een periode die twee keer voorkomt, telt de laatste keer.
 */
export function leesEigenReeks(tekst: string): EigenReeks {
  const waarden: ReeksWaarden = { maanden: {}, jaren: {} };
  const fouten: string[] = [];
  let aantal = 0;
  tekst.split(/\r?\n/).forEach((regel, i) => {
    const r = regel.trim();
    if (!r) return;
    const m = /^(.*?)[\s;:\t]+([\d.,]+)$/.exec(r);
    const periode = m ? leesPeriode(m[1]) : undefined;
    const waarde = m ? leesWaarde(m[2]) : undefined;
    if (!periode || waarde === undefined) {
      fouten.push(`regel ${i + 1} ("${r.length > 30 ? r.slice(0, 30) + '…' : r}")`);
      return;
    }
    if (aantal >= MAX_EIGEN_PERIODEN) {
      fouten.push(`regel ${i + 1}: meer dan ${MAX_EIGEN_PERIODEN} perioden`);
      return;
    }
    aantal++;
    if (periode.includes('-')) waarden.maanden[periode] = waarde;
    else waarden.jaren[periode] = waarde;
  });
  return { waarden, fouten };
}

/** Eigen reeks voor de deellink: "2024:102.5,2024-09:103". */
export function eigenReeksNaarParam(w: ReeksWaarden): string {
  return [...Object.entries(w.jaren), ...Object.entries(w.maanden)]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([p, v]) => `${p}:${v}`)
    .join(',');
}

/** Deellink naar invoertekst (één periode per regel, decimale komma). Ongeldige delen vallen weg. */
export function eigenReeksUitParam(t: string): string {
  return t
    .split(',')
    .slice(0, MAX_EIGEN_PERIODEN)
    .map((deel) => {
      const [p, v] = deel.split(':');
      const n = Number(v);
      return p && (isPeriode(p, 'jaar') || isPeriode(p, 'maand')) && Number.isFinite(n) && n > 0 ? `${p} ${String(n).replace('.', ',')}` : '';
    })
    .filter(Boolean)
    .join('\n');
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
  /** Twee contractjaren om te vergelijken (Pro); null = eerste en laatste contractjaar. */
  vergelijk: [number, number] | null;
  /** Afronding volgens het contract (gratis en Pro). */
  afronding: Afronding;
  /** Naam van de eigen reeks (bijv. een sectorindex uit het contract). */
  eigenNaam: string;
  /** Eigen indexcijfers als tekst: één periode per regel. */
  eigenTekst: string;
}

/** Hoogste basistarief dat de tool accepteert (euro per eenheid). */
export const MAX_BASISTARIEF = 1_000_000;

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
  if (inv.vergelijk) p.set('vgl', `${inv.vergelijk[0]}-${inv.vergelijk[1]}`);
  p.set('rindex', inv.afronding.indexDecimalen === null ? 'cbs' : String(inv.afronding.indexDecimalen));
  p.set('rfactor', inv.afronding.factorDecimalen === null ? 'nee' : String(inv.afronding.factorDecimalen));
  p.set('rtarief', inv.afronding.tariefCenten ? 'cent' : 'nee');
  const eigen = eigenReeksNaarParam(leesEigenReeks(inv.eigenTekst).waarden);
  if (eigen) {
    p.set('ereeks', eigen);
    if (inv.eigenNaam.trim()) p.set('enaam', inv.eigenNaam.trim());
  }
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
  const vgl = /^(\d{4})-(\d{4})$/.exec(p.get('vgl') ?? '');
  const jaarOk = (n: number | undefined) => n !== undefined && Number.isInteger(n) && n >= 2000 && n <= 2100;
  const decimalen = (t: string | null, toegestaan: number[], leeg: string, std: number | null): number | null => {
    if (t === leeg) return null;
    const n = getal(t);
    return n !== undefined && toegestaan.includes(n) ? n : std;
  };
  const rtarief = p.get('rtarief');
  const afronding: Afronding = {
    indexDecimalen: decimalen(p.get('rindex'), [0, 1, 2, 3], 'cbs', standaard.afronding.indexDecimalen),
    factorDecimalen: decimalen(p.get('rfactor'), [2, 3, 4, 5, 6], 'nee', standaard.afronding.factorDecimalen),
    tariefCenten: rtarief === 'cent' ? true : rtarief === 'nee' ? false : standaard.afronding.tariefCenten,
  };
  return {
    soort,
    basistarief: tarief !== undefined && tarief >= 0 && tarief <= MAX_BASISTARIEF ? tarief : standaard.basistarief,
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
    vergelijk: vgl && jaarOk(Number(vgl[1])) && jaarOk(Number(vgl[2])) ? [Number(vgl[1]), Number(vgl[2])] : p.toString() === '' ? standaard.vergelijk : null,
    afronding,
    eigenNaam: (p.get('enaam') ?? standaard.eigenNaam).slice(0, MAX_EIGEN_NAAM),
    eigenTekst: p.has('ereeks') ? eigenReeksUitParam(p.get('ereeks') ?? '') : standaard.eigenTekst,
  };
}
