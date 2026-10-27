// Bodemassencalculator (pure functies, onderdeel tools-b).
//
// ruwe bodemas      = verbrand afval × aandeel bodemas
// ferro / non-ferro = ruwe bodemas × aandeel ferro / non-ferro
// residu            = ruwe bodemas × aandeel residu dat wordt gestort
// kosten storten    = residu × (stortkosten + stortbelasting)
//
// Rekenwijze "kental" (standaard, met openbare bronnen):
//   kosten opwerking  = ruwe bodemas × netto opwerkingskosten (metaalopbrengst al verrekend)
//   netto kosten      = kosten opwerking + kosten storten
// Rekenwijze "contract" (eigen tarief en metaalprijzen):
//   kosten opwerking  = ruwe bodemas × verwerkingstarief
//   opbrengst metalen = (ferro × prijs ferro + non-ferro × prijs non-ferro) × deel dat u ontvangt
//   netto kosten      = kosten opwerking − opbrengst metalen + kosten storten
//
// Kentallen en bronnen: src/data/tools-b-bodemas.ts. Verwerkingstarief en metaalprijzen hebben geen openbare bron:
// in de rekenwijze "contract" zijn bedragen null tot de gebruiker ze invult.

export type Rekenwijze = 'kental' | 'contract';

export interface BodemasInvoer {
  /** Verbrand afval, ton per jaar. */
  tonnageVerbrand: number;
  /** Ruwe bodemas als % van het verbrande afval (0–100). */
  aandeelBodemasPct: number;
  /** Ferro als % van de ruwe bodemas. */
  ferroPct: number;
  /** Non-ferro (incl. rvs) als % van de ruwe bodemas. */
  nonFerroPct: number;
  rekenwijze: Rekenwijze;
  /** Kental: € per ton ruwe bodemas voor opwerking, met de metaalopbrengst al verrekend. */
  nettoOpwerking: number;
  /** Residu dat wordt gestort, % van de ruwe bodemas. */
  residuPct: number;
  /** € per ton gestort residu, zonder belasting. */
  stortkosten: number;
  /** Afvalstoffenbelasting op storten, € per ton. */
  stortbelasting: number;
  /** Contract: € per ton ruwe bodemas die de opwerker rekent. null tot de gebruiker invult. */
  verwerkingstarief: number | null;
  /** Contract: € per ton afgescheiden ferro. */
  prijsFerro: number | null;
  /** Contract: € per ton afgescheiden non-ferro. */
  prijsNonFerro: number | null;
  /** Contract: deel van de metaalopbrengst dat de opdrachtgever ontvangt, %. */
  aandeelOpbrengstPct: number;
}

export type BedragVeld = 'verwerkingstarief' | 'prijsFerro' | 'prijsNonFerro';
export const bedragVelden: BedragVeld[] = ['verwerkingstarief', 'prijsFerro', 'prijsNonFerro'];

export interface BodemasUitkomst {
  bodemasTon: number;
  ferroTon: number;
  nonFerroTon: number;
  residuTon: number;
  /** Ruwe bodemas min metalen en residu: vooral mineralen. Nooit negatief. */
  overigTon: number;
  /** Kosten opwerking; null zolang een contractbedrag ontbreekt. */
  brutoKosten: number | null;
  /** Opbrengst metalen voor de opdrachtgever. null bij rekenwijze "kental" (verrekend) of als een prijs ontbreekt. */
  opbrengst: number | null;
  kostenStorten: number;
  /** Netto kosten; negatief = netto opbrengst. null zolang een contractbedrag ontbreekt. */
  nettoKosten: number | null;
  perTonVerbrand: number | null;
  perTonBodemas: number | null;
  /** Contractvelden zonder waarde (alleen bij rekenwijze "contract"). */
  ontbrekend: BedragVeld[];
}

