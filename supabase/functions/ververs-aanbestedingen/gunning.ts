// Gunningsgegevens uit de officiële weergave van een TenderNed-aankondiging van een gegunde opdracht
// (https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/{id}/html).
//
// Dit bestand heeft geen imports en draait in de Edge Function (Deno), de frontend en Vitest.
// Twee vormen van de aankondiging komen voor: eForms (vanaf 2024, tabel met kopjes "6.1 ID resultaat perceel") en het
// oudere standaardformulier SF03 ("Afdeling V: Gunning van een opdracht"). Van beide halen we alleen op wat de bron
// zelf vermeldt: gegunde partij(en) (bedrijfsnamen), datum van het contract, waarde, aantal inschrijvingen en, alleen
// bij eForms, de geraamde duur en het aantal verlengingen. Contactpersonen, adressen en e-mailadressen worden nooit
// gelezen. Wat de bron niet geeft, blijft leeg.

export interface GunningPerceel {
  /** Perceelcode uit de aankondiging (bijvoorbeeld LOT-0001 of 2) of null. */
  perceel: string | null;
  titel: string | null;
  winnaars: string[];
  /** Waarde in euro, exclusief btw; null als de bron niets of een invulwaarde (onder 1.000 euro) geeft. */
  waarde: number | null;
  aantal_inschrijvingen: number | null;
  /** Datum van sluiting van het contract (jjjj-mm-dd). */
  contractdatum: string | null;
  looptijd_start: string | null;
  looptijd_einde: string | null;
  /** Einddatum is afgeleid uit begindatum en looptijd, omdat de bron geen einddatum noemt. */
  einde_afgeleid: boolean;
  verlengingen_max: number | null;
  verlenging_tekst: string | null;
}

export interface Gunning {
  formaat: 'eforms' | 'sf03';
  percelen: GunningPerceel[];
  gegund_aan: string[];
  gunningsdatum: string | null;
  waarde_totaal: number | null;
  /** Alleen als er precies één gegund perceel is; anders staat het aantal per perceel in `percelen`. */
  aantal_inschrijvingen: number | null;
  looptijd_start: string | null;
  looptijd_einde: string | null;
  einde_afgeleid: boolean;
  verlengingen_max: number | null;
  verlenging_tekst: string | null;
}

/** Onder dit bedrag (euro) is de waarde in de bron een invulwaarde (1 euro, 0 euro) en tonen we niets. */
export const MIN_WAARDE = 1000;

const ontsnapt: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const ontHtml = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ontsnapt[n.toLowerCase()] ?? m);
const tekstVan = (html: string) => ontHtml(html.replace(/<[^>]+>/g, '')).replace(/[\s\u00a0]+/g, ' ').trim();

