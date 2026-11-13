// Heffingenscan restafval: wat kosten de afvalstoffenbelasting (ASB) en de CO2-heffing op afvalverbranding een
// gemeente per jaar, 2026–2035. Pure functies zonder DOM; getest in heffingen.test.ts met de gepubliceerde
// controlecijfers van Overbetuwe.
//
// Rekenmethode (per jaar, per tariefpad, prijspeil 2026):
//   tonnage            = inwoners × kg fijn restafval per inwoner / 1000 × deel dat wordt verbrand
//                        (+ optioneel: overig verbrand afval en het verbrande deel van het grove restafval)
//   ASB per ton        = tarief × grondslag (standaard 75 %, na aftrek bodemassen)
//   CO2-heffing per ton = CO2-tarief × max(0, fossiele uitstoot − NRF × AVI-correctiefactor × procesemissiefactor
//                         × mediaan fossiele uitstoot 2019–2023)
//   fossiele uitstoot  = emissiefactor × (1 − biomassafractie)   (NEa-berekeningsfactoren)
// Er wordt nergens tussentijds afgerond.

import {
  JAREN,
  NRF,
  PEILDATUM,
  PRIJSPEIL,
  PROCESEMISSIEFACTOR,
  anderPad,
  heffingPaden,
  heffingStandaard,
  mediaanHuishoudelijk,
  neaFactoren,
  wetsstatus,
  type HeffingPadId,
} from '../../data/heffingen-tarieven';

/** Eén gemeente uit src/data/heffingen-gemeenten.json (CBS). Kilo's zijn per inwoner per jaar. */
export interface HeffingGemeente {
  /** CBS-gemeentecode, bijv. "GM1734". */
  code: string;
  naam: string;
  /** Naam in de URL, bijv. "overbetuwe". */
  slug: string;
  /** Andere slugs die naar deze gemeente leiden, bijv. "den-haag". */
  aliassen: string[];
  provincie: string | null;
  inwoners: number;
  huishoudens: number;
  /** Fijn huishoudelijk restafval. */
  fijn: number;
  grof: number | null;
  verbouwing: number | null;
  /** Fijn restafval dat naar een nascheidingsinstallatie ging; null als CBS geen nascheiding meldt. */
  nascheiding: number | null;
  /** Alle restafval (fijn, grof, verbouwing) dat naar nascheiding ging. */
  nascheidingAangeboden: number | null;
  /** Restafval dat na nascheiding is verbrand. */
  nascheidingVerbrand: number | null;
}

export interface HeffingInvoer {
  inwoners: number;
  huishoudens: number;
  /** Fijn huishoudelijk restafval, kg per inwoner per jaar. */
  fijnKg: number;
  /** Grof huishoudelijk restafval dat wordt meegerekend, kg per inwoner per jaar. Standaard 0: niet meegerekend. */
  grofKg: number;
  /** Deel van het grove restafval dat wordt verbrand, 0–100. */
  grofVerbrandPct: number;
  /** Overig verbrand afval van de gemeente, ton per jaar. */
  overigTon: number;
  /** Deel van het fijne restafval dat wordt verbrand, 0–100 (lager dan 100 bij nascheiding). */
  verbrandPct: number;
  /** Ontwikkeling van het restafval, procent per jaar (negatief = minder). */
  trendPct: number;
  /** Deel van de tonnen waarover afvalstoffenbelasting wordt betaald, 0–100. */
  asbGrondslagPct: number;
  /** Deel van de heffingen dat de AVI doorberekent, 0–100. */
  doorberekeningPct: number;
  /** Indexatie van beide tarieven, procent per jaar vanaf 2026. 0 = prijspeil 2026. */
  indexatiePct: number;
  pad: HeffingPadId;
}

export type InvoerVeld = keyof HeffingInvoer;

export interface JaarUitkomst {
  jaar: number;
  /** Verbrand restafval in ton. */
  ton: number;
  /** Afvalstoffenbelasting per ton restafval (tarief × grondslag × indexatie), vóór doorberekening. */
  asbPerTon: number;
  /** CO2-heffing per ton restafval, vóór doorberekening. */
  co2PerTon: number;
  asb: number;
  co2: number;
  totaal: number;
  perHuishouden: number;
  perInwoner: number;
  /** Beide heffingen samen per ton restafval, na doorberekening. */
  perTon: number;
  /** Aandeel van de CO2-heffing in het totaal, 0–1. */
  aandeelCo2: number;
  /** CO2-tarief in euro per ton CO2 (na indexatie). */
  co2Tarief: number;
  /** ASB-tarief in euro per ton afval (na indexatie, vóór grondslag). */
  asbTarief: number;
  correctiefactor: number;
}

