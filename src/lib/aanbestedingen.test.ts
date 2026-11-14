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
import { soortDocument, soortenIn, vatDocumentenSamen } from '../../supabase/functions/ververs-aanbestedingen/documenten';
import { eindeUitLooptijd, parseBedrag, parseDatum, parseLooptijdMaanden, planningUitDetail, vatGunningSamen } from '../../supabase/functions/ververs-aanbestedingen/gunning';
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
    documenten_aantal: 0,
    documenten_soorten: [],
    gegund_aan: null,
    gunningsdatum: null,
    gunning_waarde: null,
    gunning_inschrijvingen: null,
    contract_start: null,
    contract_einde: null,
    contract_einde_afgeleid: null,
    contract_verlengingen: null,
    contract_verlenging_tekst: null,
    gunning_percelen: null,
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

describe('soort document (afgeleid van de bestandsnaam)', () => {
  const soort = (naam: string, cat?: string) => soortDocument(naam, cat);
  it('herkent de gangbare soorten', () => {
    expect(soort('Beschrijvend Document')).toBe('leidraad');
    expect(soort('Aanbestedingsleidraad GFT 2026.pdf')).toBe('leidraad');
    expect(soort('Bijlage 5_Programma van Eisen Calamiteiten inzet - perceel 2')).toBe('programma-van-eisen');
    expect(soort('Bestek inzameling')).toBe('programma-van-eisen');
    expect(soort('Bijlage 6_Concept Raamopvereenkomst')).toBe('overeenkomst');
    expect(soort('Conceptovereenkomst verwerking GFT')).toBe('overeenkomst');
    expect(soort('Bijlage 1_Algemene Inkoopvoorwaarden 2021')).toBe('voorwaarden');
    expect(soort('Beoordelingsmethodiek en gunningscriteria')).toBe('gunningscriteria');
    expect(soort('Nota van Inlichtingen 1')).toBe('nota-van-inlichtingen');
    expect(soort('Vragen en antwoorden ronde 2')).toBe('nota-van-inlichtingen');
    expect(soort('Bijlage 3_Prijzenblad Calamiteiten inzet perceel 2')).toBe('prijzenblad');
    expect(soort('Inschrijfbiljet')).toBe('prijzenblad');
    expect(soort('uea_624538_20261111152441')).toBe('uea');
    expect(soort('Eigen verklaring')).toBe('uea');
  });
  it('gebruikt de categorie van TenderNed', () => {
    expect(soort('iets onbekends', 'NVI')).toBe('nota-van-inlichtingen');
    expect(soort('TN624538 - EF16 Aankondiging van een opdracht', 'ANK')).toBe('aankondiging');
    expect(soort('Verslag bijeenkomst', 'MAC')).toBe('marktconsultatie');
  });
  it('wat niet herkend wordt heet overig', () => {
    expect(soort('Bijlage 9_SROI-verplichting')).toBe('overig');
    expect(soort('')).toBe('overig');
    expect(soortDocument(null)).toBe('overig');
  });
  it('de volgorde telt: een prijzenblad bij een overeenkomst blijft prijzenblad', () => {
    expect(soort('Prijzenblad bij de overeenkomst')).toBe('prijzenblad');
  });
});

