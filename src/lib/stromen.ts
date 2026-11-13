// Rekenhulp voor /stromen: landelijke tijdreeks, verandering over tien jaar, spreiding tussen gemeenten,
// klassen voor de kaart en zoeken. Pure functies (getest in stromen.test.ts), plus het laden van de gemeentecijfers.

import landelijkJson from '../data/stromen-landelijk.json';
import type { StroomId } from '../data/stromen';
import { normaliseer } from './kaartdata';

/* ---------- Landelijke tijdreeks (CBS 83558NED) ---------- */

export interface Reeks {
  kg: (number | null)[];
  kton: (number | null)[];
}
export interface LandelijkBron {
  tabelId: string;
  titel: string;
  gewijzigd: string;
  url: string;
  api: string;
  status: string;
}
export interface VerwerkingReeks {
  nuttig: (number | null)[];
  composteren: (number | null)[];
  nascheiding: (number | null)[];
  verbranden: (number | null)[];
  storten: (number | null)[];
}
export interface Landelijk {
  opgehaald: string;
  bron: LandelijkBron;
  jaren: number[];
  totaal: Reeks;
  reeksen: Record<StroomId, Reeks>;
  fracties: Record<string, { titel: string } & Reeks>;
  verwerking: { restafval: VerwerkingReeks; grofRestafval: VerwerkingReeks };
}
export const landelijk = landelijkJson as unknown as Landelijk;

export interface Punt {
  jaar: number;
  waarde: number;
}

/** De jaren met een cijfer, voor een lijngrafiek of tabel. */
export function punten(jaren: number[], waarden: (number | null)[]): Punt[] {
  const uit: Punt[] = [];
  jaren.forEach((jaar, i) => {
    const w = waarden[i];
    if (typeof w === 'number' && Number.isFinite(w)) uit.push({ jaar, waarde: w });
  });
  return uit;
}

/** Haalt nullen aan het begin van een reeks weg: CBS meldt 0 voor jaren waarin een fractie nog niet apart werd geregistreerd (bijvoorbeeld PMD vóór 2009). */
export function trimNullen(reeks: Punt[]): Punt[] {
  const eerste = reeks.findIndex((p) => p.waarde > 0);
  return eerste <= 0 ? reeks : reeks.slice(eerste);
}

/**
 * Status van de cijfers in een bepaald jaar, uit de statustekst van CBS ("De cijfers over 2025 zijn voorlopig. De cijfers
 * over 2022, 2023 en 2024 zijn nader voorlopig; alle overige cijfers zijn definitief.").
 */
export function statusVanJaar(tekst: string, jaar: number): 'definitief' | 'voorlopig' | 'nader voorlopig' {
  for (const zin of tekst.split(/[.;]/)) {
    if (!new RegExp(`\\b${jaar}\\b`).test(zin)) continue;
    if (/nader voorlopig/i.test(zin)) return 'nader voorlopig';
    if (/voorlopig/i.test(zin)) return 'voorlopig';
  }
  return 'definitief';
}

export interface Verandering {
  van: Punt;
  naar: Punt;
  /** naar − van, in dezelfde eenheid als de reeks. */
  verschil: number;
  /** In procenten van het beginjaar; null als het beginjaar 0 is. */
  pct: number | null;
}

/**
 * Verandering tussen het laatste jaar met een cijfer en het jaar `aantalJaren` eerder.
 * Is dat jaar er niet, dan het oudste jaar binnen het venster; zonder twee punten geeft het null.
 */
export function verandering(reeks: Punt[], aantalJaren = 10): Verandering | null {
  if (reeks.length < 2) return null;
  const naar = reeks[reeks.length - 1];
  const doel = naar.jaar - aantalJaren;
  const van = reeks.find((p) => p.jaar >= doel);
  if (!van || van.jaar >= naar.jaar) return null;
  return { van, naar, verschil: naar.waarde - van.waarde, pct: van.waarde === 0 ? null : ((naar.waarde - van.waarde) / van.waarde) * 100 };
}