export function ontbrekendeBedragen(i: BodemasInvoer): BedragVeld[] {
  if (i.rekenwijze !== 'contract') return [];
  return bedragVelden.filter((v) => i[v] === null || !Number.isFinite(i[v] as number));
}

export function bodemas(i: BodemasInvoer): BodemasUitkomst {
  const bodemasTon = (i.tonnageVerbrand * i.aandeelBodemasPct) / 100;
  const ferroTon = (bodemasTon * i.ferroPct) / 100;
  const nonFerroTon = (bodemasTon * i.nonFerroPct) / 100;
  const residuTon = (bodemasTon * i.residuPct) / 100;
  const overigTon = Math.max(0, bodemasTon - ferroTon - nonFerroTon - residuTon);
  const kostenStorten = residuTon * (i.stortkosten + i.stortbelasting);
  const ontbrekend = ontbrekendeBedragen(i);
  const basis = { bodemasTon, ferroTon, nonFerroTon, residuTon, overigTon, kostenStorten, ontbrekend };
  const perTon = (netto: number) => ({
    perTonVerbrand: i.tonnageVerbrand > 0 ? netto / i.tonnageVerbrand : 0,
    perTonBodemas: bodemasTon > 0 ? netto / bodemasTon : 0,
  });

  if (i.rekenwijze === 'kental') {
    const brutoKosten = bodemasTon * i.nettoOpwerking;
    const nettoKosten = brutoKosten + kostenStorten;
    return { ...basis, brutoKosten, opbrengst: null, nettoKosten, ...perTon(nettoKosten) };
  }
  if (ontbrekend.length > 0) {
    return { ...basis, brutoKosten: null, opbrengst: null, nettoKosten: null, perTonVerbrand: null, perTonBodemas: null };
  }
  const brutoKosten = bodemasTon * (i.verwerkingstarief as number);
  const opbrengst = (ferroTon * (i.prijsFerro as number) + nonFerroTon * (i.prijsNonFerro as number)) * (i.aandeelOpbrengstPct / 100);
  const nettoKosten = brutoKosten - opbrengst + kostenStorten;
  return { ...basis, brutoKosten, opbrengst, nettoKosten, ...perTon(nettoKosten) };
}

/* ---------- Controle van de invoer ---------- */

export interface BodemasBereik {
  aandeelBodemasPct: [number, number];
  ferroPct: [number, number];
  nonFerroPct: [number, number];
}

export interface BodemasControle {
  /** Onmogelijke invoer: de uitkomst klopt dan niet. */
  fouten: string[];
  /** Ongebruikelijke invoer: mogelijk, maar controleer de waarde. */
  signalen: string[];
}

const pct = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')} %`;

/**
 * Controleert de invoer. `bereik` is de landelijke bandbreedte uit de bron; een waarde die meer dan `marge`
 * procentpunt (bodemas) of meer dan het dubbele (metalen) afwijkt, geeft een signaal.
 * `residuMax` is het maximale aandeel reinigingsresidu volgens de regels.
 */
export function controleerBodemas(i: BodemasInvoer, bereik: BodemasBereik, residuMax: number, marge = 5): BodemasControle {
  const fouten: string[] = [];
  const signalen: string[] = [];
  const som = i.ferroPct + i.nonFerroPct + i.residuPct;
  if (som > 100) fouten.push(`Ferro, non-ferro en residu zijn samen ${pct(som)} van de bodemas. Dat kan niet meer dan 100 % zijn; controleer de percentages.`);
  const [bLaag, bHoog] = bereik.aandeelBodemasPct;
  if (i.aandeelBodemasPct < bLaag - marge || i.aandeelBodemasPct > bHoog + marge)
    signalen.push(`Aandeel bodemas ${pct(i.aandeelBodemasPct)} wijkt sterk af van het landelijke beeld (${pct(bLaag)} tot ${pct(bHoog)}). Controleer de opgave van uw verwerker.`);
  const metalen = i.ferroPct + i.nonFerroPct;
  const [fLaag, fHoog] = bereik.ferroPct;
  const [nLaag, nHoog] = bereik.nonFerroPct;
  if (metalen > 2 * (fHoog + nHoog) || (metalen > 0 && metalen < (fLaag + nLaag) / 2))
    signalen.push(`Metalen samen ${pct(metalen)} van de bodemas; landelijk is dat ${pct(fLaag + nLaag)} tot ${pct(fHoog + nHoog)}. Controleer de waarde.`);
  if (i.residuPct > residuMax) signalen.push(`Residu ${pct(i.residuPct)} ligt boven het maximum van ${pct(residuMax)} van de ruwe bodemas dat mag worden gestort.`);
  if (i.rekenwijze === 'contract' && i.aandeelOpbrengstPct > 100) fouten.push('Uw deel van de metaalopbrengst kan niet meer dan 100 % zijn.');
  return { fouten, signalen };
}

