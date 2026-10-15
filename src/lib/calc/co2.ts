// CO2-heffingenscan: wat kost de CO2-heffing industrie op afvalverbranding voor uw tonnage restafval?
//
// De heffing betaalt de exploitant van de afvalverbrandingsinstallatie (AVI) over zijn fossiele CO2-uitstoot,
// na aftrek van dispensatierechten (DPR's). De scan rekent dat terug naar uw tonnage:
//   uitstoot          = tonnage × fossiele emissiefactor
//   vrijgesteld deel  = DPR's / uitstoot (wettelijk berekend of eigen waarde)
//   heffing           = max(0, uitstoot × (1 − vrijgesteld deel)) × tarief
// Wettelijk vrijgesteld deel (NEa): DPR = activiteitsniveau × procesemissiefactor × reductiefactor × AVI-correctiefactor.
// Bij een uitstoot gelijk aan het historisch activiteitsniveau is het vrijgestelde deel dus
//   procesemissiefactor × reductiefactor × correctiefactor / (uitstoot ÷ historisch niveau).
// Tarief per jaar: tarief_t = (tarief_{t−1} + wettelijke verhoging_t) × (1 + inflatiecorrectie).
// Geldend recht (Wbm art. 90 jo. 71p lid 2): ook de nog niet toegepaste verhogingen worden elk jaar geïndexeerd,
// dus verhoging_t telt mee als verhoging_t × (1 + inflatie)^(t − 1 − laatste vaste jaar).
// Wetsvoorstel BP 2027 (art. XXVII, onderdeel D): verhogingen worden niet meer apart geïndexeerd.
// Alle functies zijn puur; de tarieven en factoren staan in src/data/co2-tarieven.ts.

export interface Co2Invoer {
  /** Restafval in ton per jaar. */
  tonnage: number;
  /** Ton fossiel CO2 per ton restafval. */
  emissiefactor: number;
  /** Heffing in € per ton CO2. */
  heffing: number;
  /** Vrijgestelde uitstoot in ton CO2 per jaar. */
  vrijstelling: number;
}

export interface Co2Uitkomst {
  uitstoot: number;
  belastbaar: number;
  kosten: number;
}

/** Heffing met een vrijgestelde hoeveelheid in ton CO2 (zoals de exploitant die op zijn rekening heeft). */
export function co2Heffing({ tonnage, emissiefactor, heffing, vrijstelling }: Co2Invoer): Co2Uitkomst {
  const uitstoot = tonnage * emissiefactor;
  const belastbaar = Math.max(0, uitstoot - vrijstelling);
  return { uitstoot, belastbaar, kosten: belastbaar * heffing };
}

/** Restafval bij een ander scheidingspercentage: het niet-gescheiden deel schaalt mee. */
export function restafvalBijScheiding(tonnageNu: number, scheidingNuPct: number, scheidingNieuwPct: number): number {
  if (scheidingNuPct >= 100) throw new Error('Huidig scheidingspercentage moet onder 100 % liggen');
  return (tonnageNu * (100 - scheidingNieuwPct)) / (100 - scheidingNuPct);
}

/* ---------- Regels per jaar ---------- */

/** Waarde uit een jaartabel: die van het jaar zelf of van het laatste eerdere jaar met een waarde. */
export function waardeInJaar(tabel: Record<number, number>, jaar: number): number {
  const jaren = Object.keys(tabel)
    .map(Number)
    .sort((a, b) => a - b);
  if (jaren.length === 0) throw new Error('Lege jaartabel');
  const eerder = jaren.filter((j) => j <= jaar);
  return tabel[eerder.length ? eerder[eerder.length - 1] : jaren[0]];
}

export interface TariefpadRegels {
  /** Tarieven die vastliggen per jaar. */
  vast: Record<number, number>;
  /** Wettelijke verhoging per jaar, vóór inflatiecorrectie. */
  verhogingen: Record<number, number>;
  /**
   * Worden de nog niet toegepaste verhogingen elk jaar mee geïndexeerd? Geldend recht: ja (art. 90 Wbm noemt
   * art. 71p lid 2). Wetsvoorstel BP 2027: nee. Standaard nee.
   */
  verhogingenGeindexeerd?: boolean;
}

/**
 * Tarief in een jaar. Na het laatste vaste jaar: tarief_t = (tarief_{t−1} + verhoging_t) × (1 + inflatie),
 * waarbij verhoging_t bij geldend recht zelf ook al geïndexeerd is over de jaren sinds het laatste vaste jaar.
 * Met inflatie 0 % geeft dit de bedragen zoals ze in de wet staan, zonder jaarlijkse inflatiecorrectie.
 */