/** Mediaan fossiele uitstoot per ton 2019–2023: de basis voor de vrijgestelde uitstoot (dispensatierechten). */
export const BASIS_FOSSIEL = {
  fijn: mediaanHuishoudelijk.ef * (1 - mediaanHuishoudelijk.bio),
  grof: neaFactoren.grof.ef * (1 - neaFactoren.grof.bio),
};

/** Fossiele uitstoot per ton fijn restafval in een jaar: de NEa-factoren van dat jaar, na 2027 die van 2027. */
export function fossielFijn(jaar: number): number {
  const laatste = Math.max(...Object.keys(neaFactoren.huishoudelijk).map(Number));
  const f = neaFactoren.huishoudelijk[Math.min(Math.max(jaar, JAREN[0]), laatste)];
  return f.ef * (1 - f.bio);
}

/** CO2-heffing per ton afval: tarief × (fossiele uitstoot − vrijgestelde uitstoot), nooit negatief. */
export function co2HeffingPerTon(tarief: number, correctiefactor: number, procesemissiefactor: number, fossiel: number, basis: number): number {
  return tarief * Math.max(0, fossiel - NRF * correctiefactor * procesemissiefactor * basis);
}

/** Verbrande tonnen in het eerste jaar, uitgesplitst. */
export function tonnage(invoer: HeffingInvoer): { fijn: number; grof: number; overig: number; totaal: number } {
  const fijn = ((invoer.inwoners * invoer.fijnKg) / 1000) * (invoer.verbrandPct / 100);
  const grof = ((invoer.inwoners * invoer.grofKg) / 1000) * (invoer.grofVerbrandPct / 100);
  return { fijn, grof, overig: invoer.overigTon, totaal: fijn + grof + invoer.overigTon };
}

/** De heffingen per jaar 2026–2035 voor één tariefpad (standaard het pad uit de invoer). */
export function berekenHeffingen(invoer: HeffingInvoer, padId: HeffingPadId = invoer.pad): JaarUitkomst[] {
  const pad = heffingPaden[padId];
  const t = tonnage(invoer);
  // Overig verbrand afval rekent mee met de factoren van fijn restafval; grof heeft eigen factoren.
  const tonFijn = t.fijn + t.overig;
  const tonGrof = t.grof;
  const basis = tonFijn + tonGrof;
  const grondslag = invoer.asbGrondslagPct / 100;
  const door = invoer.doorberekeningPct / 100;
  const fossielGrof = BASIS_FOSSIEL.grof;

  return JAREN.map((jaar, i) => {
    const ton = basis * Math.pow(1 + invoer.trendPct / 100, i);
    const index = Math.pow(1 + invoer.indexatiePct / 100, i);
    const asbTarief = pad.asb[i] * index;
    const co2Tarief = pad.co2[i] * index;
    const asbPerTon = asbTarief * grondslag;
    const co2Fijn = co2HeffingPerTon(co2Tarief, pad.correctiefactor[i], PROCESEMISSIEFACTOR[i], fossielFijn(jaar), BASIS_FOSSIEL.fijn);
    const co2Grof = co2HeffingPerTon(co2Tarief, pad.correctiefactor[i], PROCESEMISSIEFACTOR[i], fossielGrof, BASIS_FOSSIEL.grof);
    const co2PerTon = basis > 0 ? (tonFijn * co2Fijn + tonGrof * co2Grof) / basis : co2Fijn;
    const asb = ton * asbPerTon * door;
    const co2 = ton * co2PerTon * door;
    const totaal = asb + co2;
    return {
      jaar,
      ton,
      asbPerTon,
      co2PerTon,
      asb,
      co2,
      totaal,
      perHuishouden: invoer.huishoudens > 0 ? totaal / invoer.huishoudens : 0,
      perInwoner: invoer.inwoners > 0 ? totaal / invoer.inwoners : 0,
      perTon: (asbPerTon + co2PerTon) * door,
      aandeelCo2: totaal > 0 ? co2 / totaal : 0,
      co2Tarief,
      asbTarief,
      correctiefactor: pad.correctiefactor[i],
    };
  });
}

