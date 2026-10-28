// Aanbestedingstool (pure functies, onderdeel tools-b).
//
// weging_i              = punten_i / Σ punten × 100 %   (prijs plus de gekozen gunningscriteria)
// geraamde waarde       = volume per jaar × tarief × (looptijd + verlengingsopties)
// Europees aanbesteden  = geraamde waarde ≥ drempelbedrag (PIANOo, 2026–2027), per soort opdracht
// bandbreedte raming    = volume × (tarief laag, tarief hoog) × (looptijd + verlengingsopties), als het tarief een kental is
//
// De checklist is een hulpmiddel, geen juridisch advies.

import type { CsvCel } from '../../components/rekenen/csv';

/** Zet punten om naar percentages die samen 100 zijn. Alles op 0 betekent gelijke weging. Negatief telt als 0. */
export function normaliseerWeging<K extends string>(punten: Record<K, number>): Record<K, number> {
  const sleutels = Object.keys(punten) as K[];
  const som = sleutels.reduce((s, k) => s + Math.max(0, punten[k] || 0), 0);
  const uit = {} as Record<K, number>;
  for (const k of sleutels) uit[k] = som === 0 ? (sleutels.length ? 100 / sleutels.length : 0) : (Math.max(0, punten[k] || 0) / som) * 100;
  return uit;
}

/** Rondt percentages af op hele procenten zodat ze samen precies 100 zijn (grootste-restmethode). */
export function rondAfOp100<K extends string>(pct: Record<K, number>): Record<K, number> {
  const sleutels = Object.keys(pct) as K[];
  if (sleutels.length === 0) return {} as Record<K, number>;
  const basis = sleutels.map((k) => ({ k, vloer: Math.floor(pct[k]), rest: pct[k] - Math.floor(pct[k]) }));
  let tekort = 100 - basis.reduce((s, b) => s + b.vloer, 0);
  const volgorde = [...basis].sort((a, b) => b.rest - a.rest);
  const uit = {} as Record<K, number>;
  for (const b of basis) uit[b.k] = b.vloer;
  for (const b of volgorde) {
    if (tekort <= 0) break;
    uit[b.k] += 1;
    tekort -= 1;
  }
  return uit;
}

export interface Raming {
  volumePerJaar: number;
  /** € per eenheid; null als onbekend. */
  tarief: number | null;
  looptijdJaren: number;
  verlengingJaren: number;
}

/** Geraamde opdrachtwaarde over de maximale looptijd inclusief verlengingen, excl. btw. null zonder tarief. */
export function geraamdeWaarde(r: Raming): number | null {
  if (r.tarief === null || !Number.isFinite(r.tarief)) return null;
  return r.volumePerJaar * r.tarief * (r.looptijdJaren + r.verlengingJaren);
}

export interface DrempelUitkomst {
  waarde: number;
  drempel: number;
  europees: boolean;
  /** Verhouding waarde / drempel. */
  factor: number;
}

export function drempelToets(waarde: number | null, drempel: number): DrempelUitkomst | null {
  if (waarde === null) return null;
  return { waarde, drempel, europees: waarde >= drempel, factor: drempel > 0 ? waarde / drempel : 0 };
}

/** Geraamde waarde bij een laag en hoog tarief (bandbreedte van het tariefkental). null zonder bandbreedte. */
export function ramingBandbreedte(r: Raming, tarief: { laag: number; hoog: number } | null): { laag: number; hoog: number } | null {
  if (!tarief) return null;
  const laag = geraamdeWaarde({ ...r, tarief: tarief.laag });
  const hoog = geraamdeWaarde({ ...r, tarief: tarief.hoog });
  return laag === null || hoog === null ? null : { laag: Math.min(laag, hoog), hoog: Math.max(laag, hoog) };
}

/** Oordeel over de drempel bij een bandbreedte: de hele band boven, de hele band onder, of de drempel valt erbinnen. */
export function drempelBand(band: { laag: number; hoog: number } | null, drempel: number): 'boven' | 'onder' | 'grens' | null {
  if (!band) return null;
  if (band.laag >= drempel) return 'boven';
  if (band.hoog < drempel) return 'onder';
  return 'grens';
}

export interface RamingControle {
  volume: number;
  tarief: number | null;
  /** 'ton' of 'stuks'. */
  eenheid: 'ton' | 'stuks';
  /** Tariefkental met bandbreedte, als de stroom er een heeft. */
  kental?: { laag: number; hoog: number };
  /** Fijn huishoudelijk restafval in heel Nederland (ton per jaar). */
  restafvalNlTon: number;
  inwonersNl: number;
}