/** Het aandeel van de reeks (in procenten) in het totaal van het laatste jaar; null als het totaal 0 of onbekend is. */
export function aandeelVanTotaal(deel: number | null | undefined, totaal: number | null | undefined): number | null {
  if (typeof deel !== 'number' || typeof totaal !== 'number' || totaal <= 0) return null;
  return (deel / totaal) * 100;
}

/* ---------- Gemeentecijfers (public/data/stromen-gemeenten.json) ---------- */

export interface StroomRij {
  code: string;
  naam: string;
  provincie: string | null;
  inwoners: number | null;
  restafval: number | null;
  gft: number | null;
  papier: number | null;
  pmd: number | null;
  textiel: number | null;
  glas: number | null;
  grof: number | null;
  luiers: number | null;
  kca: number | null;
}
export interface GemeentenBestand {
  kop: {
    peiljaar: number;
    opgehaald: string;
    bron: LandelijkBron;
    inwonersBron: string;
    stromen: StroomId[];
    aantalZonderCijfer: Record<StroomId, number>;
  };
  gemeenten: StroomRij[];
}

let belofte: Promise<GemeentenBestand> | null = null;
/** Haalt de gemeentecijfers één keer per bezoek op; ze zitten niet in de hoofdbundel. */
export function laadGemeenten(): Promise<GemeentenBestand> {
  if (!belofte) {
    belofte = fetch('/data/stromen-gemeenten.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<GemeentenBestand>;
    });
    belofte.catch(() => {
      belofte = null;
    });
  }
  return belofte;
}

export const waarde = (r: StroomRij, id: StroomId): number | null => {
  const w = r[id];
  return typeof w === 'number' && Number.isFinite(w) ? w : null;
};

/** Gemiddelde over gemeenten, gewogen naar inwoners. Gemeenten zonder cijfer of inwonertal tellen niet mee. */
export function gewogenGemiddelde(rijen: StroomRij[], id: StroomId): number | null {
  let som = 0;
  let gewicht = 0;
  for (const r of rijen) {
    const w = waarde(r, id);
    if (w === null || !r.inwoners) continue;
    som += w * r.inwoners;
    gewicht += r.inwoners;
  }
  return gewicht > 0 ? som / gewicht : null;
}

/** Percentiel (0–100) van een oplopend gesorteerde lijst, met lineaire interpolatie. */
export function percentiel(gesorteerd: number[], p: number): number | null {
  const n = gesorteerd.length;
  if (n === 0) return null;
  if (n === 1) return gesorteerd[0];
  const pos = (Math.min(100, Math.max(0, p)) / 100) * (n - 1);
  const onder = Math.floor(pos);
  const boven = Math.ceil(pos);
  return gesorteerd[onder] + (gesorteerd[boven] - gesorteerd[onder]) * (pos - onder);
}

export interface Spreiding {
  /** Aantal gemeenten met een cijfer. */
  n: number;
  min: { naam: string; waarde: number };
  p10: number;
  mediaan: number;
  p90: number;
  max: { naam: string; waarde: number };
  /** Verhouding tussen het 90e en het 10e percentiel; null als het 10e percentiel 0 is. */
  factor: number | null;
}

/** Spreiding tussen gemeenten: laagste, 10e, mediaan, 90e en hoogste. Null zonder cijfers. */
export function spreiding(rijen: StroomRij[], id: StroomId): Spreiding | null {
  const metWaarde = rijen.map((r) => ({ naam: r.naam, w: waarde(r, id) })).filter((x): x is { naam: string; w: number } => x.w !== null);
  if (metWaarde.length === 0) return null;
  const gesorteerd = metWaarde.map((x) => x.w).sort((a, b) => a - b);
  const laagste = metWaarde.reduce((a, b) => (b.w < a.w ? b : a));
  const hoogste = metWaarde.reduce((a, b) => (b.w > a.w ? b : a));
  const p10 = percentiel(gesorteerd, 10)!;
  const p90 = percentiel(gesorteerd, 90)!;
  return {
    n: gesorteerd.length,
    min: { naam: laagste.naam, waarde: laagste.w },
    p10,
    mediaan: percentiel(gesorteerd, 50)!,
    p90,
    max: { naam: hoogste.naam, waarde: hoogste.w },
    factor: p10 > 0 ? p90 / p10 : null,
  };
}

