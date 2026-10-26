import { describe, expect, it } from 'vitest';
import { criteria, criteriaVoorStroom, drempels, standaardSelectie, stroomLijst, stromen } from '../../data/tools-b-aanbesteding';
import { naarCsv } from '../../components/rekenen/export';
import {
  aanbestedingNaarParams,
  aanbestedingUitParams,
  checklist,
  drempelToets,
  geraamdeWaarde,
  normaliseerWeging,
  overzichtCsv,
  overzichtTekst,
  prijsSignaal,
  rondAfOp100,
  type AanbestedingInvoer,
  type Overzicht,
} from './aanbesteding';

describe('weging', () => {
  it('normaliseert punten naar 100 %', () => {
    const w = normaliseerWeging({ prijs: 60, co2: 20, kwaliteit: 10, sr: 10 });
    expect(w.prijs).toBeCloseTo(60);
    const w2 = normaliseerWeging({ prijs: 30, co2: 30, kwaliteit: 0 });
    expect(w2.prijs).toBeCloseTo(50);
    expect(Object.values(w2).reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });

  it('geeft gelijke weging als alles op 0 staat en telt negatief als 0', () => {
    expect(normaliseerWeging({ a: 0, b: 0, c: 0, d: 0 }).c).toBe(25);
    expect(normaliseerWeging({ a: -10, b: 10 }).b).toBe(100);
    expect(normaliseerWeging({})).toEqual({});
  });

  it('rondt af op hele procenten die samen 100 zijn', () => {
    const r = rondAfOp100(normaliseerWeging({ a: 1, b: 1, c: 1 }));
    expect(Object.values(r).reduce((s, x) => s + x, 0)).toBe(100);
    expect(Object.values(r).sort()).toEqual([33, 33, 34]);
    expect(rondAfOp100({ a: 50, b: 50 })).toEqual({ a: 50, b: 50 });
  });

  it('signaleert een scheve verhouding tussen prijs en kwaliteit', () => {
    expect(prijsSignaal(100, 0)).toBe('alleen-prijs');
    expect(prijsSignaal(92, 2)).toBe('zeer-zwaar');
    expect(prijsSignaal(0, 3)).toBe('geen-prijs');
    expect(prijsSignaal(50, 3)).toBeNull();
  });
});

describe('geraamde waarde en drempel', () => {
  it('rekent volume × tarief × totale looptijd', () => {
    expect(geraamdeWaarde({ volumePerJaar: 40000, tarief: 100, looptijdJaren: 5, verlengingJaren: 2 })).toBe(28000000);
    expect(geraamdeWaarde({ volumePerJaar: 40000, tarief: null, looptijdJaren: 5, verlengingJaren: 2 })).toBeNull();
  });

  it('toetst aan het drempelbedrag, gelijk aan de drempel is Europees', () => {
    expect(drempels.decentraal.bedrag).toBe(216000);
    expect(drempels.centraal.bedrag).toBe(140000);
    expect(drempels.speciaal.bedrag).toBe(432000);
    expect(drempelToets(216000, 216000)!.europees).toBe(true);
    expect(drempelToets(215999, 216000)!.europees).toBe(false);
    expect(drempelToets(null, 216000)).toBeNull();
    expect(drempelToets(432000, 216000)!.factor).toBe(2);
  });
});

describe('criteria per afvalstroom', () => {
  it('heeft unieke id’s en voor elke stroom eisen en gunningscriteria', () => {
    const ids = criteria.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of stroomLijst) {
      const lijst = criteriaVoorStroom(s.id);
      expect(lijst.some((c) => c.soort === 'eis'), s.id).toBe(true);
      expect(lijst.some((c) => c.soort === 'gunning'), s.id).toBe(true);
    }
  });

  it('verwijst naar bestaande MVI-codes met een link naar de MVI-criteriatool', () => {
    for (const c of criteria.filter((x) => x.mvi)) {
      expect(c.mvi!.code).toMatch(/^0\d\d\.0\d\d$/);
      expect(c.mvi!.bron.url).toMatch(/^https:\/\/www\.mvicriteria\.nl\/nl\/webtool\?product_group=\d+&cluster=\d+$/);
    }
    // de officiële MVI-criteria voor afval 049.001 t/m 049.015 zijn allemaal gekoppeld
    const codes = new Set(criteria.filter((c) => c.mvi?.code.startsWith('049')).map((c) => c.mvi!.code));
    for (let n = 1; n <= 15; n++) expect(codes.has(`049.${String(n).padStart(3, '0')}`)).toBe(true);
  });

  it('kiest standaard geen twee CO2-methoden tegelijk en geen aandachtspunten', () => {
    const sel = standaardSelectie('restafval');
    expect(sel).toContain('rest-co2-basis');
    expect(sel).not.toContain('rest-co2-detail');
    expect(sel.some((id) => criteria.find((c) => c.id === id)!.soort === 'aandachtspunt')).toBe(false);
  });

  it('geeft alleen een tariefkental waar een bron is', () => {
    expect(stromen.restafval.tariefKental!.waarde).toBe(103.35);
    expect(stromen.gft.tariefKental).toBeUndefined();
  });
});