/* ---------- Bandbreedte ---------- */

export type Scenario = Partial<Pick<BodemasInvoer, 'nettoOpwerking' | 'residuPct' | 'stortkosten'>>;

/**
 * Netto kosten bij een lage, middelste en hoge set kentallen. Alleen velden die de gebruiker niet zelf heeft
 * aangepast (gelijk aan de middelste waarde) volgen het scenario. null als de netto kosten niet te berekenen zijn.
 */
export function bandbreedte(i: BodemasInvoer, scenario: { laag: Scenario; midden: Scenario; hoog: Scenario }) {
  const volgt = (k: keyof Scenario) => scenario.midden[k] !== undefined && i[k] === scenario.midden[k];
  const pas = (s: Scenario): BodemasInvoer => {
    const uit = { ...i };
    for (const k of Object.keys(s) as (keyof Scenario)[]) if (volgt(k)) uit[k] = s[k] as number;
    return uit;
  };
  const laag = bodemas(pas(scenario.laag)).nettoKosten;
  const hoog = bodemas(pas(scenario.hoog)).nettoKosten;
  const midden = bodemas(i).nettoKosten;
  if (laag === null || hoog === null || midden === null) return null;
  return { laag: Math.min(laag, hoog), midden, hoog: Math.max(laag, hoog), volgtScenario: (Object.keys(scenario.midden) as (keyof Scenario)[]).filter(volgt) };
}

/* ---------- Meerdere installaties (Pro) ---------- */

export interface Installatie extends BodemasInvoer {
  id: string;
  naam: string;
}

export interface InstallatieRegel extends BodemasUitkomst {
  id: string;
  naam: string;
}

/** Uitkomst per installatie en het totaal. Bedragen in het totaal zijn null als één installatie onvolledig is. */
export function bodemasInstallaties(installaties: Installatie[]) {
  const regels: InstallatieRegel[] = installaties.map((inst) => ({ id: inst.id, naam: inst.naam, ...bodemas(inst) }));
  const volledig = regels.every((r) => r.nettoKosten !== null);
  const som = (f: (r: InstallatieRegel) => number) => regels.reduce((s, r) => s + f(r), 0);
  const totaal = {
    tonnageVerbrand: installaties.reduce((s, i) => s + i.tonnageVerbrand, 0),
    bodemasTon: som((r) => r.bodemasTon),
    ferroTon: som((r) => r.ferroTon),
    nonFerroTon: som((r) => r.nonFerroTon),
    residuTon: som((r) => r.residuTon),
    brutoKosten: volledig ? som((r) => r.brutoKosten as number) : null,
    opbrengst: volledig && regels.every((r) => r.opbrengst !== null) ? som((r) => r.opbrengst as number) : null,
    kostenStorten: som((r) => r.kostenStorten),
    nettoKosten: volledig ? som((r) => r.nettoKosten as number) : null,
    volledig,
  };
  return { regels, totaal };
}