/** Signalen bij een raming die niet past bij de werkelijkheid. Rekent nergens mee; het is een controle. */
export function ramingSignalen(c: RamingControle): string[] {
  const uit: string[] = [];
  const nl = (n: number) => new Intl.NumberFormat('nl-NL').format(Math.round(n));
  if (c.eenheid === 'ton' && c.volume > c.restafvalNlTon)
    uit.push(`Het volume (${nl(c.volume)} ton per jaar) is groter dan al het fijne huishoudelijke restafval in Nederland (ongeveer ${nl(c.restafvalNlTon)} ton). Controleer de eenheid.`);
  if (c.eenheid === 'stuks' && c.volume > c.inwonersNl) uit.push(`Meer containers per jaar (${nl(c.volume)}) dan Nederland inwoners heeft. Controleer het aantal.`);
  if (c.kental && c.tarief !== null) {
    if (c.tarief > c.kental.hoog * 3) uit.push(`Het tarief is meer dan drie keer de bovenkant van het kental (${nl(c.kental.hoog)} euro). Controleer of het per ton is.`);
    else if (c.tarief > 0 && c.tarief < c.kental.laag / 3) uit.push(`Het tarief is minder dan een derde van de onderkant van het kental (${nl(c.kental.laag)} euro). Controleer de waarde.`);
  }
  if (c.volume === 0) uit.push('Het volume is 0: de geraamde waarde is dan ook 0.');
  return uit;
}

export type PrijsSignaal = 'alleen-prijs' | 'zeer-zwaar' | 'geen-prijs' | null;

/**
 * Signaal bij de weging van prijs. Bij een zeer hoog prijsgewicht gunt u in feite op laagste prijs
 * (PIANOo-handreiking BPKV noemt een voorbeeld van 97 %); zonder prijs gunt u op kwaliteit bij een vaste prijs.
 */
export function prijsSignaal(prijsPct: number, aantalKwaliteit: number): PrijsSignaal {
  if (aantalKwaliteit === 0) return 'alleen-prijs';
  if (prijsPct >= 90) return 'zeer-zwaar';
  if (prijsPct <= 0) return 'geen-prijs';
  return null;
}

export interface ChecklistInvoer {
  stroomNaam: string;
  looptijdJaren: number;
  verlengingJaren: number;
  europees: boolean | null;
  /** Id's van gekozen criteria. */
  gekozen: string[];
  /** Weging prijs in procenten. */
  prijsPct: number;
  /** Aantal gekozen gunningscriteria naast prijs. */
  aantalKwaliteit: number;
  /** True als twee CO2-methoden (basis en gedetailleerd) tegelijk zijn gekozen. */
  dubbeleCo2Methode: boolean;
  /** Soort opdracht voor de drempel; standaard diensten of leveringen. */
  opdrachtType?: string;
  /** Ligt de drempel binnen de bandbreedte van de raming? */
  drempelBinnenBand?: boolean;
}

/** Checklist voor de voorbereiding. Volgorde: procedure, criteria, contract. */
export function checklist(c: ChecklistInvoer): string[] {
  const punten: string[] = [];
  if (c.europees === true) punten.push('De geraamde waarde ligt op of boven het drempelbedrag: volg een Europese procedure en publiceer op TenderNed.');
  else if (c.europees === false) punten.push('De geraamde waarde ligt onder het drempelbedrag: kies een procedure volgens uw inkoopbeleid en de Gids Proportionaliteit.');
  else punten.push('Vul een geraamd tarief in om te bepalen of u Europees moet aanbesteden.');
  if (c.drempelBinnenBand) punten.push('Het drempelbedrag valt binnen de bandbreedte van uw raming. Onderbouw de raming met een marktverkenning of uw huidige contract.');
  if (c.opdrachtType === 'sociaal') punten.push('U rekent met de drempel voor sociale en andere specifieke diensten. Controleer of de dienst echt onder bijlage XIV valt; anders geldt het lagere drempelbedrag.');
  if (c.opdrachtType === 'concessie') punten.push('U rekent met de drempel voor concessies. Controleer of het exploitatierisico echt bij de opdrachtnemer ligt; anders is het een overheidsopdracht met een lager drempelbedrag.');
  punten.push('Tel de waarde van soortgelijke opdrachten bij elkaar op en splits de opdracht niet om onder de drempel te blijven.');
  punten.push('Houd een marktconsultatie om eisen, gunningscriteria en ambitieniveau te toetsen.');
  if (c.aantalKwaliteit > 0) punten.push('Maak per gunningscriterium vooraf bekend hoe u beoordeelt en punten toekent.');
  if (c.dubbeleCo2Methode) punten.push('U hebt de basis- én de gedetailleerde CO2-methode gekozen. Kies er één, anders weegt CO2 dubbel.');
  if (c.prijsPct >= 90 && c.aantalKwaliteit > 0) punten.push('Prijs weegt 90 % of meer. Controleer of kwaliteit nog echt het verschil kan maken.');
  const totaal = c.looptijdJaren + c.verlengingJaren;
  if (totaal >= 4 && !c.gekozen.includes('alg-index')) punten.push('Bij een looptijd van vier jaar of meer is een indexeringsclausule gebruikelijk; die staat nog niet in uw selectie.');
  if (totaal >= 6) punten.push('Spreek een evaluatiemoment af, bijvoorbeeld halverwege de looptijd.');
  if (!c.gekozen.includes('alg-volume')) punten.push('Neem een bandbreedte voor het volume op; die staat nog niet in uw selectie.');
  punten.push(`Laat de eisen voor ${c.stroomNaam.toLowerCase()} juridisch toetsen voordat u ze publiceert.`);
  return punten;
}

