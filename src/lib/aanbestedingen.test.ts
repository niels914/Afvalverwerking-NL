import { describe, expect, it } from 'vitest';
import {
  afvalstromen,
  bouwAanbesteding,
  diensten,
  isMarktconsultatieTekst,
  provincies,
  provinciesUitOpdrachtgever,
  statusBasis,
  statusOp,
  vatDetailSamen,
  type TnsLijstPublicatie,
} from '../../supabase/functions/ververs-aanbestedingen/afleiding';
import { GEMEENTE_PROVINCIE } from '../../supabase/functions/ververs-aanbestedingen/gemeenten';
import {
  dagenTot,
  filtersNaarUrl,
  filtersUitUrl,
  LEGE_FILTERS,
  maakCsv,
  procedureAfbreekbaar,
  sluitingTijd,
  tijdstempel,
  vandaagNl,
  type AanbestedingRegel,
} from './aanbestedingen';

// Publicaties in de vorm van de TenderNed-webservice (velden ingekort).
const pub = (id: number, datum: string, type: string, extra: Partial<TnsLijstPublicatie> = {}): TnsLijstPublicatie => ({
  publicatieId: String(id),
  kenmerk: 620579,
  publicatieDatum: datum,
  typePublicatie: { code: type },
  aanbestedingNaam: 'Afvalverzameling en -verwerking',
  opdrachtgeverNaam: 'N.V. Waterbedrijf Groningen',
  procedure: { code: 'OPE', omschrijving: 'Openbaar' },
  typeOpdracht: { code: 'D', omschrijving: 'Diensten' },
  europees: true,
  publicatiestatus: { code: 'PUB' },
  ...extra,
});

describe('afvalstroom en dienst uit CPV en tekst', () => {
  it('specifieke CPV-codes bepalen de stroom', () => {
    expect(afvalstromen(['90511400-6'], '')).toEqual(['Papier en karton']);
    expect(afvalstromen(['90524400-0'], '')).toEqual(['Medisch afval']);
    expect(afvalstromen(['90513600-1'], '')).toEqual(['Slib en septictanks']);
  });

  it('bij algemene CPV-codes tellen trefwoorden in de tekst', () => {
    expect(afvalstromen(['90510000-5'], 'Inzameling en verwerking van GFT-afval en groenafval')).toEqual(['GFT en etensresten', 'Groenafval']);
    expect(afvalstromen(['90500000-2'], 'Verwerking van PMD en drankkartons')).toEqual(['PMD en kunststof']);
  });

  it('"niet-gevaarlijk afval" telt niet als gevaarlijk afval', () => {
    expect(afvalstromen(['90510000-5'], 'Verwerking van niet-gevaarlijk afval')).toEqual(['Niet gespecificeerd']);
    expect(afvalstromen(['90510000-5'], 'Inzameling van gevaarlijk afval')).toEqual(['Gevaarlijk afval']);
    expect(afvalstromen(['90510000-5'], 'Verwerking van niet\u2011gevaarlijk afval')).toEqual(['Niet gespecificeerd']);
  });

  it('glasvezel is geen glas', () => {
    expect(afvalstromen([], 'Aanleg glasvezel')).toEqual(['Niet gespecificeerd']);
  });

  it('soort dienst', () => {
    expect(diensten(['90511000-2', '90513000-6'])).toEqual(['Inzameling', 'Verwerking']);
    expect(diensten(['90500000-2', '90510000-5'])).toEqual(['Algemeen']);
    expect(diensten(['90533000-2'])).toEqual(['Stortplaats']);
  });
});

describe('provincie uit NUTS', () => {
  it('kent de indeling van 2021 en 2024', () => {
    expect(provincies(['NL310'])).toEqual(['Utrecht']);
    expect(provincies(['NL35'])).toEqual(['Utrecht']);
    expect(provincies(['NL33A', 'NL36'])).toEqual(['Zuid-Holland']);
    expect(provincies(['NL112', 'NL42'])).toEqual(['Groningen', 'Limburg']);
  });
  it('alleen NL is landelijk of niet vermeld', () => {
    expect(provincies(['NL'])).toEqual([]);
    expect(provincies([])).toEqual([]);
  });
});