describe('documentenlijst van TenderNed', () => {
  const antwoord = {
    documenten: [
      {
        documentId: 'a1',
        documentNaam: '  Beschrijvend   Document ',
        typeDocument: { code: 'PDF' },
        datumPublicatie: '2026-11-13',
        publicatieCategorie: { code: 'DOC' },
        grootte: 404048,
        links: { download: { href: '/papi/tenderned-rs-tns/v2/publicaties/1/documenten/2/content' } },
      },
      { documentId: 'a1', documentNaam: 'dubbel', links: { download: { href: '/papi/tenderned-rs-tns/x' } } },
      { documentId: 'a2', documentNaam: 'Zonder link' },
      { documentId: 'a3', documentNaam: 'Externe link', links: { download: { href: 'https://example.com/x.pdf' } } },
    ],
  };
  it('bewaart alleen metadata en een link naar TenderNed', () => {
    const rijen = vatDocumentenSamen(7, 1, antwoord);
    expect(rijen).toHaveLength(1);
    expect(rijen[0]).toMatchObject({
      kenmerk: 7,
      publicatie_id: 1,
      naam: 'Beschrijvend Document',
      soort: 'leidraad',
      bestandstype: 'pdf',
      datum: '2026-11-13',
      grootte: 404048,
      url: 'https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/1/documenten/2/content',
    });
    expect(Object.keys(rijen[0]).sort()).toEqual(
      ['bestandstype', 'categorie', 'datum', 'document_id', 'grootte', 'kenmerk', 'naam', 'publicatie_id', 'soort', 'url'].sort(),
    );
  });
  it('geeft een lege lijst bij onverwachte antwoorden', () => {
    expect(vatDocumentenSamen(1, 1, null)).toEqual([]);
    expect(vatDocumentenSamen(1, 1, { documenten: 'x' })).toEqual([]);
  });
  it('soortenIn geeft de soorten in vaste volgorde', () => {
    expect(soortenIn([{ soort: 'overig' }, { soort: 'leidraad' }, { soort: 'overig' }])).toEqual(['leidraad', 'overig']);
  });
});