const som = (rijen: JaarUitkomst[]) => rijen.reduce((s, r) => s + r.totaal, 0);

/** De uitkomst van één jaar uit een reeks. */
export function jaarUit(rijen: JaarUitkomst[], jaar: number): JaarUitkomst {
  const r = rijen.find((x) => x.jaar === jaar);
  if (!r) throw new Error(`Jaar ${jaar} valt buiten de scan (${JAREN[0]}–${JAREN[JAREN.length - 1]}).`);
  return r;
}

export interface PadVergelijking {
  pad: HeffingPadId;
  ander: HeffingPadId;
  gekozen: JaarUitkomst[];
  anderPad: JaarUitkomst[];
  /** Som van de heffingen over 2026–2035. */
  cumulatief: number;
  cumulatiefAnder: number;
  /** cumulatiefAnder − cumulatief: positief als het andere pad duurder is. */
  verschil: number;
  /** Jaar waarin het verschil tussen de paden het grootst is. */
  grootsteVerschil: { jaar: number; bedrag: number };
}

/** Zet het gekozen tariefpad naast het andere: per jaar en opgeteld over 2026–2035. */
export function vergelijkPaden(invoer: HeffingInvoer): PadVergelijking {
  const ander = anderPad(invoer.pad);
  const gekozen = berekenHeffingen(invoer, invoer.pad);
  const anderRijen = berekenHeffingen(invoer, ander);
  let grootste = { jaar: JAREN[0] as number, bedrag: 0 };
  gekozen.forEach((r, i) => {
    const d = anderRijen[i].totaal - r.totaal;
    if (Math.abs(d) > Math.abs(grootste.bedrag)) grootste = { jaar: r.jaar, bedrag: d };
  });
  const cumulatief = som(gekozen);
  const cumulatiefAnder = som(anderRijen);
  return { pad: invoer.pad, ander, gekozen, anderPad: anderRijen, cumulatief, cumulatiefAnder, verschil: cumulatiefAnder - cumulatief, grootsteVerschil: grootste };
}

/** Wat een gemeente in een jaar minder aan heffingen betaalt bij minder fijn restafval per inwoner. */
export function besparingMinderRestafval(invoer: HeffingInvoer, kgMinder: number = heffingStandaard.besparingKg, jaar = 2030): { jaar: number; kg: number; bedrag: number; perHuishouden: number } {
  const kg = Math.min(kgMinder, invoer.fijnKg);
  const nu = jaarUit(berekenHeffingen(invoer), jaar);
  const minder = jaarUit(berekenHeffingen({ ...invoer, fijnKg: invoer.fijnKg - kg }), jaar);
  const bedrag = nu.totaal - minder.totaal;
  return { jaar, kg, bedrag, perHuishouden: invoer.huishoudens > 0 ? bedrag / invoer.huishoudens : 0 };
}

/** Standaardinvoer voor een gemeente: CBS-cijfers, alleen fijn restafval, alles verbrand, Belastingplan 2027. */
export function standaardInvoer(g: Pick<HeffingGemeente, 'inwoners' | 'huishoudens' | 'fijn'>): HeffingInvoer {
  return {
    inwoners: g.inwoners,
    huishoudens: g.huishoudens,
    fijnKg: g.fijn,
    grofKg: 0,
    grofVerbrandPct: heffingStandaard.grofVerbrandPct,
    overigTon: 0,
    verbrandPct: heffingStandaard.verbrandPct,
    trendPct: heffingStandaard.trendPct,
    asbGrondslagPct: heffingStandaard.asbGrondslagPct,
    doorberekeningPct: heffingStandaard.doorberekeningPct,
    indexatiePct: heffingStandaard.indexatiePct,
    pad: heffingStandaard.pad,
  };
}

// ---------- Landelijk beeld ----------

export interface LandelijkJaar {
  jaar: number;
  ton: number;
  asb: number;
  co2: number;
  totaal: number;
  /** Totaal gedeeld door alle huishoudens: het landelijk gemiddelde per huishouden. */
  perHuishouden: number;
}

export interface Landelijk {
  aantalGemeenten: number;
  inwoners: number;
  huishoudens: number;
  jaren: LandelijkJaar[];
  cumulatief: number;
}

/**
 * Alle gemeenten samen met de standaardinvoer (alleen fijn restafval, alles verbrand). Een bovengrens: bij gemeenten
 * met nascheiding wordt een deel niet verbrand.
 */