export function tariefInJaar(pad: TariefpadRegels, jaar: number, inflatiePct = 0): number {
  const vasteJaren = Object.keys(pad.vast)
    .map(Number)
    .sort((a, b) => a - b);
  const eerder = vasteJaren.filter((j) => j <= jaar);
  if (eerder.length === 0) throw new Error(`Geen tarief bekend voor ${jaar}`);
  const start = eerder[eerder.length - 1];
  const f = 1 + inflatiePct / 100;
  let tarief = pad.vast[start];
  // Cumulatieve indexatie sinds het laatste vaste jaar, toegepast op verhogingen die nog in de wet staan.
  let cumulatief = 1;
  for (let j = start + 1; j <= jaar; j++) {
    const verhoging = (pad.verhogingen[j] ?? 0) * (pad.verhogingenGeindexeerd ? cumulatief : 1);
    tarief = (tarief + verhoging) * f;
    cumulatief *= f;
  }
  return tarief;
}

export interface VrijstellingFactoren {
  procesemissiefactor: number;
  reductiefactor: number;
  correctiefactor: number;
}

/** Grenzen waarbinnen de NEa het historisch activiteitsniveau gebruikt (± 15 %). */
export const VERHOUDING_MIN = 0.85;
export const VERHOUDING_MAX = 1.15;

/**
 * Vrijgesteld deel van de uitstoot volgens de wettelijke formule.
 * uitstootVerhouding = huidige uitstoot ÷ historisch activiteitsniveau (mediaan 2019–2023), tussen 0,85 en 1,15.
 * Buiten die band gebruikt de NEa het actuele niveau; dan telt verhouding 1.
 */
export function wettelijkVrijgesteldDeel(f: VrijstellingFactoren, uitstootVerhouding = 1): number {
  const v = uitstootVerhouding >= VERHOUDING_MIN && uitstootVerhouding <= VERHOUDING_MAX ? uitstootVerhouding : 1;
  return (f.procesemissiefactor * f.reductiefactor * f.correctiefactor) / v;
}

export interface Co2JaarInvoer {
  tonnage: number;
  emissiefactor: number;
  /** € per ton CO2. */
  tarief: number;
  /** Vrijgesteld deel van de uitstoot (0 of meer; boven 1 betekent een overschot aan DPR's). */
  vrijgesteldDeel: number;
}

export interface Co2JaarUitkomst {
  uitstoot: number;
  vrijgesteld: number;
  belastbaar: number;
  kosten: number;
  perTon: number;
}

/** Heffing voor één jaar, naar rato van uw tonnage. */
export function co2Jaar({ tonnage, emissiefactor, tarief, vrijgesteldDeel }: Co2JaarInvoer): Co2JaarUitkomst {
  const uitstoot = tonnage * emissiefactor;
  const vrijgesteld = uitstoot * Math.max(0, vrijgesteldDeel);
  const belastbaar = Math.max(0, uitstoot - vrijgesteld);
  const kosten = belastbaar * tarief;
  return { uitstoot, vrijgesteld, belastbaar, kosten, perTon: tonnage > 0 ? kosten / tonnage : 0 };
}

export interface Co2Regels extends TariefpadRegels {
  correctiefactor: Record<number, number>;
  reductiefactor: Record<number, number>;
  procesemissiefactor: Record<number, number>;
}

export interface JaarParameters extends VrijstellingFactoren {
  jaar: number;
  tarief: number;
}

/** Alle wettelijke parameters voor één jaar. */
export function parametersInJaar(regels: Co2Regels, jaar: number, inflatiePct = 0): JaarParameters {
  return {
    jaar,
    tarief: tariefInJaar(regels, jaar, inflatiePct),
    correctiefactor: waardeInJaar(regels.correctiefactor, jaar),
    reductiefactor: waardeInJaar(regels.reductiefactor, jaar),
    procesemissiefactor: waardeInJaar(regels.procesemissiefactor, jaar),
  };
}

export interface ScanInvoer {
  tonnage: number;
  emissiefactor: number;
  inflatiePct: number;
  vrijstelling: 'wettelijk' | 'eigen';
  /** Vrijgesteld deel in procent, als vrijstelling 'eigen' is. */
  eigenVrijgesteldPct: number;
  /** Huidige uitstoot ÷ historisch niveau in procent (85–115). */
  uitstootVerhoudingPct: number;
}