describe('gunning uit de aankondiging', () => {
  it('leest bedragen, datums en looptijd', () => {
    expect(parseBedrag('256 458,4 Euro')).toBe(256458.4);
    expect(parseBedrag('950 000,00')).toBe(950000);
    expect(parseBedrag('-')).toBeNull();
    expect(parseDatum('09/07/2024')).toBe('2024-07-09');
    expect(parseDatum('geen')).toBeNull();
    expect(parseLooptijdMaanden('48 Maand')).toBe(48);
    expect(parseLooptijdMaanden('4 Jaar')).toBe(48);
    expect(parseLooptijdMaanden('10 Dagen')).toBeNull();
    expect(eindeUitLooptijd('2025-01-01', 24)).toBe('2026-12-31');
  });
  it('planning uit de detailpagina', () => {
    expect(planningUitDetail({ aanvangOpdrachtDatum: '2027-03-01', voltooiingOpdrachtDatum: '2029-02-28' })).toEqual({ start: '2027-03-01', einde: '2029-02-28' });
    expect(planningUitDetail({})).toEqual({ start: null, einde: null });
  });

  const rij = (l: string, w: string) => `<tr><td><span class="label">${l}</span><span class="text">: </span></td><td><span class="value">${w}</span></td></tr>`;
  const kop = (t: string) => `<tr class="header2"><th colspan="2">${t}</th></tr>`;
  const eforms = `<table lang="nl"><tbody>
    ${kop('5.1 Technische ID van het kavel: LOT-0001')}${rij('Titel', 'Perceel 1')}
    ${kop('5.1.3 Geraamde duur')}${rij('Begindatum', '01/01/2025')}${rij('Looptijd', '24 Maand')}
    ${kop('5.1.4 Verlenging')}${rij('Maximumaantal verlengingen', '3')}${rij('Overige informatie over verlengingen', '3x1 jaar')}
    <tr class="header1"><th colspan="2">6. Resultaten</th></tr>${rij('Waarde van alle contracten toegekend in deze kennisgeving', '1 Euro')}
    ${kop('6.1 ID resultaat perceel: LOT-0001')}${kop('6.1.2 Informatie over winnaars')}
    ${rij('Officiële naam', 'Attero BV')}${rij('Waarde van de aanbesteding', '1 500 000 Euro')}${rij('Datum van sluiting van het contract', '09/07/2024')}
    ${kop('6.1.4 Statistische informatie')}${rij('Type van de ontvangen inschrijvingen', 'Elektronisch ingediende inschrijvingen')}${rij('Aantal ontvangen inschrijvingen of verzoeken tot deelname', '2')}
    ${rij('Type van de ontvangen inschrijvingen', 'Inschrijvingen')}${rij('Aantal ontvangen inschrijvingen of verzoeken tot deelname', '3')}
    <tr class="header1"><th colspan="2">8. Organisaties</th></tr>${kop('8.1 ORG-0002')}${rij('Officiële naam', 'Niet meenemen BV')}${rij('Contactpunt', 'Jan Jansen')}${rij('E-mail', 'jan@example.com')}
  </tbody></table>`;
  it('leest een eForms-gunning zonder contactgegevens', () => {
    const g = vatGunningSamen({ html: eforms });
    expect(g).not.toBeNull();
    expect(g!.formaat).toBe('eforms');
    expect(g!.gegund_aan).toEqual(['Attero BV']);
    expect(g!.gunningsdatum).toBe('2024-07-09');
    expect(g!.waarde_totaal).toBe(1500000);
    expect(g!.aantal_inschrijvingen).toBe(3);
    expect(g!.looptijd_einde).toBe('2026-12-31');
    expect(g!.einde_afgeleid).toBe(true);
    expect(g!.verlengingen_max).toBe(3);
    expect(g!.verlenging_tekst).toBe('3x1 jaar');
    expect(JSON.stringify(g)).not.toMatch(/Jansen|example\.com|Niet meenemen/);
  });
  it('invulwaarden van 1 euro worden niet getoond', () => {
    const g = vatGunningSamen({ html: eforms.replace('1 500 000 Euro', '1 Euro') });
    expect(g!.waarde_totaal).toBeNull();
  });
  it('leest het oude standaardformulier', () => {
    const sf = `<div><h3>Afdeling V: <span>Gunning van een opdracht</span></h3><p><span>Opdracht nr.: </span>1<br /><span>Perceel nr.: </span>-<br /><span>Benaming: </span>Glas</p>
      <p>Een opdracht/perceel wordt gegund: ja</p><p>Datum van de sluiting van de overeenkomst: </p><p>15/11/2023</p><p>Aantal inschrijvingen: 3</p>
      <dl><dt>Officiële benaming:</dt><dd>Glasrecycling B.V.</dd><dt>Nationale identificatie:</dt><dd>1</dd><dt>E-mail:</dt><dd>x@y.nl</dd></dl>
      <p>Totale waarde van de opdracht/het perceel: 950 000,00</p><h3>Afdeling VI: <span>Aanvullend</span></h3><dl><dt>Officiële benaming:</dt><dd>Rechtbank</dd></dl></div>`;
    const g = vatGunningSamen({ html: sf });
    expect(g!.formaat).toBe('sf03');
    expect(g!.gegund_aan).toEqual(['Glasrecycling B.V.']);
    expect(g!.gunningsdatum).toBe('2023-11-15');
    expect(g!.aantal_inschrijvingen).toBe(3);
    expect(g!.waarde_totaal).toBe(950000);
    expect(g!.looptijd_einde).toBeNull();
  });
  it('geeft null zonder winnaar of bij onverwachte invoer', () => {
    expect(vatGunningSamen({ html: '<table><tbody></tbody></table> '.repeat(3) })).toBeNull();
    expect(vatGunningSamen(null)).toBeNull();
    expect(vatGunningSamen({ html: 5 })).toBeNull();
  });
});

describe('filters in de URL: documenten, partij en afloop', () => {
  it('leest en schrijft de nieuwe filters en negeert onzin', () => {
    const f = filtersUitUrl(new URLSearchParams('soort=overeenkomst&partij=Renewi&afloop=2027'));
    expect(f).toMatchObject({ soort: 'overeenkomst', partij: 'Renewi', afloop: '2027' });
    expect(filtersNaarUrl(f).toString()).toBe('soort=overeenkomst&partij=Renewi&afloop=2027');
    expect(filtersUitUrl(new URLSearchParams('soort=onzin&afloop=abc'))).toMatchObject({ soort: '', afloop: '' });
  });
});