describe('status', () => {
  it('gunning na aankondiging = gegund', () => {
    expect(statusBasis([pub(1, '2026-01-01', 'AAO'), pub(2, '2026-04-01', 'AGO')])).toBe('gegund');
  });
  it('beëindiging na aankondiging = beëindigd', () => {
    expect(statusBasis([pub(1, '2026-01-01', 'AAO'), pub(2, '2026-02-01', 'VBE')])).toBe('beeindigd');
  });
  it('de laatste beslissende publicatie telt', () => {
    expect(statusBasis([pub(1, '2026-01-01', 'VBE'), pub(2, '2026-04-01', 'AGO')])).toBe('gegund');
  });
  it('ingetrokken publicaties tellen niet mee', () => {
    expect(statusBasis([pub(1, '2026-01-01', 'AAO'), pub(2, '2026-04-01', 'AGO', { publicatiestatus: { code: 'INT' } })])).toBe('aankondiging');
    expect(statusBasis([pub(1, '2026-01-01', 'AAO', { publicatiestatus: { code: 'INT' } })])).toBe('ingetrokken');
  });
  it('alleen marktconsultatie of vooraankondiging', () => {
    expect(statusBasis([pub(1, '2026-01-01', 'MAC')])).toBe('marktconsultatie');
    expect(statusBasis([pub(1, '2026-01-01', 'VAK'), pub(2, '2026-01-02', 'MAC')])).toBe('vooraankondiging');
  });
  it('open of gesloten hangt af van de sluitingsdatum (Nederlandse tijd)', () => {
    expect(statusOp('aankondiging', '2026-12-15T12:00:00', '2026-12-15T11:59:00')).toBe('open');
    expect(statusOp('aankondiging', '2026-12-15T12:00:00', '2026-12-15T12:00:01')).toBe('gesloten');
    expect(statusOp('aankondiging', null, '2026-12-15T12:00:00')).toBe('onbekend');
    expect(statusOp('gegund', '2030-01-01T00:00:00', '2026-12-15T12:00:00')).toBe('gegund');
  });
});

describe('bouwAanbesteding', () => {
  const detail = vatDetailSamen({
    publicatieId: 446087,
    cpvCodes: [
      { isHoofdOpdracht: false, code: '90000000-7', omschrijving: 'Diensten inzake afvalwater, afval, reiniging en milieu' },
      { isHoofdOpdracht: true, code: '90510000-5', omschrijving: 'Afvalverzameling en -verwerking' },
    ],
    nutsCodes: [{ code: 'NL112' }],
    trefwoord1: 'Bedrijfsafval',
    trefwoord2: '',
  });

  it('voegt publicaties met hetzelfde kenmerk samen', () => {
    const a = bouwAanbesteding(
      [
        pub(2, '2026-03-01', 'REC', { sluitingsDatum: '2026-12-20T12:00:00', aanbestedingNaam: 'Afvalverzameling (gewijzigd)' }),
        pub(1, '2026-02-01', 'AAO', { sluitingsDatum: '2026-12-15T12:00:00', tsenderNaam: 'Mercell', tsenderLink: 'https://s2c.mercell.com/today/1' }),
      ],
      detail,
    );
    expect(a.publicatiedatum).toBe('2026-02-01');
    expect(a.laatste_publicatie).toBe('2026-03-01');
    expect(a.sluitingsdatum).toBe('2026-12-20T12:00:00'); // rectificatie verlengt
    expect(a.sluiting_tijd_bekend).toBe(true);
    expect(a.titel).toBe('Afvalverzameling (gewijzigd)');
    expect(a.tenderned_url).toBe('https://www.tenderned.nl/aankondigingen/overzicht/1');
    expect(a.cpv_hoofd).toBe('90510000-5');
    expect(a.provincies).toEqual(['Groningen']);
    expect(a.stromen).toEqual(['Bedrijfsafval']);
    expect(a.diensten).toEqual(['Algemeen']);
    expect(a.trefwoorden).toEqual(['Bedrijfsafval']);
    expect(a.publicaties.map((p) => p.type)).toEqual(['AAO', 'REC']);
    expect(a.tsender_url).toBe('https://s2c.mercell.com/today/1');
  });

  it('marktconsultatie: alleen een datum, geen tijd', () => {
    const a = bouwAanbesteding([pub(5, '2026-10-26', 'MAC', { sluitingsDatumMarktconsultatie: '2026-11-12', procedure: { code: 'NA' } })]);
    expect(a.sluitingsdatum).toBe('2026-11-12T23:59:59');
    expect(a.sluiting_tijd_bekend).toBe(false);
    expect(a.procedure).toBe('Niet vermeld');
    expect(a.diensten).toEqual([]);
  });

  it('weigert onveilige links naar externe platforms', () => {
    const a = bouwAanbesteding([pub(1, '2026-02-01', 'AAO', { tsenderLink: 'javascript:alert(1)' })]);
    expect(a.tsender_url).toBeNull();
  });
});