/** "256 458,4 Euro" of "950 000,00" naar een getal; null als het geen bedrag is. */
export function parseBedrag(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /-?\d[\d\s\u00a0.]*(?:,\d+)?/.exec(s);
  if (!m) return null;
  const n = Number(m[0].replace(/[\s\u00a0.]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "13/11/2026" naar "2026-11-13". */
export function parseDatum(s: string | null | undefined): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s ?? '');
  if (!m) return null;
  const [, d, mnd, j] = m;
  if (Number(mnd) < 1 || Number(mnd) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${j}-${mnd}-${d}`;
}

/** "48 Maand", "1 Jaar" naar een aantal maanden. */
export function parseLooptijdMaanden(s: string | null | undefined): number | null {
  const m = /(\d+)\s*(maand|maanden|jaar|jaren|dag|dagen|week|weken)/i.exec(s ?? '');
  if (!m) return null;
  const n = Number(m[1]);
  const eenheid = m[2].toLowerCase();
  if (eenheid.startsWith('jaar') || eenheid.startsWith('jaren')) return n * 12;
  if (eenheid.startsWith('maand')) return n;
  return null; // dagen en weken leiden we niet af
}

/** Begindatum plus looptijd min één dag: "2025-01-01" + 24 maanden geeft "2026-12-31". */
export function eindeUitLooptijd(start: string, maanden: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + maanden, Number(m[3])));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const naarWaarde = (w: number | null) => (w !== null && w >= MIN_WAARDE ? w : null);
const uniek = (l: string[]) => [...new Set(l.map((x) => x.trim()).filter(Boolean))];
const leegPerceel = (perceel: string | null): GunningPerceel => ({
  perceel,
  titel: null,
  winnaars: [],
  waarde: null,
  aantal_inschrijvingen: null,
  contractdatum: null,
  looptijd_start: null,
  looptijd_einde: null,
  einde_afgeleid: false,
  verlengingen_max: null,
  verlenging_tekst: null,
});

/* ---------- eForms ---------- */

interface Rij {
  kop: string; // laatste kopje (header1 of header2)
  label?: string;
  waarde?: string;
}

function eformsRijen(html: string): Rij[] {
  const uit: Rij[] = [];
  let kop = '';
  for (const m of html.matchAll(/<tr class="header\d">\s*<th[^>]*>([\s\S]*?)<\/th>|<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>/g)) {
    if (m[1] !== undefined) {
      kop = tekstVan(m[1]);
      uit.push({ kop });
    } else {
      uit.push({ kop, label: tekstVan(m[2]).replace(/\s*:\s*$/, ''), waarde: tekstVan(m[3]) });
    }
  }
  return uit;
}

function parseEforms(html: string): Gunning | null {
  const rijen = eformsRijen(html);
  const kavels = new Map<string, GunningPerceel>(); // planning en looptijd per kavel (sectie 5)
  const resultaten = new Map<string, GunningPerceel>(); // uitkomst per kavel (sectie 6)
  let kavel: GunningPerceel | null = null;
  let resultaat: GunningPerceel | null = null;
  let inResultaat = false;
  let laatsteType = '';
  let totaalWaarde: number | null = null;
  let looptijdMaanden: Record<string, number | null> = {};

  for (const r of rijen) {
    if (r.label === undefined) {
      const k5 = /^5\.1 Technische ID van het kavel: (\S+)/.exec(r.kop);
      const k6 = /^6\.1 ID resultaat perceel: (\S+)/.exec(r.kop);
      if (k5) {
        inResultaat = false;
        kavel = kavels.get(k5[1]) ?? leegPerceel(k5[1]);
        kavels.set(k5[1], kavel);
      } else if (k6) {
        inResultaat = true;
        resultaat = resultaten.get(k6[1]) ?? leegPerceel(k6[1]);
        resultaten.set(k6[1], resultaat);
      } else if (/^\d+\. /.test(r.kop)) {
        inResultaat = false;
        kavel = null;
        resultaat = null;
      }
      continue;
    }
    const { label, waarde } = r;
    if (inResultaat && resultaat) {
      if (label === 'Officiële naam' && /^6\.1\.2/.test(r.kop)) resultaat.winnaars.push(waarde ?? '');
      else if (label === 'Waarde van de aanbesteding') resultaat.waarde = (resultaat.waarde ?? 0) + (parseBedrag(waarde) ?? 0);
      else if (label === 'Datum van sluiting van het contract') resultaat.contractdatum ??= parseDatum(waarde);
      else if (label === 'Titel') resultaat.titel ??= waarde ?? null;
      else if (label === 'Type van de ontvangen inschrijvingen') laatsteType = (waarde ?? '').toLowerCase();
      else if (label === 'Aantal ontvangen inschrijvingen of verzoeken tot deelname') {
        const n = Number.parseInt(waarde ?? '', 10);
        if (Number.isFinite(n) && laatsteType === 'inschrijvingen') resultaat.aantal_inschrijvingen = n;
      }
    } else if (kavel) {
      if (label === 'Titel') kavel.titel ??= waarde ?? null;
      else if (label === 'Begindatum') kavel.looptijd_start = parseDatum(waarde);
      else if (label === 'Einddatum van de duur') kavel.looptijd_einde = parseDatum(waarde);
      else if (label === 'Looptijd') looptijdMaanden[kavel.perceel ?? ''] = parseLooptijdMaanden(waarde);
      else if (label === 'Maximumaantal verlengingen') {
        const n = Number.parseInt(waarde ?? '', 10);
        if (Number.isFinite(n)) kavel.verlengingen_max = n;
      } else if (label === 'Overige informatie over verlengingen') kavel.verlenging_tekst = (waarde ?? '').slice(0, 400) || null;
    } else if (label === 'Waarde van alle contracten toegekend in deze kennisgeving') {
      totaalWaarde = parseBedrag(waarde);
    }
  }

  // Alleen percelen met een winnaar tellen als gegund.
  const percelen: GunningPerceel[] = [];
  for (const [id, res] of resultaten) {
    const winnaars = uniek(res.winnaars);
    if (winnaars.length === 0) continue;
    const plan = kavels.get(id);
    const p: GunningPerceel = {
      ...leegPerceel(id),
      titel: plan?.titel ?? res.titel ?? null,
      winnaars,
      waarde: naarWaarde(res.waarde),
      aantal_inschrijvingen: res.aantal_inschrijvingen,
      contractdatum: res.contractdatum,
      looptijd_start: plan?.looptijd_start ?? null,
      looptijd_einde: plan?.looptijd_einde ?? null,
      verlengingen_max: plan?.verlengingen_max ?? null,
      verlenging_tekst: plan?.verlenging_tekst ?? null,
    };
    const maanden = looptijdMaanden[id] ?? null;
    if (!p.looptijd_einde && p.looptijd_start && maanden) {
      p.looptijd_einde = eindeUitLooptijd(p.looptijd_start, maanden);
      p.einde_afgeleid = p.looptijd_einde !== null;
    }
    percelen.push(p);
  }
  if (percelen.length === 0) return null;
  return samenvatten('eforms', percelen, naarWaarde(totaalWaarde));
}

/* ---------- Oud standaardformulier (SF03) ---------- */

function blokTekst(html: string): string {
  return ontHtml(
    html
      .replace(/<(\/?)(div|h\d|p|li|ul|ol|br|section|tr|td|th|table|dt|dd|dl)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00a0/g, ' '),
  );
}

function parseSf03(html: string): Gunning | null {
  const tekst = blokTekst(html);
  const van = tekst.search(/Afdeling V: Gunning van een opdracht/);
  if (van < 0) return null;
  const rest = tekst.slice(van);
  const tot = rest.search(/Afdeling VI: /);
  const afdeling = tot > 0 ? rest.slice(0, tot) : rest;
  const blokken = afdeling.split(/\n\s*Opdracht nr\.:/).slice(1);
  const percelen: GunningPerceel[] = [];
  for (const blok of blokken) {
    const gegund = /wordt gegund:\s*(ja|neen|nee)/i.exec(blok);
    if (!gegund || gegund[1].toLowerCase() !== 'ja') continue;
    const perceelNr = /Perceel nr\.:\s*([^\n]+)/.exec(blok)?.[1].trim();
    const p = leegPerceel(perceelNr && perceelNr !== '-' ? perceelNr : null);
    const titel = /Benaming:\s*([^\n]+)/.exec(blok)?.[1].trim();
    p.titel = titel && titel !== '-' ? titel : null;
    p.contractdatum = parseDatum(/Datum van de sluiting van de overeenkomst:\s*(\d{2}\/\d{2}\/\d{4})/.exec(blok)?.[1]);
    const aantal = /Aantal inschrijvingen:\s*(\d+)/.exec(blok)?.[1];
    p.aantal_inschrijvingen = aantal !== undefined ? Number(aantal) : null;
    for (const m of blok.matchAll(/Officiële benaming:\s*([^\n]*?)\s*(?:Nationale identificatie:|Postadres:|\n)/g)) p.winnaars.push(m[1]);
    p.winnaars = uniek(p.winnaars).filter((w) => w !== '-');
    const waarde = /Totale waarde van de opdracht\/het perceel:\s*([\d\s.,]+)/.exec(blok)?.[1];
    p.waarde = naarWaarde(parseBedrag(waarde));
    if (p.winnaars.length) percelen.push(p);
  }
  if (percelen.length === 0) return null;
  const totaal = /II\.1\.7\)[^\n]*\n\s*Waarde:\s*([\d\s.,]+)/.exec(tekst.slice(0, van))?.[1];
  return samenvatten('sf03', percelen, naarWaarde(parseBedrag(totaal)));
}

/* ---------- Samenvatting en ingang ---------- */

function samenvatten(formaat: Gunning['formaat'], percelen: GunningPerceel[], totaal: number | null): Gunning {
  const waarden = percelen.map((p) => p.waarde);
  const somWaarde = waarden.every((w) => w !== null) ? (waarden as number[]).reduce((a, b) => a + b, 0) : null;
  const datums = percelen.map((p) => p.contractdatum).filter((d): d is string => !!d).sort();
  const starts = percelen.map((p) => p.looptijd_start).filter((d): d is string => !!d).sort();
  const einden = percelen
    .filter((p) => p.looptijd_einde)
    .sort((a, b) => (a.looptijd_einde as string).localeCompare(b.looptijd_einde as string));
  const laatsteEinde = einden[einden.length - 1];
  const verlengingen = percelen.map((p) => p.verlengingen_max).filter((n): n is number => n !== null);
  return {
    formaat,
    percelen,
    gegund_aan: uniek(percelen.flatMap((p) => p.winnaars)),
    gunningsdatum: datums[0] ?? null,
    waarde_totaal: somWaarde ?? totaal,
    aantal_inschrijvingen: percelen.length === 1 ? percelen[0].aantal_inschrijvingen : null,
    looptijd_start: starts[0] ?? null,
    looptijd_einde: laatsteEinde?.looptijd_einde ?? null,
    einde_afgeleid: laatsteEinde?.einde_afgeleid ?? false,
    verlengingen_max: verlengingen.length ? Math.max(...verlengingen) : null,
    verlenging_tekst: percelen.find((p) => p.verlenging_tekst)?.verlenging_tekst ?? null,
  };
}

/**
 * Leest de gunning uit het antwoord van /v2/publicaties/{id}/html ({ html: "..." }).
 * Null als de aankondiging geen herkenbare gunning met winnaar bevat (bijvoorbeeld vrijwillige transparantie vooraf).
 */
export function vatGunningSamen(antwoord: unknown): Gunning | null {
  const html = (antwoord as { html?: unknown } | null)?.html;
  if (typeof html !== 'string' || html.length < 50) return null;
  return html.trimStart().startsWith('<table') ? parseEforms(html) : parseSf03(html);
}

/** Planning uit de detailpagina (/v2/publicaties/{id}): aanvangOpdrachtDatum en voltooiingOpdrachtDatum, jjjj-mm-dd. */
export function planningUitDetail(detail: unknown): { start: string | null; einde: string | null } {
  const d = detail as { aanvangOpdrachtDatum?: unknown; voltooiingOpdrachtDatum?: unknown } | null;
  const dag = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  return { start: dag(d?.aanvangOpdrachtDatum), einde: dag(d?.voltooiingOpdrachtDatum) };
}