/* ---------- Export ---------- */

export interface OverzichtRegel {
  id: string;
  soort: string;
  thema: string;
  titel: string;
  tekst: string;
  toetsing?: string;
  /** Bijv. "MVI 049.003 (Basis)" of "Voorbeeld KplusV". */
  herkomst: string;
  link?: string;
  /** Alleen gunningscriteria: weging in %. */
  wegingPct?: number;
}

export interface Overzicht {
  titel: string;
  datum: string;
  peildatum: string;
  opdracht: [string, string][];
  weging: { label: string; pct: number }[];
  regels: OverzichtRegel[];
  checklist: string[];
  bronnen: { titel: string; url: string }[];
}

export function overzichtCsv(o: Overzicht): CsvCel[][] {
  return [
    [o.titel, 'KplusV'],
    ['Gemaakt op', o.datum],
    ['Peildatum bronnen', o.peildatum],
    [],
    ['Opdracht', 'Waarde'],
    ...o.opdracht.map(([k, v]): CsvCel[] => [k, v]),
    [],
    ['Weging', 'Procent'],
    ...o.weging.map((w): CsvCel[] => [w.label, w.pct]),
    [],
    ['Soort', 'Thema', 'Titel', 'Omschrijving', 'Toetsing', 'Weging (%)', 'Herkomst', 'Link'],
    ...o.regels.map((r): CsvCel[] => [r.soort, r.thema, r.titel, r.tekst, r.toetsing ?? '', r.wegingPct ?? '', r.herkomst, r.link ?? '']),
    [],
    ['Checklist'],
    ...o.checklist.map((p): CsvCel[] => [p]),
    [],
    ['Bronnen', 'Link'],
    ...o.bronnen.map((b): CsvCel[] => [b.titel, b.url]),
  ];
}

const pctTekst = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')} %`;

/** Leesbaar tekstbestand van het overzicht (UTF-8, regeleinden CRLF). */
export function overzichtTekst(o: Overzicht): string {
  const r: string[] = [];
  const kop = (t: string) => {
    r.push('', t.toUpperCase(), '-'.repeat(Math.min(t.length, 72)));
  };
  r.push(o.titel, '='.repeat(Math.min(o.titel.length, 72)), `Gemaakt op ${o.datum}. Peildatum bronnen ${o.peildatum}.`);
  r.push('Hulpmiddel van KplusV. Geen juridisch advies; laat de stukken toetsen voor publicatie.');
  kop('Opdracht');
  for (const [k, v] of o.opdracht) r.push(`${k}: ${v}`);
  kop('Weging');
  for (const w of o.weging) r.push(`${w.label}: ${pctTekst(w.pct)}`);
  const soorten = [...new Set(o.regels.map((x) => x.soort))];
  for (const s of soorten) {
    kop(s);
    o.regels
      .filter((x) => x.soort === s)
      .forEach((x, n) => {
        r.push(`${n + 1}. ${x.titel}${x.wegingPct !== undefined ? ` (weging ${pctTekst(x.wegingPct)})` : ''}`);
        r.push(`   ${x.tekst}`);
        if (x.toetsing) r.push(`   Toetsing: ${x.toetsing}`);
        r.push(`   Herkomst: ${x.herkomst}${x.link ? ` – ${x.link}` : ''}`);
      });
  }
  kop('Checklist');
  for (const p of o.checklist) r.push(`[ ] ${p}`);
  kop('Bronnen');
  for (const b of o.bronnen) r.push(`- ${b.titel}: ${b.url}`);
  return r.join('\r\n');
}

