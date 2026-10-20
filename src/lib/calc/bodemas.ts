// Bodemassencalculator (pure functies, onderdeel tools-b).
//
// ruwe bodemas        = verbrand afval × aandeel bodemas
// ferro / non-ferro   = ruwe bodemas × aandeel ferro / non-ferro
// kosten opwerking    = ruwe bodemas × verwerkingstarief (€ per ton ruwe bodemas)
// opbrengst metalen   = (ferro × prijs ferro + non-ferro × prijs non-ferro) × deel dat u ontvangt
// netto kosten        = kosten opwerking − opbrengst metalen
//
// Aandelen (bodemas, ferro, non-ferro) zijn kentallen uit Rijkswaterstaat, Afvalverwerking in Nederland 2024.
// Verwerkingstarief en metaalprijzen hebben geen openbare bron: zonder die invoer geeft de calculator alleen
// hoeveelheden en geen bedragen (null).

export interface BodemasInvoer {
  /** Verbrand afval, ton per jaar. */
  tonnageVerbrand: number;
  /** Ruwe bodemas als % van het verbrande afval (0–100). */
  aandeelBodemasPct: number;
  /** Ferro als % van de ruwe bodemas. */
  ferroPct: number;
  /** Non-ferro (incl. rvs) als % van de ruwe bodemas. */
  nonFerroPct: number;
  /** € per ton ruwe bodemas die de opwerker rekent. Geen openbare bron: null tot de gebruiker invult. */
  verwerkingstarief: number | null;
  /** € per ton afgescheiden ferro. */
  prijsFerro: number | null;
  /** € per ton afgescheiden non-ferro. */
  prijsNonFerro: number | null;
  /** Deel van de metaalopbrengst dat de opdrachtgever ontvangt, % (contractafspraak). */
  aandeelOpbrengstPct: number;
}

export type BedragVeld = 'verwerkingstarief' | 'prijsFerro' | 'prijsNonFerro';
export const bedragVelden: BedragVeld[] = ['verwerkingstarief', 'prijsFerro', 'prijsNonFerro'];

export interface BodemasUitkomst {
  bodemasTon: number;
  ferroTon: number;
  nonFerroTon: number;
  /** Ruwe bodemas min metalen: mineralen, onverbrand materiaal en residu. */
  overigTon: number;
  /** null zolang een bedrag ontbreekt. */
  brutoKosten: number | null;
  opbrengst: number | null;
  nettoKosten: number | null;
  perTonVerbrand: number | null;
  perTonBodemas: number | null;
  /** Velden zonder waarde. */
  ontbrekend: BedragVeld[];
}

export function ontbrekendeBedragen(i: BodemasInvoer): BedragVeld[] {
  return bedragVelden.filter((v) => i[v] === null || !Number.isFinite(i[v] as number));
}

export function bodemas(i: BodemasInvoer): BodemasUitkomst {
  const bodemasTon = (i.tonnageVerbrand * i.aandeelBodemasPct) / 100;
  const ferroTon = (bodemasTon * i.ferroPct) / 100;
  const nonFerroTon = (bodemasTon * i.nonFerroPct) / 100;
  const overigTon = Math.max(0, bodemasTon - ferroTon - nonFerroTon);
  const ontbrekend = ontbrekendeBedragen(i);
  if (ontbrekend.length > 0) {
    return { bodemasTon, ferroTon, nonFerroTon, overigTon, brutoKosten: null, opbrengst: null, nettoKosten: null, perTonVerbrand: null, perTonBodemas: null, ontbrekend };
  }
  const brutoKosten = bodemasTon * (i.verwerkingstarief as number);
  const opbrengst = (ferroTon * (i.prijsFerro as number) + nonFerroTon * (i.prijsNonFerro as number)) * (i.aandeelOpbrengstPct / 100);
  const nettoKosten = brutoKosten - opbrengst;
  return {
    bodemasTon,
    ferroTon,
    nonFerroTon,
    overigTon,
    brutoKosten,
    opbrengst,
    nettoKosten,
    perTonVerbrand: i.tonnageVerbrand > 0 ? nettoKosten / i.tonnageVerbrand : 0,
    perTonBodemas: bodemasTon > 0 ? nettoKosten / bodemasTon : 0,
    ontbrekend,
  };
}

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
    brutoKosten: volledig ? som((r) => r.brutoKosten as number) : null,
    opbrengst: volledig ? som((r) => r.opbrengst as number) : null,
    nettoKosten: volledig ? som((r) => r.nettoKosten as number) : null,
    volledig,
  };
  return { regels, totaal };
}

export type BodemasParameter = 'tonnageVerbrand' | 'aandeelBodemasPct' | 'ferroPct' | 'nonFerroPct' | BedragVeld;
export const gevoeligheidsParameters: BodemasParameter[] = [
  'tonnageVerbrand',
  'aandeelBodemasPct',
  'ferroPct',
  'nonFerroPct',
  'verwerkingstarief',
  'prijsFerro',
  'prijsNonFerro',
];

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
  if (ontbrekendeBedragen(i).length > 0) return [];
  return gevoeligheidsParameters
    .map((p) => {
      const waarde = i[p] as number;
      const laag = bodemas({ ...i, [p]: waarde * (1 - variatie) }).nettoKosten as number;
      const hoog = bodemas({ ...i, [p]: waarde * (1 + variatie) }).nettoKosten as number;
      return { parameter: p, laag, hoog, bandbreedte: hoog - laag };
    })
    .sort((a, b) => Math.abs(b.bandbreedte) - Math.abs(a.bandbreedte));
}

/* ---------- Deellink ---------- */

const sleutels: Record<keyof BodemasInvoer, string> = {
  tonnageVerbrand: 'ton',
  aandeelBodemasPct: 'as',
  ferroPct: 'fe',
  nonFerroPct: 'nf',
  verwerkingstarief: 'tarief',
  prijsFerro: 'pfe',
  prijsNonFerro: 'pnf',
  aandeelOpbrengstPct: 'deel',
};

export function bodemasNaarParams(i: BodemasInvoer): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, s] of Object.entries(sleutels) as [keyof BodemasInvoer, string][]) {
    const w = i[k];
    if (w !== null && Number.isFinite(w)) p.set(s, String(w));
  }
  return p;
}

/** Leest invoer uit de URL. Ontbrekende of ongeldige waarden vallen terug op de standaard. Negatief telt als ongeldig. */
export function bodemasUitParams(p: URLSearchParams, standaard: BodemasInvoer): BodemasInvoer {
  const uit = { ...standaard };
  for (const [k, s] of Object.entries(sleutels) as [keyof BodemasInvoer, string][]) {
    const t = p.get(s);
    if (t === null) continue;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) continue;
    if ((k === 'aandeelBodemasPct' || k === 'ferroPct' || k === 'nonFerroPct' || k === 'aandeelOpbrengstPct') && n > 100) continue;
    (uit as Record<string, number | null>)[k] = n;
  }
  return uit;
}