export type BodemasParameter = 'tonnageVerbrand' | 'aandeelBodemasPct' | 'ferroPct' | 'nonFerroPct' | 'nettoOpwerking' | 'residuPct' | 'stortkosten' | BedragVeld;

/** Parameters die meetellen in de gevoeligheidsanalyse, per rekenwijze. */
export function gevoeligheidsParameters(rekenwijze: Rekenwijze): BodemasParameter[] {
  return rekenwijze === 'kental'
    ? ['tonnageVerbrand', 'aandeelBodemasPct', 'nettoOpwerking', 'residuPct', 'stortkosten']
    : ['tonnageVerbrand', 'aandeelBodemasPct', 'ferroPct', 'nonFerroPct', 'verwerkingstarief', 'prijsFerro', 'prijsNonFerro', 'residuPct', 'stortkosten'];
}

export interface Gevoeligheid {
  parameter: BodemasParameter;
  laag: number;
  hoog: number;
  /** Verschil hoog − laag in netto kosten. */
  bandbreedte: number;
}

/**
 * Gevoeligheidsanalyse: elke parameter apart −/+ variatie (bijv. 0,2 = 20 %), de rest gelijk.
 * Gesorteerd van grootste naar kleinste invloed. Leeg als een bedrag ontbreekt.
 */
export function gevoeligheid(i: BodemasInvoer, variatie = 0.2): Gevoeligheid[] {
  if (bodemas(i).nettoKosten === null) return [];
  return gevoeligheidsParameters(i.rekenwijze)
    .map((p) => {
      const waarde = i[p] as number;
      const laag = bodemas({ ...i, [p]: waarde * (1 - variatie) }).nettoKosten as number;
      const hoog = bodemas({ ...i, [p]: waarde * (1 + variatie) }).nettoKosten as number;
      return { parameter: p, laag, hoog, bandbreedte: hoog - laag };
    })
    .sort((a, b) => Math.abs(b.bandbreedte) - Math.abs(a.bandbreedte));
}

/* ---------- Deellink ---------- */

const sleutels: Record<Exclude<keyof BodemasInvoer, 'rekenwijze'>, string> = {
  tonnageVerbrand: 'ton',
  aandeelBodemasPct: 'as',
  ferroPct: 'fe',
  nonFerroPct: 'nf',
  nettoOpwerking: 'opw',
  residuPct: 'res',
  stortkosten: 'stort',
  stortbelasting: 'asb',
  verwerkingstarief: 'tarief',
  prijsFerro: 'pfe',
  prijsNonFerro: 'pnf',
  aandeelOpbrengstPct: 'deel',
};

const procentVelden = new Set<keyof BodemasInvoer>(['aandeelBodemasPct', 'ferroPct', 'nonFerroPct', 'residuPct', 'aandeelOpbrengstPct']);

export function bodemasNaarParams(i: BodemasInvoer, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams(extra);
  p.set('wijze', i.rekenwijze);
  for (const [k, s] of Object.entries(sleutels) as [keyof BodemasInvoer, string][]) {
    const w = i[k];
    if (typeof w === 'number' && Number.isFinite(w)) p.set(s, String(w));
  }
  return p;
}

/** Leest invoer uit de URL. Ontbrekende of ongeldige waarden vallen terug op de standaard. Negatief telt als ongeldig. */
export function bodemasUitParams(p: URLSearchParams, standaard: BodemasInvoer): BodemasInvoer {
  const uit = { ...standaard };
  // Een oude link (ronde 1) met tarief en prijzen rekent als contract.
  if (p.get('wijze') === 'contract' || (p.get('wijze') === null && p.has('tarief'))) uit.rekenwijze = 'contract';
  for (const [k, s] of Object.entries(sleutels) as [keyof BodemasInvoer, string][]) {
    const t = p.get(s);
    if (t === null || t.trim() === '') continue;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) continue;
    if (procentVelden.has(k) && n > 100) continue;
    (uit as Record<string, unknown>)[k] = n;
  }
  return uit;
}