export function landelijkTotaal(gemeenten: Pick<HeffingGemeente, 'inwoners' | 'huishoudens' | 'fijn'>[], pad: HeffingPadId = heffingStandaard.pad): Landelijk {
  const inwoners = gemeenten.reduce((s, g) => s + g.inwoners, 0);
  const huishoudens = gemeenten.reduce((s, g) => s + g.huishoudens, 0);
  const jaren: LandelijkJaar[] = JAREN.map((jaar) => ({ jaar, ton: 0, asb: 0, co2: 0, totaal: 0, perHuishouden: 0 }));
  for (const g of gemeenten) {
    berekenHeffingen({ ...standaardInvoer(g), pad }).forEach((r, i) => {
      jaren[i].ton += r.ton;
      jaren[i].asb += r.asb;
      jaren[i].co2 += r.co2;
      jaren[i].totaal += r.totaal;
    });
  }
  for (const j of jaren) j.perHuishouden = huishoudens > 0 ? j.totaal / huishoudens : 0;
  return { aantalGemeenten: gemeenten.length, inwoners, huishoudens, jaren, cumulatief: jaren.reduce((s, j) => s + j.totaal, 0) };
}

/** Eén regel voor de tabel met alle gemeenten. */
export interface OverzichtRij {
  gemeente: HeffingGemeente;
  ton: number;
  totaal2026: number;
  totaal2035: number;
  perHuishouden2026: number;
  perHuishouden2035: number;
}

export function overzichtRij(g: HeffingGemeente, pad: HeffingPadId = heffingStandaard.pad): OverzichtRij {
  const rijen = berekenHeffingen({ ...standaardInvoer(g), pad });
  const eerste = rijen[0];
  const laatste = rijen[rijen.length - 1];
  return { gemeente: g, ton: eerste.ton, totaal2026: eerste.totaal, totaal2035: laatste.totaal, perHuishouden2026: eerste.perHuishouden, perHuishouden2035: laatste.perHuishouden };
}

// ---------- Zoeken ----------

