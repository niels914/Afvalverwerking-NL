import { describe, expect, it } from 'vitest';
import {
  afvalstromen,
  bouwAanbesteding,
  diensten,
  provincies,
  statusBasis,
  statusOp,
  vatDetailSamen,
  type TnsLijstPublicatie,
} from '../../supabase/functions/ververs-aanbestedingen/afleiding';
import { dagenTot, filtersNaarUrl, filtersUitUrl, LEGE_FILTERS, sluitingTijd, vandaagNl } from './aanbestedingen';

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
    expect(afvalstromen(['90513600-1'], '')).toEqual(['Slib']);
  });

  it('bij algemene CPV-codes tellen trefwoorden in de tekst', () => {
    expect(afvalstromen(['90510000-5'], 'Inzameling en verwerking van GFT-afval en groenafval')).toEqual(['GFT en etensresten', 'Groenafval']);
    expect(afvalstromen(['90500000-2'], 'Verwerking van PMD en drankkartons')).toEqual(['PMD en kunststof']);
  });

  it('"niet-gevaarlijk afval" telt niet als gevaarlijk afval', () => {
    expect(afvalstromen(['90510000-5'], 'Verwerking van niet-gevaarlijk afval')).toEqual(['Niet te bepalen']);
    expect(afvalstromen(['90510000-5'], 'Inzameling van gevaarlijk afval')).toEqual(['Gevaarlijk afval']);
  });

  it('glasvezel is geen glas', () => {
    expect(afvalstromen([], 'Aanleg glasvezel')).toEqual(['Niet te bepalen']);
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
    const f = { ...LEGE_FILTERS, zoek: 'restafval', provincie: 'landelijk', sortering: 'sluiting-op' as const, pagina: 3 };
    expect(filtersUitUrl(filtersNaarUrl(f))).toEqual(f);
  });
});

describe('weergave', () => {
  it('tijd en dagen tot sluiting', () => {
    expect(sluitingTijd('2026-12-15T09:05:00')).toBe('09:05');
    expect(dagenTot('2026-12-15T12:00:00', '2026-10-26')).toBe(50);
    expect(dagenTot('2026-10-26T23:59:59', '2026-10-26')).toBe(0);
  });
  it('vandaag in Nederlandse tijd', () => {
    expect(vandaagNl(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27');
  });
});