export interface ScanJaar extends Co2JaarUitkomst, JaarParameters {
  vrijgesteldDeel: number;
}

/** Scan voor één jaar: parameters opzoeken, vrijgesteld deel bepalen en heffing rekenen. */
export function scanJaar(regels: Co2Regels, invoer: ScanInvoer, jaar: number, tonnage = invoer.tonnage): ScanJaar {
  const p = parametersInJaar(regels, jaar, invoer.inflatiePct);
  const vrijgesteldDeel =
    invoer.vrijstelling === 'eigen' ? invoer.eigenVrijgesteldPct / 100 : wettelijkVrijgesteldDeel(p, invoer.uitstootVerhoudingPct / 100);
  return { ...p, vrijgesteldDeel, ...co2Jaar({ tonnage, emissiefactor: invoer.emissiefactor, tarief: p.tarief, vrijgesteldDeel }) };
}

/** Scan over een reeks jaren, optioneel bij een ander scheidingspercentage. */
export function scanReeks(
  regels: Co2Regels,
  invoer: ScanInvoer,
  eersteJaar: number,
  laatsteJaar: number,
  scheiding?: { nuPct: number; scenarioPct: number },
): ScanJaar[] {
  const tonnage = scheiding ? restafvalBijScheiding(invoer.tonnage, scheiding.nuPct, scheiding.scenarioPct) : invoer.tonnage;
  const uit: ScanJaar[] = [];
  for (let j = eersteJaar; j <= laatsteJaar; j++) uit.push(scanJaar(regels, invoer, j, tonnage));
  return uit;
}

/* ---------- Invoer in de URL ---------- */

export interface Co2PaginaInvoer extends ScanInvoer {
  jaar: number;
  pad: string;
  inwoners: number;
  scheidingNuPct: number;
  scenario2Pct: number;
  scenario3Pct: number;
}

const SLEUTELS: Record<keyof Co2PaginaInvoer, string> = {
  tonnage: 'ton',
  emissiefactor: 'ef',
  inflatiePct: 'infl',
  vrijstelling: 'vrij',
  eigenVrijgesteldPct: 'vrijpct',
  uitstootVerhoudingPct: 'verh',
  jaar: 'jaar',
  pad: 'pad',
  inwoners: 'inw',
  scheidingNuPct: 'sch',
  scenario2Pct: 'sc2',
  scenario3Pct: 'sc3',
};

export function co2InvoerNaarParams(inv: Co2PaginaInvoer): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, sleutel] of Object.entries(SLEUTELS) as [keyof Co2PaginaInvoer, string][]) p.set(sleutel, String(inv[k]));
  return p;
}

/** Leest invoer uit de URL; ongeldige waarden vallen terug op de standaard. */
export function co2InvoerUitParams(
  p: URLSearchParams,
  standaard: Co2PaginaInvoer,
  grenzen: { paden: string[]; eersteJaar: number; laatsteJaar: number },
): Co2PaginaInvoer {
  const num = (k: keyof Co2PaginaInvoer, min: number, max: number, geheel = false): number => {
    const t = p.get(SLEUTELS[k]);
    const n = t === null || t.trim() === '' ? NaN : Number(t.replace(',', '.'));
    if (!Number.isFinite(n) || n < min || n > max || (geheel && !Number.isInteger(n))) return standaard[k] as number;
    return n;
  };
  const pad = p.get(SLEUTELS.pad);
  const vrij = p.get(SLEUTELS.vrijstelling);
  return {
    tonnage: num('tonnage', 0, 1e9),
    emissiefactor: num('emissiefactor', 0, 5),
    inflatiePct: num('inflatiePct', -10, 25),
    vrijstelling: vrij === 'eigen' || vrij === 'wettelijk' ? vrij : standaard.vrijstelling,
    eigenVrijgesteldPct: num('eigenVrijgesteldPct', 0, 200),
    uitstootVerhoudingPct: num('uitstootVerhoudingPct', VERHOUDING_MIN * 100, VERHOUDING_MAX * 100),
    jaar: num('jaar', grenzen.eersteJaar, grenzen.laatsteJaar, true),
    pad: pad && grenzen.paden.includes(pad) ? pad : standaard.pad,
    inwoners: num('inwoners', 0, 1e8),
    scheidingNuPct: num('scheidingNuPct', 0, 99),
    scenario2Pct: num('scenario2Pct', 0, 99),
    scenario3Pct: num('scenario3Pct', 0, 99),
  };
}