/** Maakt een naam vergelijkbaar met een slug: kleine letters, zonder accenten, leestekens worden koppeltekens. */
export function naarSlug(tekst: string): string {
  return tekst
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug zonder het voorvoegsel "s-" van 's-Gravenhage en 's-Hertogenbosch, zodat "hertogenbosch" en "gravenhage" ook werken. */
const zonderS = (slug: string) => slug.replace(/^s-/, '');

/** Vindt een gemeente bij een slug, alias of CBS-code uit de URL. */
export function vindOpSlug<T extends Pick<HeffingGemeente, 'slug' | 'aliassen' | 'code'>>(slug: string, lijst: T[]): T | undefined {
  const s = naarSlug(slug);
  if (!s) return undefined;
  return lijst.find((g) => g.slug === s || g.aliassen.includes(s) || g.code.toLowerCase() === s);
}

/**
 * Zoekt gemeenten op naam, gangbare naam (Den Haag, Den Bosch) of CBS-code. Eerst namen en aliassen die met de
 * zoekterm beginnen, daarna namen waar de term in voorkomt.
 */
export function zoekHeffingGemeenten<T extends Pick<HeffingGemeente, 'slug' | 'aliassen' | 'code' | 'naam'>>(term: string, lijst: T[], max = 8): T[] {
  const t = naarSlug(term);
  if (!t) return [];
  const begin: T[] = [];
  const midden: T[] = [];
  for (const g of lijst) {
    const kandidaten = [g.slug, zonderS(g.slug), ...g.aliassen];
    if (kandidaten.some((k) => k.startsWith(t)) || g.code.toLowerCase() === t) begin.push(g);
    else if (kandidaten.some((k) => k.includes(t))) midden.push(g);
  }
  return [...begin, ...midden].slice(0, max);
}

/**
 * Wat het zoekveld met Enter doet: één duidelijke gemeente kiezen, of zeggen dat er meer of geen zijn.
 * Een exacte naam of alias wint ("Bergen" is niet exact: er zijn er twee).
 */
export function zoekUitkomstHeffing<T extends Pick<HeffingGemeente, 'slug' | 'aliassen' | 'code' | 'naam'>>(
  term: string,
  lijst: T[],
): { soort: 'gevonden'; gemeente: T } | { soort: 'meerdere'; treffers: T[] } | { soort: 'geen' } {
  const t = naarSlug(term);
  const exact = lijst.filter((g) => g.slug === t || zonderS(g.slug) === t || g.aliassen.includes(t) || g.code.toLowerCase() === t || naarSlug(g.naam) === t);
  if (exact.length === 1) return { soort: 'gevonden', gemeente: exact[0] };
  const treffers = zoekHeffingGemeenten(term, lijst);
  if (treffers.length === 1) return { soort: 'gevonden', gemeente: treffers[0] };
  if (treffers.length > 1) return { soort: 'meerdere', treffers };
  return { soort: 'geen' };
}

// ---------- Validatie en invoer in de URL ----------

export interface VeldRegel {
  /** Naam van de parameter in de URL. */
  param: string;
  min: number;
  max: number;
  /** Alleen hele getallen. */
  geheel?: boolean;
}

/** Grenzen per veld. De pagina gebruikt dezelfde grenzen voor de invoervelden. */
export const veldRegels: Record<Exclude<InvoerVeld, 'pad'>, VeldRegel> = {
  inwoners: { param: 'inw', min: 1, max: 2_000_000, geheel: true },
  huishoudens: { param: 'hh', min: 1, max: 1_500_000, geheel: true },
  fijnKg: { param: 'fijn', min: 0, max: 1000 },
  grofKg: { param: 'grof', min: 0, max: 500 },
  grofVerbrandPct: { param: 'grofv', min: 0, max: 100 },
  overigTon: { param: 'overig', min: 0, max: 1_000_000 },
  verbrandPct: { param: 'verbrand', min: 0, max: 100 },
  trendPct: { param: 'trend', min: -20, max: 20 },
  asbGrondslagPct: { param: 'asbg', min: 0, max: 100 },
  doorberekeningPct: { param: 'door', min: 0, max: 100 },
  indexatiePct: { param: 'idx', min: 0, max: 15 },
};

const getalVelden = Object.keys(veldRegels) as Exclude<InvoerVeld, 'pad'>[];
const isPad = (v: unknown): v is HeffingPadId => v === 'bp2027' || v === 'bp2026';

/** Controleert de invoer. Geeft per fout veld een melding; een leeg object betekent dat alles klopt. */
export function valideerInvoer(invoer: HeffingInvoer): Partial<Record<InvoerVeld, string>> {
  const fouten: Partial<Record<InvoerVeld, string>> = {};
  for (const veld of getalVelden) {
    const w = invoer[veld];
    const r = veldRegels[veld];
    if (typeof w !== 'number' || !Number.isFinite(w)) fouten[veld] = 'Vul een getal in.';
    else if (w < r.min) fouten[veld] = `Minimaal ${r.min}.`;
    else if (w > r.max) fouten[veld] = `Maximaal ${r.max}.`;
    else if (r.geheel && !Number.isInteger(w)) fouten[veld] = 'Vul een heel getal in.';
  }
  if (!isPad(invoer.pad)) fouten.pad = 'Kies een tariefpad.';
  return fouten;
}

/** De velden die afwijken van de standaard (voor de melding "gerekend met aangepaste cijfers"). */
export function aangepasteVelden(invoer: HeffingInvoer, standaard: HeffingInvoer): InvoerVeld[] {
  return (Object.keys(standaard) as InvoerVeld[]).filter((k) => (typeof standaard[k] === 'number' ? Math.abs((invoer[k] as number) - (standaard[k] as number)) > 1e-9 : invoer[k] !== standaard[k]));
}

/** Zet alleen de afwijkende velden in de URL, zodat een link zonder parameters de standaardberekening blijft. */
export function invoerNaarParams(invoer: HeffingInvoer, standaard: HeffingInvoer): URLSearchParams {
  const p = new URLSearchParams();
  for (const veld of aangepasteVelden(invoer, standaard)) {
    if (veld === 'pad') p.set('pad', invoer.pad);
    else p.set(veldRegels[veld].param, String(Math.round(invoer[veld] * 1e6) / 1e6));
  }
  return p;
}

/** Leest de invoer uit de URL. Ontbrekende of ongeldige waarden vallen terug op de standaard. */
export function invoerUitParams(params: URLSearchParams, standaard: HeffingInvoer): HeffingInvoer {
  const invoer = { ...standaard };
  for (const veld of getalVelden) {
    const ruw = params.get(veldRegels[veld].param);
    if (ruw === null || ruw.trim() === '') continue;
    const n = Number(ruw.replace(',', '.'));
    const r = veldRegels[veld];
    if (Number.isFinite(n) && n >= r.min && n <= r.max && (!r.geheel || Number.isInteger(n))) invoer[veld] = n;
  }
  const pad = params.get('pad');
  if (isPad(pad)) invoer.pad = pad;
  return invoer;
}

// ---------- Voorbeeld en landelijk totaal voor de homepage ----------

export interface HeffingenVoorbeeldJaar {
  jaar: number;
  totaal: number;
  perHuishouden: number;
  perTon?: number;
  aandeelCo2?: number;
}

/** Klein gegevensobject (src/data/heffingen-voorbeeld.json) met het voorbeeld en het landelijke totaal. */
export interface HeffingenVoorbeeld {
  /** Peildatum van tarieven en wetsstatus. */
  peildatum: string;
  /** Datum waarop de CBS-cijfers zijn opgehaald. */
  cbsOpgehaald: string;
  prijspeil: number;
  pad: { id: HeffingPadId; naam: string; status: string };
  anderPad: { id: HeffingPadId; naam: string; status: string };
  wetsstatus: string;
  voorbeeld: {
    naam: string;
    slug: string;
    inwoners: number;
    huishoudens: number;
    fijnKg: number;
    ton: number;
    nascheidingKg: number | null;
    /** 2026, 2030 en 2035. */
    jaren: HeffingenVoorbeeldJaar[];
    cumulatief: number;
    cumulatiefAnderPad: number;
    besparing: { jaar: number; kg: number; bedrag: number };
  };
  landelijk: {
    aantalGemeenten: number;
    aantalMetNascheiding: number;
    inwoners: number;
    huishoudens: number;
    ton: number;
    /** 2026, 2030 en 2035. */
    jaren: HeffingenVoorbeeldJaar[];
    cumulatief: number;
  };
}

const VOORBEELD_JAREN = [2026, 2030, 2035];

/** Rekent het voorbeeld en het landelijke totaal door. Aangeroepen door scripts/cbs-heffingenscan.mjs en door de test. */
export function maakVoorbeeld(data: { opgehaald: string; gemeenten: HeffingGemeente[] }, slug: string): HeffingenVoorbeeld {
  const g = vindOpSlug(slug, data.gemeenten);
  if (!g) throw new Error(`Voorbeeldgemeente ${slug} staat niet in de dataset.`);
  const invoer = standaardInvoer(g);
  const v = vergelijkPaden(invoer);
  const besparing = besparingMinderRestafval(invoer);
  const land = landelijkTotaal(data.gemeenten);
  const pad = heffingPaden[invoer.pad];
  const ander = heffingPaden[v.ander];
  return {
    peildatum: PEILDATUM,
    cbsOpgehaald: data.opgehaald,
    prijspeil: PRIJSPEIL,
    pad: { id: pad.id, naam: pad.naam, status: pad.status },
    anderPad: { id: ander.id, naam: ander.naam, status: ander.status },
    wetsstatus: wetsstatus.kort,
    voorbeeld: {
      naam: g.naam,
      slug: g.slug,
      inwoners: g.inwoners,
      huishoudens: g.huishoudens,
      fijnKg: g.fijn,
      ton: v.gekozen[0].ton,
      nascheidingKg: g.nascheiding,
      jaren: VOORBEELD_JAREN.map((jaar) => {
        const r = jaarUit(v.gekozen, jaar);
        return { jaar, totaal: r.totaal, perHuishouden: r.perHuishouden, perTon: r.perTon, aandeelCo2: r.aandeelCo2 };
      }),
      cumulatief: v.cumulatief,
      cumulatiefAnderPad: v.cumulatiefAnder,
      besparing: { jaar: besparing.jaar, kg: besparing.kg, bedrag: besparing.bedrag },
    },
    landelijk: {
      aantalGemeenten: land.aantalGemeenten,
      aantalMetNascheiding: data.gemeenten.filter((x) => x.nascheiding !== null).length,
      inwoners: land.inwoners,
      huishoudens: land.huishoudens,
      ton: land.jaren[0].ton,
      jaren: VOORBEELD_JAREN.map((jaar) => {
        const r = land.jaren.find((x) => x.jaar === jaar)!;
        return { jaar, totaal: r.totaal, perHuishouden: r.perHuishouden };
      }),
      cumulatief: land.cumulatief,
    },
  };
}