describe('checklist', () => {
  const basis = {
    stroomNaam: 'GFT-afval',
    looptijdJaren: 4,
    verlengingJaren: 2,
    europees: true,
    gekozen: ['alg-volume'],
    prijsPct: 50,
    aantalKwaliteit: 2,
    dubbeleCo2Methode: false,
  };

  it('noemt de Europese procedure en ontbrekende indexering', () => {
    const l = checklist(basis);
    expect(l[0]).toContain('Europese procedure');
    expect(l.some((p) => p.includes('indexeringsclausule'))).toBe(true);
    expect(l.some((p) => p.includes('evaluatiemoment'))).toBe(true);
    expect(l.some((p) => p.includes('bandbreedte'))).toBe(false);
  });

  it('waarschuwt bij dubbele CO2-methode en zeer zware prijs', () => {
    const l = checklist({ ...basis, europees: null, dubbeleCo2Methode: true, prijsPct: 95, gekozen: ['alg-index'] });
    expect(l[0]).toContain('geraamd tarief');
    expect(l.some((p) => p.includes('CO2 dubbel'))).toBe(true);
    expect(l.some((p) => p.includes('90 % of meer'))).toBe(true);
    expect(l.some((p) => p.includes('indexeringsclausule'))).toBe(false);
  });
});

describe('export', () => {
  const o: Overzicht = {
    titel: 'Aanbesteding GFT-afval',
    datum: '2026-10-19',
    peildatum: '2026-10-19',
    opdracht: [['Afvalstroom', 'GFT-afval']],
    weging: [
      { label: 'Prijs', pct: 60 },
      { label: 'CO2-score; basis', pct: 40 },
    ],
    regels: [
      { id: 'a', soort: 'Eis', thema: 'Klimaat', titel: 'Eis A', tekst: 'Tekst "A"', herkomst: 'Voorbeeld KplusV' },
      { id: 'b', soort: 'Gunningscriterium', thema: 'Klimaat', titel: 'Criterium B', tekst: 'Tekst B', herkomst: 'MVI 049.006 (Significant)', link: 'https://www.mvicriteria.nl/', wegingPct: 40 },
    ],
    checklist: ['Punt 1'],
    bronnen: [{ titel: 'PIANOo', url: 'https://www.pianoo.nl/' }],
  };

  it('maakt CSV met weging, criteria en bronnen', () => {
    const csv = naarCsv(overzichtCsv(o));
    expect(csv).toContain('Prijs;60');
    expect(csv).toContain('"CO2-score; basis";40');
    expect(csv).toContain('Gunningscriterium;Klimaat;Criterium B;Tekst B;;40;MVI 049.006 (Significant);https://www.mvicriteria.nl/');
    expect(csv).toContain('"Tekst ""A"""');
  });

  it('maakt een leesbaar tekstbestand', () => {
    const t = overzichtTekst(o);
    expect(t).toContain('GUNNINGSCRITERIUM');
    expect(t).toContain('1. Criterium B (weging 40 %)');
    expect(t).toContain('[ ] Punt 1');
    expect(t).toContain('Herkomst: MVI 049.006 (Significant) – https://www.mvicriteria.nl/');
    expect(t.split('\r\n').length).toBeGreaterThan(15);
  });
});