/** Plaats van een gemeente van hoog naar laag (1 = hoogste cijfer). Gelijke waarden delen een plaats. */
export function plaatsVanHoogNaarLaag(rij: StroomRij, rijen: StroomRij[], id: StroomId): { plaats: number; van: number } | null {
  const eigen = waarde(rij, id);
  if (eigen === null) return null;
  const alle = rijen.map((r) => waarde(r, id)).filter((w): w is number => w !== null);
  return { plaats: alle.filter((w) => w > eigen).length + 1, van: alle.length };
}

/* ---------- Kaartklassen ---------- */

/** Rondt af op twee significante cijfers. */
function rond2(n: number): number {
  if (n === 0) return 0;
  const macht = 10 ** (Math.floor(Math.log10(Math.abs(n))) - 1);
  return Math.round(n / macht) * macht;
}

/**
 * Vier ondergrenzen (voor klasse 2 t/m 5) uit de verdeling zelf: het 20e, 40e, 60e en 80e percentiel op twee
 * significante cijfers. Zo bevat elke klasse ongeveer evenveel gemeenten, ook bij een stroom met kleine waarden
 * (textiel) of grote spreiding (restafval). De grenzen zijn strikt oplopend.
 */
export function klasseGrenzen(waarden: number[]): [number, number, number, number] {
  const gesorteerd = [...waarden].filter(Number.isFinite).sort((a, b) => a - b);
  const ruw = [20, 40, 60, 80].map((p) => percentiel(gesorteerd, p) ?? 0);
  const uit: number[] = [];
  for (const g of ruw) {
    let w = rond2(g);
    const vorige = uit[uit.length - 1];
    if (vorige !== undefined && w <= vorige) w = rond2(vorige * 1.1 + 0.1) || vorige + 1;
    if (vorige !== undefined && w <= vorige) w = vorige + 1;
    uit.push(w);
  }
  return uit as [number, number, number, number];
}

export function klasseVan(w: number | null, grenzen: readonly number[]): number | null {
  if (w === null) return null;
  let k = 0;
  for (const g of grenzen) if (w >= g) k++;
  return k;
}

/* ---------- Zoeken en export ---------- */

export function zoekRijen(term: string, rijen: StroomRij[]): StroomRij[] {
  const t = normaliseer(term);
  if (!t) return rijen;
  return rijen.filter((r) => normaliseer(r.naam).includes(t) || normaliseer(r.provincie ?? '').includes(t));
}

export type Sorteer = 'naam' | 'inwoners' | 'waarde';
export function sorteerRijen(rijen: StroomRij[], id: StroomId, op: Sorteer, oplopend: boolean): StroomRij[] {
  const richting = oplopend ? 1 : -1;
  const sleutel = (r: StroomRij) => (op === 'naam' ? r.naam : op === 'inwoners' ? r.inwoners : waarde(r, id));
  return [...rijen].sort((a, b) => {
    const x = sleutel(a);
    const y = sleutel(b);
    // Rijen zonder cijfer staan altijd onderaan, welke kant ook.
    if (x === null && y === null) return a.naam.localeCompare(b.naam, 'nl');
    if (x === null) return 1;
    if (y === null) return -1;
    if (typeof x === 'string' && typeof y === 'string') return richting * x.localeCompare(y, 'nl');
    return richting * ((x as number) - (y as number)) || a.naam.localeCompare(b.naam, 'nl');
  });
}

export function naarCsv(rijen: StroomRij[], id: StroomId, peiljaar: number): string {
  const kop = ['Code', 'Gemeente', 'Provincie', 'Inwoners', `${id} kg per inwoner ${peiljaar}`];
  const regels = rijen.map((r) => [r.code, r.naam, r.provincie ?? '', r.inwoners ?? '', waarde(r, id)?.toString().replace('.', ',') ?? '']);
  const cel = (v: string | number) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [kop, ...regels].map((r) => r.map(cel).join(';')).join('\r\n');
}
