import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { heffingGemeenten, heffingGemeentenBron } from '../../data/heffingen-gemeenten';
import { heffingAanvraagVelden } from '../../data/heffingen-aanbod';
import { ASB_2026, JAREN, NRF, PEILDATUM, PROCESEMISSIEFACTOR, heffingBronnen, heffingPaden, mediaanHuishoudelijk, wetsstatus } from '../../data/heffingen-tarieven';
import { tariefpadPrijspeil2026, tariefpaden, vastgesteldeTarieven } from '../../data/co2-tarieven';
import { heffingenVoorbeeld } from '../heffingenVoorbeeld';
import { euro, getal } from '../format';
import {
  BASIS_FOSSIEL,
  aangepasteVelden,
  berekenHeffingen,
  besparingMinderRestafval,
  fossielFijn,
  invoerNaarParams,
  invoerUitParams,
  jaarUit,
  landelijkTotaal,
  maakVoorbeeld,
  naarSlug,
  overzichtRij,
  standaardInvoer,
  tonnage,
  valideerInvoer,
  vergelijkPaden,
  vindOpSlug,
  zoekHeffingGemeenten,
  zoekUitkomstHeffing,
  type HeffingInvoer,
} from './heffingen';

// Controlecijfers van het gepubliceerde voorbeeld (Overbetuwe, Belastingplan 2027, prijspeil 2026).
// Deze cijfers staan in het artikel, de carrousel en het voorbeeldrapport. Wijkt de uitkomst af, zoek dan de oorzaak
// in de data of de rekenlogica; pas deze verwachtingen alleen aan als KplusV het voorbeeld opnieuw publiceert.
const overbetuwe = heffingGemeenten.find((g) => g.code === 'GM1734')!;
const invoer = standaardInvoer(overbetuwe);
const rijen = berekenHeffingen(invoer);
const j = (jaar: number) => jaarUit(rijen, jaar);