describe('deellink', () => {
  const standaard: AanbestedingInvoer = {
    stroom: 'restafval',
    drempel: 'decentraal',
    volume: 40000,
    tarief: null,
    looptijd: 5,
    verlenging: 2,
    gekozen: standaardSelectie('restafval'),
    punten: { prijs: 50 },
  };
  const opties = {
    stromen: stroomLijst.map((s) => s.id),
    drempels: Object.keys(drempels),
    geldig: (s: string) => criteriaVoorStroom(s as never).map((c) => c.id),
  };

  it('zet de invoer om en terug', () => {
    const i: AanbestedingInvoer = { ...standaard, stroom: 'gft', tarief: 80.5, gekozen: ['gft-co2-basis', 'alg-index'], punten: { prijs: 60, 'gft-co2-basis': 20 } };
    const terug = aanbestedingUitParams(aanbestedingNaarParams(i), standaard, opties);
    expect(terug).toEqual(i);
  });

  it('negeert onbekende stromen, criteria en ongeldige getallen', () => {
    const t = aanbestedingUitParams(new URLSearchParams('stroom=kernafval&dienst=x&jr=99&sel=rest-r1,bestaatniet,gft-piek&w=prijs:200,rest-r1:10'), standaard, opties);
    expect(t.stroom).toBe('restafval');
    expect(t.drempel).toBe('decentraal');
    expect(t.looptijd).toBe(5);
    expect(t.gekozen).toEqual(['rest-r1']);
    expect(t.punten.prijs).toBe(50);
    expect(t.punten['rest-r1']).toBe(10);
  });

  it('houdt een leeg tarief leeg, ook als de standaardstroom een kental heeft', () => {
    const metKental: AanbestedingInvoer = { ...standaard, tarief: 103.35 };
    const i: AanbestedingInvoer = { ...metKental, stroom: 'gft', tarief: null, gekozen: ['gft-co2-basis'], punten: { prijs: 60 } };
    const p = aanbestedingNaarParams(i);
    expect(p.get('tarief')).toBe('');
    expect(aanbestedingUitParams(p, metKental, opties).tarief).toBeNull();
  });

  it('vult bij een andere stroom zonder selectie en tarief de standaard van die stroom in', () => {
    const metKental: AanbestedingInvoer = { ...standaard, tarief: 103.35 };
    const t = aanbestedingUitParams(new URLSearchParams('stroom=gft'), metKental, {
      ...opties,
      selectie: (s) => standaardSelectie(s as never),
      tarief: () => null,
    });
    expect(t.stroom).toBe('gft');
    expect(t.tarief).toBeNull();
    expect(t.gekozen).toEqual(standaardSelectie('gft'));
    expect(t.gekozen.length).toBeGreaterThan(3);
  });

  it('leest een oude link zonder tarief bij dezelfde stroom met het standaardtarief', () => {
    const metKental: AanbestedingInvoer = { ...standaard, tarief: 103.35 };
    expect(aanbestedingUitParams(new URLSearchParams('stroom=restafval&vol=1000'), metKental, opties).tarief).toBe(103.35);
    expect(aanbestedingUitParams(new URLSearchParams('vol=&jr='), metKental, opties).volume).toBe(40000);
  });
});