describe('filters in de URL', () => {
  it('leest ?zoek= en geldige filters, negeert onzin', () => {
    const f = filtersUitUrl(new URLSearchParams('zoek=gft%20utrecht&stroom=Glas&status=open&provincie=Mars&sortering=x&pagina=-3'));
    expect(f).toEqual({ ...LEGE_FILTERS, zoek: 'gft utrecht', stroom: 'Glas', status: 'open' });
  });
  it('laat standaardwaarden weg en is omkeerbaar', () => {
    expect(filtersNaarUrl(LEGE_FILTERS).toString()).toBe('');
    const f = { ...LEGE_FILTERS, zoek: 'restafval', provincie: 'landelijk', hoofd: true, sortering: 'laatste-nieuw' as const, pagina: 3 };
    expect(filtersUitUrl(filtersNaarUrl(f))).toEqual(f);
  });
});

describe('weergave', () => {
  it('tijd en dagen tot sluiting', () => {
    expect(sluitingTijd('2026-12-15T09:05:00')).toBe('09:05');
    expect(dagenTot('2026-12-15T12:00:00', '2026-10-26')).toBe(50);
    expect(dagenTot('2026-10-26T23:59:59', '2026-10-26')).toBe(0);
  });
  it('tijdstempel zonder dubbel "om"', () => {
    expect(tijdstempel('2026-10-26T19:47:00Z')).toBe('26 oktober 2026 om 20:47');
  });
  it('vandaag in Nederlandse tijd', () => {
    expect(vandaagNl(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27');
  });
});

describe('afvalstroom: juridische formuleringen en monostromen', () => {
  it('"op grond van" is geen grond', () => {
    expect(afvalstromen([], 'Op grond van artikel 2.32 Aanbestedingswet')).toEqual(['Niet gespecificeerd']);
    expect(afvalstromen([], 'Verwerking van grond, gips en dakleer')).toEqual(['Grond en baggerspecie', 'Overige monostromen']);
  });
  it('matrassen, milieustraat en luiers', () => {
    expect(afvalstromen([], 'Afvoer en verwerking van matrassen')).toEqual(['Matrassen']);
    expect(afvalstromen([], 'Exploitatie milieustraat gemeente X')).toEqual(['Milieustraat']);
    expect(afvalstromen([], 'Recycling luier- en incontinentiemateriaal')).toEqual(['Luiers en incontinentiemateriaal']);
  });
});

describe('marktconsultatie die als aankondiging is gepubliceerd (ronde 2)', () => {
  it('Rotterdam 618943: aankondiging opdracht met "Marktconsultatie" in de titel is geen open inschrijving', () => {
    const ps = [
      pub(444827, '2026-10-17', 'AAO', {
        kenmerk: 618943,
        aanbestedingNaam: '8-D-82288-26 Marktconsultatie Verwerking huishoudelijk restafval',
        opdrachtBeschrijving: 'Ter voorbereiding op de voorgenomen aanbesteding organiseert de gemeente Rotterdam een marktconsultatie. Daarna volgt de aanbesteding.',
        sluitingsDatum: '2026-11-17T10:00:03',
      }),
    ];
    expect(statusBasis(ps)).toBe('marktconsultatie');
    const a = bouwAanbesteding(ps);
    expect(a.status_basis).toBe('marktconsultatie');
    expect(statusOp(a.status_basis, a.sluitingsdatum, '2026-10-27T12:00:00')).toBe('marktconsultatie');
  });
  it('herkent de omschrijving, ook zonder titel', () => {
    expect(isMarktconsultatieTekst('Verwerking restafval', 'Ter voorbereiding organiseert de gemeente een marktconsultatie.')).toBe(true);
    expect(isMarktconsultatieTekst('Market consultation phosphate recovery')).toBe(true);
    expect(isMarktconsultatieTekst('Marktverkenning hergebruik ICT')).toBe(true);
    expect(isMarktconsultatieTekst('RFI inzameling textiel')).toBe(true);
  });
  it('een aanbesteding die naar een eerdere marktconsultatie verwijst blijft een aanbesteding', () => {
    expect(isMarktconsultatieTekst('Inzameling GFT', 'Na de marktconsultatie van maart start de gemeente deze openbare aanbesteding.')).toBe(false);
    expect(isMarktconsultatieTekst('Open house: inzameling scheepsafval')).toBe(false);
    expect(statusBasis([pub(1, '2026-01-01', 'AAO', { aanbestedingNaam: 'Inzameling GFT' })])).toBe('aankondiging');
  });
  it('vooraankondiging met "Marktconsultatie" in de titel telt als marktconsultatie', () => {
    expect(statusBasis([pub(1, '2026-01-01', 'VAK', { aanbestedingNaam: 'Marktconsultatie slibtransport' })])).toBe('marktconsultatie');
  });
  it('een gunning gaat voor', () => {
    expect(statusBasis([pub(1, '2026-01-01', 'AAO', { aanbestedingNaam: 'Marktconsultatie X' }), pub(2, '2026-03-01', 'AGO')])).toBe('gegund');
  });
});

describe('provincie uit de opdrachtgever (CBS-gemeenten)', () => {
  const p = (naam: string) => provinciesUitOpdrachtgever(naam, GEMEENTE_PROVINCIE);
  it('"Gemeente X", ook met afdeling of hoofdletters', () => {
    expect(p('Gemeente Losser')).toEqual(['Overijssel']);
    expect(p('Gemeente Amsterdam, Ingenieursbureau')).toEqual(['Noord-Holland']);
    expect(p("gemeente 's-Hertogenbosch")).toEqual(['Noord-Brabant']);
    expect(p('Gemeente Den Haag')).toEqual(['Zuid-Holland']);
    expect(p('Gemeente Súdwest-Fryslân')).toEqual(['Fryslân']);
    expect(p('Gemeente Alphen aan den Rijn')).toEqual(['Zuid-Holland']);
    expect(p('Gemeente Utrechtse Heuvelrug')).toEqual(['Utrecht']);
  });
  it('opsommingen en meerdere gemeenten', () => {
    expect(p('RID De Liemers namens de gemeente Duiven, Westervoort en Zevenaar')).toEqual(['Gelderland']);
    expect(p('Gemeente Etten-Leur en Gemeente Breda (waarbij gemeente Etten-Leur penvoerder is)')).toEqual(['Noord-Brabant']);
  });
  it('provincie als opdrachtgever', () => {
    expect(p('Provincie Fryslân')).toEqual(['Fryslân']);
    expect(p('Provincie Limburg')).toEqual(['Limburg']);
  });
  it('geen gok bij organisaties zonder gemeentenaam', () => {
    expect(p('Twente Milieu N.V.')).toEqual([]);
    expect(p('Vereniging van Nederlandse Gemeenten')).toEqual([]);
    expect(p('MijnGemeenteDichtbij')).toEqual([]);
    expect(p('Gemeente Rheden, gemeentehuis')).toEqual(['Gelderland']);
  });
  it('NUTS gaat voor; anders opdrachtgever, met bron', () => {
    const zonderNuts = bouwAanbesteding([pub(1, '2026-01-01', 'AAO', { opdrachtgeverNaam: 'Gemeente Losser' })], null, GEMEENTE_PROVINCIE);
    expect(zonderNuts.provincies).toEqual(['Overijssel']);
    expect(zonderNuts.provincie_bron).toBe('opdrachtgever');
    const metNuts = bouwAanbesteding(
      [pub(1, '2026-01-01', 'AAO', { opdrachtgeverNaam: 'Gemeente Losser' })],
      { publicatieId: 1, cpv: [], nuts: ['NL42'], trefwoorden: [] },
      GEMEENTE_PROVINCIE,
    );
    expect(metNuts.provincies).toEqual(['Limburg']);
    expect(metNuts.provincie_bron).toBe('nuts');
  });
});

describe('afvalstroom: afvalbakken (ronde 2)', () => {
  it('afvalscheidingsunits in een gebouw zijn geen zwerfafval', () => {
    expect(afvalstromen(['90510000-5'], 'Vooraankondiging Afvalscheidingsunits TU Delft Afvalbakken')).toEqual(['Containers en inzamelmiddelen']);
  });
  it('afvalbakken in de openbare ruimte wel', () => {
    expect(afvalstromen([], 'Digitaliseren (straat) afvalbakken openbare ruimte')).toContain('Zwerfafval en straatreiniging');
    expect(afvalstromen([], 'Beheer hondenafvalbakken')).toContain('Zwerfafval en straatreiniging');
  });
});

describe('CSV en weergave (ronde 2)', () => {
  const regel: AanbestedingRegel = {
    kenmerk: 1,
    titel: 'Inzameling "GFT"; papier',
    opdrachtgever: 'Gemeente Losser',
    omschrijving: null,
    procedure: 'Openbaar',
    type_opdracht: 'Diensten',
    europees: true,
    publicatiedatum: '2026-10-01',
    laatste_publicatie: '2026-10-01',
    sluitingsdatum: '2026-11-03T12:00:00',
    sluiting_tijd_bekend: true,
    tenderned_url: 'https://www.tenderned.nl/aankondigingen/overzicht/1',
    tsender_naam: null,
    tsender_url: null,
    cpv_hoofd: '90513000-6',
    cpv_hoofd_omschrijving: 'Diensten voor het verwerken en storten van niet-gevaarlijk afval en vuilnis',
    provincies: ['Overijssel'],
    provincie_bron: 'opdrachtgever',
    stromen: ['GFT en etensresten', 'Papier en karton'],
    diensten: ['Verwerking'],
    publicaties: [],
    status: 'open',
    afval_hoofd: true,
  };
  it('CSV met puntkomma, BOM en ontsnapte aanhalingstekens', () => {
    const csv = maakCsv([regel]);
    expect(csv.startsWith('\uFEFFKenmerk;Opdrachtgever;Titel')).toBe(true);
    expect(csv).toContain('1;Gemeente Losser;"Inzameling ""GFT""; papier";GFT en etensresten, Papier en karton;Openbaar;2026-10-01;2026-11-03 12:00;Open voor inschrijving;Overijssel;');
  });
  it('lange procedurenamen kunnen afbreken', () => {
    expect(procedureAfbreekbaar('Onderhandelingsprocedure zonder voorafgaande oproep tot mededinging')).toBe('Onderhandelings\u00ADprocedure zonder voorafgaande oproep tot mededinging');
    expect(procedureAfbreekbaar('Openbaar')).toBe('Openbaar');
  });
});