describe('tariefpaden (memorie van toelichting Belastingplan 2027, tabel 11 en 12)', () => {
  it('afvalstoffenbelasting per ton, prijspeil 2026', () => {
    expect(heffingPaden.bp2027.asb).toEqual([40.85, 40.85, 64, 71, 81, 81, 81, 81, 81, 81]);
    expect(heffingPaden.bp2026.asb).toEqual([40.85, 40.85, 92.82, 95.29, 124.2, 112.98, 105.68, 101.56, 109.28, 117.1]);
    expect(ASB_2026).toBe(40.85);
  });

  it('CO2-heffing per ton CO2, prijspeil 2026', () => {
    expect(heffingPaden.bp2027.co2).toEqual([103.66, 126, 148, 170, 193, 215, 237, 259, 281, 304]);
    expect(heffingPaden.bp2026.co2).toEqual([103.66, 154, 204, 254, 304, 304, 304, 304, 304, 304]);
  });

  it('AVI-correctiefactor', () => {
    expect(heffingPaden.bp2027.correctiefactor).toEqual([0.85, 0.7, 0.55, 0.4, 0.25, 0.2, 0.15, 0.1, 0.05, 0]);
    expect(heffingPaden.bp2026.correctiefactor).toEqual([0.85, 0.7, 0.55, 0.4, 0.25, 0.17, 0.09, 0, 0, 0]);
  });

  it('één waarheid met de CO2-heffingenscan voor installaties (co2-tarieven.ts)', () => {
    JAREN.forEach((jaar, i) => {
      if (jaar === 2026) {
        expect(heffingPaden.bp2027.co2[i]).toBe(vastgesteldeTarieven.find((t) => t.jaar === 2026)!.avi);
        return;
      }
      const rij = tariefpadPrijspeil2026.find((t) => t.jaar === jaar)!;
      expect(heffingPaden.bp2027.co2[i]).toBe(rij.voorstel);
      expect(heffingPaden.bp2026.co2[i]).toBe(rij.geldend);
    });
    expect(heffingPaden.bp2027.correctiefactor[9]).toBe(tariefpaden.voorstel.correctiefactor[2035]);
    expect(heffingPaden.bp2026.correctiefactor[7]).toBe(tariefpaden.geldend.correctiefactor[2033]);
  });

  it('NEa-parameters: reductiefactor, procesemissiefactor en mediaan 2019–2023', () => {
    expect(NRF).toBe(1.023);
    expect(PROCESEMISSIEFACTOR).toEqual([0.97, 0.97, 0.91, 0.91, 0.91, 0.91, 0.91, 0.91, 0.91, 0.91]);
    expect(mediaanHuishoudelijk).toEqual({ ef: 0.965, bio: 0.661 });
    expect(fossielFijn(2026)).toBeCloseTo(0.989 * (1 - 0.646), 12);
    expect(fossielFijn(2027)).toBeCloseTo(0.972 * (1 - 0.655), 12);
    expect(fossielFijn(2035)).toBe(fossielFijn(2027));
    expect(BASIS_FOSSIEL.fijn).toBeCloseTo(0.965 * (1 - 0.661), 12);
    expect(BASIS_FOSSIEL.grof).toBeCloseTo(1.076 * (1 - 0.635), 12);
  });

  it('elke bron heeft een https-adres en de peildatum; de wetsstatus heeft een peildatum en bronnen', () => {
    for (const [sleutel, b] of Object.entries(heffingBronnen)) {
      expect(b.url, sleutel).toMatch(/^https:\/\//);
      expect(b.peildatum, sleutel).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(wetsstatus.peildatum).toBe(PEILDATUM);
    expect(wetsstatus.bronnen.length).toBeGreaterThan(0);
    expect(wetsstatus.kort.length).toBeGreaterThan(20);
  });
});

describe('controlecijfers Overbetuwe (gepubliceerd voorbeeld)', () => {
  it('invoer uit CBS: 48.945 inwoners, 20.585 huishoudens, 68,5 kg fijn restafval, 67,5 kg via nascheiding', () => {
    expect(overbetuwe).toMatchObject({ naam: 'Overbetuwe', slug: 'overbetuwe', inwoners: 48945, huishoudens: 20585, fijn: 68.5, nascheiding: 67.5, provincie: 'Gelderland' });
    expect(invoer.pad).toBe('bp2027');
  });

  it('3.353 ton verbrand restafval', () => {
    expect(getal(j(2026).ton)).toBe('3.353');
    expect(tonnage(invoer)).toEqual({ fijn: 3352.7325, grof: 0, overig: 0, totaal: 3352.7325 });
  });

  it('totaal 2026 € 128.500, 2030 € 371.404, 2035 € 545.467', () => {
    expect(Math.round(j(2026).totaal)).toBe(128500);
    expect(Math.round(j(2030).totaal)).toBe(371404);
    expect(Math.round(j(2035).totaal)).toBe(545467);
  });

  it('per huishouden € 6, € 18, € 26', () => {
    expect(euro(j(2026).perHuishouden)).toBe(euro(6));
    expect(euro(j(2030).perHuishouden)).toBe(euro(18));
    expect(euro(j(2035).perHuishouden)).toBe(euro(26));
  });

  it('per ton € 38,33, € 110,78, € 162,69', () => {
    expect(j(2026).perTon.toFixed(2)).toBe('38.33');
    expect(j(2030).perTon.toFixed(2)).toBe('110.78');
    expect(j(2035).perTon.toFixed(2)).toBe('162.69');
  });

  it('aandeel CO2-heffing van 20 % naar 63 %', () => {
    expect(Math.round(j(2026).aandeelCo2 * 100)).toBe(20);
    expect(Math.round(j(2035).aandeelCo2 * 100)).toBe(63);
  });

  it('cumulatief 2026–2035: € 3,55 mln (BP2027) tegen € 4,64 mln (BP2026), verschil € 1,09 mln', () => {
    const v = vergelijkPaden(invoer);
    expect((v.cumulatief / 1e6).toFixed(2)).toBe('3.55');
    expect((v.cumulatiefAnder / 1e6).toFixed(2)).toBe('4.64');
    expect((v.verschil / 1e6).toFixed(2)).toBe('1.09');
    expect(v.ander).toBe('bp2026');
    // Marketingplan, post 3: het verschil is het grootst in 2030, € 0,21 mln.
    expect(v.grootsteVerschil.jaar).toBe(2030);
    expect((v.grootsteVerschil.bedrag / 1e6).toFixed(2)).toBe('0.21');
  });

  it('10 kg minder fijn restafval per inwoner scheelt in 2030 circa € 54.220', () => {
    const b = besparingMinderRestafval(invoer, 10, 2030);
    expect(Math.round(b.bedrag / 10) * 10).toBe(54220);
    expect(b.kg).toBe(10);
    expect(b.perHuishouden).toBeCloseTo(b.bedrag / 20585, 10);
  });

  it('2035 is ruim vier keer 2026', () => {
    expect(j(2035).totaal / j(2026).totaal).toBeGreaterThan(4);
  });
});

describe('berekening per jaar', () => {
  it('rekent tien jaren door en telt ASB en CO2-heffing op', () => {
    expect(rijen.map((r) => r.jaar)).toEqual([...JAREN]);
    for (const r of rijen) {
      expect(r.totaal).toBeCloseTo(r.asb + r.co2, 8);
      expect(r.perTon).toBeCloseTo(r.totaal / r.ton, 8);
      expect(r.perInwoner).toBeCloseTo(r.totaal / 48945, 10);
    }
  });

  it('rondt niet tussentijds af: ASB 2026 = ton × 40,85 × 75 %', () => {
    expect(j(2026).asb).toBeCloseTo(3352.7325 * 40.85 * 0.75, 8);
    expect(j(2026).co2PerTon).toBeCloseTo(103.66 * (0.989 * (1 - 0.646) - 1.023 * 0.85 * 0.97 * 0.965 * (1 - 0.661)), 10);
    expect(j(2035).co2PerTon).toBeCloseTo(304 * 0.972 * (1 - 0.655), 10);
  });

  it('de vrijgestelde uitstoot maakt de heffing nooit negatief', () => {
    const r = berekenHeffingen({ ...invoer, pad: 'bp2026' });
    for (const x of r) expect(x.co2).toBeGreaterThanOrEqual(0);
  });

  it('grondslag, doorberekening, indexatie en trend werken zoals bedoeld', () => {
    const vol = jaarUit(berekenHeffingen({ ...invoer, asbGrondslagPct: 100 }), 2030);
    expect(vol.asb).toBeCloseTo((j(2030).asb / 75) * 100, 6);
    expect(vol.co2).toBeCloseTo(j(2030).co2, 8);

    const half = jaarUit(berekenHeffingen({ ...invoer, doorberekeningPct: 50 }), 2030);
    expect(half.totaal).toBeCloseTo(j(2030).totaal / 2, 6);
    expect(half.perTon).toBeCloseTo(j(2030).perTon / 2, 8);

    const index = berekenHeffingen({ ...invoer, indexatiePct: 2 });
    expect(index[0].totaal).toBeCloseTo(rijen[0].totaal, 8);
    expect(index[4].totaal).toBeCloseTo(rijen[4].totaal * 1.02 ** 4, 6);

    const trend = berekenHeffingen({ ...invoer, trendPct: -3 });
    expect(trend[0].ton).toBeCloseTo(rijen[0].ton, 8);
    expect(trend[9].ton).toBeCloseTo(rijen[0].ton * 0.97 ** 9, 6);
    expect(trend[9].perTon).toBeCloseTo(rijen[9].perTon, 8);
  });

  it('nascheiding: als de helft wordt verbrand, halveren tonnage en heffingen', () => {
    const helft = berekenHeffingen({ ...invoer, verbrandPct: 50 });
    expect(helft[0].ton).toBeCloseTo(rijen[0].ton / 2, 8);
    expect(helft[9].totaal).toBeCloseTo(rijen[9].totaal / 2, 6);
  });

  it('grof restafval en overig afval tellen alleen mee als ze zijn ingevuld', () => {
    const metGrof = { ...invoer, grofKg: 42.7, grofVerbrandPct: 70 };
    const t = tonnage(metGrof);
    expect(t.grof).toBeCloseTo((48945 * 42.7 * 0.7) / 1000, 8);
    expect(t.totaal).toBeCloseTo(t.fijn + t.grof, 8);
    const r = berekenHeffingen(metGrof);
    expect(r[0].ton).toBeCloseTo(t.totaal, 8);
    // Grof restafval heeft een hogere fossiele uitstoot per ton dan fijn, dus een hogere CO2-heffing per ton in 2035.
    expect(r[9].co2PerTon).toBeGreaterThan(rijen[9].co2PerTon);
    expect(r[9].co2).toBeCloseTo(304 * (t.fijn * 0.972 * (1 - 0.655) + t.grof * 1.076 * (1 - 0.635)), 4);

    const metOverig = berekenHeffingen({ ...invoer, overigTon: 500 });
    expect(metOverig[0].ton).toBeCloseTo(rijen[0].ton + 500, 8);
    expect(metOverig[0].perTon).toBeCloseTo(rijen[0].perTon, 8);
  });

  it('geen inwoners of huishoudens: geen deling door nul', () => {
    const leeg = berekenHeffingen({ ...invoer, inwoners: 0, huishoudens: 0 });
    for (const r of leeg) {
      expect(r.totaal).toBe(0);
      expect(r.perHuishouden).toBe(0);
      expect(r.aandeelCo2).toBe(0);
      expect(Number.isFinite(r.perTon)).toBe(true);
    }
  });
});

describe('vergelijking van de tariefpaden en besparing', () => {
  it('het Belastingplan 2026 is in elk jaar minstens zo duur als het Belastingplan 2027', () => {
    const v = vergelijkPaden(invoer);
    v.gekozen.forEach((r, i) => expect(v.anderPad[i].totaal).toBeGreaterThanOrEqual(r.totaal - 1e-9));
    expect(v.anderPad[0].totaal).toBeCloseTo(v.gekozen[0].totaal, 8);
  });

  it('andersom kiezen draait de vergelijking om', () => {
    const v = vergelijkPaden({ ...invoer, pad: 'bp2026' });
    expect(v.ander).toBe('bp2027');
    expect(v.verschil).toBeLessThan(0);
  });

  it('besparing is nooit meer dan het restafval dat er is', () => {
    const weinig = besparingMinderRestafval({ ...invoer, fijnKg: 4 }, 10, 2030);
    expect(weinig.kg).toBe(4);
    expect(weinig.bedrag).toBeCloseTo(jaarUit(berekenHeffingen({ ...invoer, fijnKg: 4 }), 2030).totaal, 8);
  });
});

describe('landelijk totaal en gemiddelde per huishouden', () => {
  const land = landelijkTotaal(heffingGemeenten);

  it('telt alle gemeenten op', () => {
    expect(land.aantalGemeenten).toBe(heffingGemeenten.length);
    expect(land.inwoners).toBe(heffingGemeenten.reduce((s, g) => s + g.inwoners, 0));
    const som2035 = heffingGemeenten.reduce((s, g) => s + overzichtRij(g).totaal2035, 0);
    expect(land.jaren[9].totaal).toBeCloseTo(som2035, 2);
  });

  it('gemiddelde per huishouden = totaal / alle huishoudens', () => {
    expect(land.jaren[0].perHuishouden).toBeCloseTo(land.jaren[0].totaal / land.huishoudens, 10);
    expect(land.jaren[9].perHuishouden).toBeGreaterThan(land.jaren[0].perHuishouden);
  });

  it('twee gemeenten: som van de afzonderlijke berekeningen', () => {
    const twee = heffingGemeenten.slice(0, 2);
    const l = landelijkTotaal(twee, 'bp2026');
    const los = twee.map((g) => berekenHeffingen({ ...standaardInvoer(g), pad: 'bp2026' }));
    expect(l.jaren[4].totaal).toBeCloseTo(los[0][4].totaal + los[1][4].totaal, 6);
    expect(l.cumulatief).toBeCloseTo(los.flat().reduce((s, r) => s + r.totaal, 0), 4);
  });

  it('lege lijst geeft nullen', () => {
    const l = landelijkTotaal([]);
    expect(l.jaren[0]).toMatchObject({ totaal: 0, perHuishouden: 0 });
  });
});

describe('validatie van invoer', () => {
  it('de standaardinvoer van elke gemeente is geldig', () => {
    for (const g of heffingGemeenten) expect(valideerInvoer(standaardInvoer(g)), g.naam).toEqual({});
  });

  it('meldt te lage, te hoge en ongeldige waarden per veld', () => {
    const fout: HeffingInvoer = { ...invoer, inwoners: 0, huishoudens: 2.5, fijnKg: -1, verbrandPct: 120, trendPct: NaN, pad: 'x' as never };
    const f = valideerInvoer(fout);
    expect(Object.keys(f).sort()).toEqual(['fijnKg', 'huishoudens', 'inwoners', 'pad', 'trendPct', 'verbrandPct']);
    expect(f.inwoners).toMatch(/Minimaal/);
    expect(f.verbrandPct).toMatch(/Maximaal/);
    expect(f.huishoudens).toMatch(/heel getal/);
    expect(f.trendPct).toMatch(/getal/);
  });
});

describe('invoer in de URL (deelbare link)', () => {
  it('standaardinvoer geeft een lege querystring', () => {
    expect(invoerNaarParams(invoer, invoer).toString()).toBe('');
    expect(aangepasteVelden(invoer, invoer)).toEqual([]);
  });

  it('alleen afwijkende velden staan in de link en komen er weer uit', () => {
    const eigen: HeffingInvoer = { ...invoer, fijnKg: 55.5, verbrandPct: 60, grofKg: 42.7, pad: 'bp2026', indexatiePct: 2.5 };
    const p = invoerNaarParams(eigen, invoer);
    expect(p.toString()).toBe('fijn=55.5&grof=42.7&verbrand=60&idx=2.5&pad=bp2026');
    expect(invoerUitParams(new URLSearchParams(p.toString()), invoer)).toEqual(eigen);
    expect(aangepasteVelden(eigen, invoer).sort()).toEqual(['fijnKg', 'grofKg', 'indexatiePct', 'pad', 'verbrandPct']);
  });

  it('ongeldige waarden in de link vallen terug op de standaard', () => {
    const p = new URLSearchParams('fijn=abc&inw=-5&verbrand=250&pad=bp1999&hh=20000,5&trend=-3');
    expect(invoerUitParams(p, invoer)).toEqual({ ...invoer, trendPct: -3 });
  });

  it('een komma als decimaalteken in de link werkt ook', () => {
    expect(invoerUitParams(new URLSearchParams('fijn=60,5'), invoer).fijnKg).toBe(60.5);
  });
});

describe('gemeentedata (CBS) en slugs', () => {
  it('342 gemeenten met bron, tabel-id, peiljaar en ophaaldatum', () => {
    expect(heffingGemeenten.length).toBe(heffingGemeentenBron.aantalGemeenten);
    expect(heffingGemeenten.length).toBeGreaterThan(300);
    const b = heffingGemeentenBron.bronnen;
    expect(b.afval.tabelId).toBe('83452NED');
    expect(b.nascheiding.tabelId).toBe('86053NED');
    expect(b.kerncijfers.tabelId).toMatch(/NED$/);
    for (const bron of [b.afval, b.nascheiding, b.kerncijfers]) expect(bron.url).toMatch(/^https:\/\/opendata\.cbs\.nl\//);
    expect(b.afval.peiljaar).toBeGreaterThanOrEqual(2024);
    expect(b.kerncijfers.peildatum).toMatch(/^\d{4}-01-01$/);
    expect(heffingGemeentenBron.opgehaald).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('elke gemeente heeft inwoners, huishoudens, fijn restafval en een provincie', () => {
    for (const g of heffingGemeenten) {
      expect(g.inwoners, g.naam).toBeGreaterThan(0);
      expect(g.huishoudens, g.naam).toBeGreaterThan(0);
      expect(g.fijn, g.naam).toBeGreaterThanOrEqual(0);
      expect(g.provincie, g.naam).toBeTruthy();
      expect(g.code).toMatch(/^GM\d{4}$/);
    }
  });

  it('slugs en aliassen zijn uniek, in kleine letters, zonder accenten', () => {
    const alle = heffingGemeenten.flatMap((g) => [g.slug, ...g.aliassen]);
    expect(new Set(alle).size).toBe(alle.length);
    for (const s of alle) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const g of heffingGemeenten) expect(vindOpSlug(g.slug, heffingGemeenten)).toBe(g);
  });

  it('Bergen (L.) en Bergen (NH.), Den Haag en Den Bosch', () => {
    expect(vindOpSlug('bergen-l', heffingGemeenten)?.naam).toBe('Bergen (L.)');
    expect(vindOpSlug('bergen-nh', heffingGemeenten)?.naam).toBe('Bergen (NH.)');
    expect(vindOpSlug('bergen', heffingGemeenten)).toBeUndefined();
    expect(vindOpSlug('den-haag', heffingGemeenten)?.code).toBe('GM0518');
    expect(vindOpSlug('s-gravenhage', heffingGemeenten)?.code).toBe('GM0518');
    expect(vindOpSlug('den-bosch', heffingGemeenten)?.code).toBe('GM0796');
    expect(vindOpSlug('s-hertogenbosch', heffingGemeenten)?.code).toBe('GM0796');
    expect(vindOpSlug('Súdwest-Fryslân', heffingGemeenten)?.slug).toBe('sudwest-fryslan');
    expect(vindOpSlug('GM1734', heffingGemeenten)?.naam).toBe('Overbetuwe');
    expect(vindOpSlug('hengelo-o', heffingGemeenten)?.slug).toBe('hengelo');
    expect(vindOpSlug('atlantis', heffingGemeenten)).toBeUndefined();
    expect(vindOpSlug('', heffingGemeenten)).toBeUndefined();
  });

  it('naarSlug', () => {
    expect(naarSlug("'s-Gravenhage")).toBe('s-gravenhage');
    expect(naarSlug('Nuenen, Gerwen en Nederwetten')).toBe('nuenen-gerwen-en-nederwetten');
    expect(naarSlug('  Den  Haag ')).toBe('den-haag');
  });

  it('zoeken: aliassen, begin van de naam en dubbelzinnige namen', () => {
    expect(zoekHeffingGemeenten('den ha', heffingGemeenten)[0].code).toBe('GM0518');
    expect(zoekHeffingGemeenten('Den Bosch', heffingGemeenten)[0].code).toBe('GM0796');
    expect(zoekHeffingGemeenten('hertog', heffingGemeenten)[0].code).toBe('GM0796');
    expect(zoekHeffingGemeenten('overb', heffingGemeenten).map((g) => g.naam)).toEqual(['Overbetuwe']);
    expect(zoekHeffingGemeenten('', heffingGemeenten)).toEqual([]);
    expect(zoekHeffingGemeenten('a', heffingGemeenten, 5).length).toBe(5);

    expect(zoekUitkomstHeffing('Den Haag', heffingGemeenten)).toMatchObject({ soort: 'gevonden', gemeente: { code: 'GM0518' } });
    expect(zoekUitkomstHeffing('arnhem', heffingGemeenten)).toMatchObject({ soort: 'gevonden', gemeente: { naam: 'Arnhem' } });
    const bergen = zoekUitkomstHeffing('Bergen', heffingGemeenten);
    expect(bergen.soort).toBe('meerdere');
    expect(zoekUitkomstHeffing('xyzzy', heffingGemeenten).soort).toBe('geen');
    // "Utrecht" is exact, ook al bestaat Utrechtse Heuvelrug.
    expect(zoekUitkomstHeffing('Utrecht', heffingGemeenten)).toMatchObject({ soort: 'gevonden', gemeente: { naam: 'Utrecht' } });
  });

  it('nascheiding: alleen gemeenten waar CBS het meldt', () => {
    const met = heffingGemeenten.filter((g) => g.nascheiding !== null);
    expect(met.length).toBe(heffingGemeentenBron.aantalMetNascheiding);
    expect(met.length).toBeGreaterThan(50);
    for (const g of met) expect(g.nascheiding, g.naam).toBeGreaterThan(0);
    expect(heffingGemeenten.find((g) => g.naam === 'Arnhem')!.nascheiding).toBeNull();
    expect(heffingGemeenten.find((g) => g.naam === 'Amsterdam')!.nascheiding).toBeGreaterThan(0);
  });
});

describe('voorbeeld en landelijk totaal voor de homepage', () => {
  it('heffingen-voorbeeld.json klopt met de rekenlogica (anders: node scripts/cbs-heffingenscan.mjs --alleen-voorbeeld)', () => {
    const vers = maakVoorbeeld({ opgehaald: heffingGemeentenBron.opgehaald, gemeenten: heffingGemeenten }, 'overbetuwe');
    expect(heffingenVoorbeeld).toEqual(JSON.parse(JSON.stringify(vers)));
  });

  it('bevat de controlecijfers', () => {
    const v = heffingenVoorbeeld.voorbeeld;
    expect(v.naam).toBe('Overbetuwe');
    expect(v.jaren.map((x) => Math.round(x.totaal))).toEqual([128500, 371404, 545467]);
    expect(heffingenVoorbeeld.landelijk.aantalGemeenten).toBe(heffingGemeenten.length);
    expect(heffingenVoorbeeld.landelijk.jaren.map((x) => x.jaar)).toEqual([2026, 2030, 2035]);
  });
});

describe('rapportaanvraag: statische formulierkopie voor Netlify', () => {
  it('index.html bevat het formulier rapportaanvraag met dezelfde veldnamen als de code', () => {
    const html = readFileSync(join(__dirname, '..', '..', '..', 'index.html'), 'utf8');
    const blok = /<form name="rapportaanvraag"[\s\S]*?<\/form>/.exec(html)?.[0] ?? '';
    expect(blok, 'formulier rapportaanvraag ontbreekt in index.html').not.toBe('');
    expect(blok).toContain('data-netlify="true"');
    expect(blok).toContain('netlify-honeypot="bot-field"');
    const inHtml = [...blok.matchAll(/name="([a-z_-]+)"/g)].map((m) => m[1]).filter((n) => !['rapportaanvraag', 'form-name', 'bot-field'].includes(n));
    expect(inHtml.sort()).toEqual([...heffingAanvraagVelden].sort());
  });
});