/* ---------- Deellink ---------- */

export interface AanbestedingInvoer {
  stroom: string;
  drempel: string;
  /** Soort opdracht voor de drempeltoets: diensten, sociaal of concessie. */
  opdrachtType: string;
  volume: number;
  tarief: number | null;
  looptijd: number;
  verlenging: number;
  gekozen: string[];
  /** Punten per gunningscriterium-id, plus "prijs". */
  punten: Record<string, number>;
}

export function aanbestedingNaarParams(i: AanbestedingInvoer): URLSearchParams {
  const p = new URLSearchParams();
  p.set('stroom', i.stroom);
  p.set('dienst', i.drempel);
  p.set('type', i.opdrachtType);
  p.set('vol', String(i.volume));
  // Leeg tarief expliciet meegeven, anders vult de ontvanger het kental van de standaardstroom in.
  p.set('tarief', i.tarief !== null && Number.isFinite(i.tarief) ? String(i.tarief) : '');
  p.set('jr', String(i.looptijd));
  p.set('verl', String(i.verlenging));
  p.set('sel', i.gekozen.join(','));
  p.set(
    'w',
    Object.entries(i.punten)
      .map(([k, v]) => `${k}:${v}`)
      .join(','),
  );
  return p;
}

export interface ParamOpties {
  stromen: string[];
  drempels: string[];
  /** Toegestane soorten opdracht. */
  typen?: string[];
  /** Criterium-id's die bij een stroom horen. */
  geldig: (stroom: string) => string[];
  /** Standaardselectie van een stroom; gebruikt als de link een andere stroom maar geen selectie heeft. */
  selectie?: (stroom: string) => string[];
  /** Tariefkental van een stroom (null zonder bron); gebruikt als de link een andere stroom maar geen tarief heeft. */
  tarief?: (stroom: string) => number | null;
}

/**
 * Leest de invoer uit de URL. Onbekende stromen, criteria of soorten diensten worden genegeerd.
 * Een lege `tarief` betekent: geen tarief ingevuld.
 */
export function aanbestedingUitParams(p: URLSearchParams, standaard: AanbestedingInvoer, opties: ParamOpties): AanbestedingInvoer {
  const uit: AanbestedingInvoer = { ...standaard, punten: { ...standaard.punten }, gekozen: [...standaard.gekozen] };
  const stroom = p.get('stroom');
  if (stroom && opties.stromen.includes(stroom)) uit.stroom = stroom;
  const dienst = p.get('dienst');
  if (dienst && opties.drempels.includes(dienst)) uit.drempel = dienst;
  const type = p.get('type');
  if (type && (opties.typen ?? ['diensten', 'sociaal', 'concessie']).includes(type)) uit.opdrachtType = type;
  const getal = (s: string | null, min = 0, max = Infinity) => {
    if (s === null || s.trim() === '') return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const andereStroom = uit.stroom !== standaard.stroom;
  uit.volume = getal(p.get('vol')) ?? uit.volume;
  const tariefTekst = p.get('tarief');
  const t = tariefTekst === null || tariefTekst.trim() === '' ? null : getal(tariefTekst);
  if (t !== null) uit.tarief = t;
  else if (tariefTekst !== null && tariefTekst.trim() === '') uit.tarief = null;
  else if (andereStroom) uit.tarief = opties.tarief ? opties.tarief(uit.stroom) : null;
  uit.looptijd = getal(p.get('jr'), 1, 20) ?? uit.looptijd;
  uit.verlenging = getal(p.get('verl'), 0, 10) ?? uit.verlenging;
  const geldig = new Set(opties.geldig(uit.stroom));
  const sel = p.get('sel');
  if (sel !== null) uit.gekozen = sel.split(',').filter((id) => geldig.has(id));
  else if (andereStroom) uit.gekozen = opties.selectie ? opties.selectie(uit.stroom).filter((id) => geldig.has(id)) : uit.gekozen.filter((id) => geldig.has(id));
  const w = p.get('w');
  if (w) {
    for (const deel of w.split(',')) {
      const [k, v] = deel.split(':');
      const n = getal(v ?? null, 0, 100);
      if (k && n !== null && (k === 'prijs' || geldig.has(k))) uit.punten[k] = n;
    }
  }
  return uit;
}
