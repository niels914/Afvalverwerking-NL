import { describe, expect, it } from 'vitest';
import { AANMELD_FORMULIER, aanmeldVelden } from '../../data/lidmaatschap';
import {
  berekening,
  codeer,
  controleerAkkoord,
  controleerGegevens,
  formulierVelden,
  isBtwId,
  isKvk,
  isOin,
  isPeppolId,
  isPostcode,
  isTelefoon,
  legeAanmelding,
  leesDomeinen,
  aanvullendeVelden,
  mailtoMetVelden,
  MAILTO_MAX,
  normaliseerPostcode,
  prijsStand,
  veldenStap1,
  type AanmeldGegevens,
} from './aanmelding';

const vandaag = '2026-10-15';

function geldig(extra: Partial<AanmeldGegevens> = {}): AanmeldGegevens {
  return {
    ...legeAanmelding('2026-11-01'),
    organisatie: 'Afvalsamenwerking Voorbeeld',
    type: 'samenwerkingsverband',
    aantal_gemeenten: '3',
    kvk: '12345678',
    factuur_adres: 'Postbus 100',
    factuur_postcode: '1234ab',
    factuur_plaats: 'Voorbeeldstad',
    crediteuren_email: 'Facturen@Voorbeeld.nl',
    contact_naam: 'J. de Vries',
    contact_email: 'j.devries@voorbeeld.nl',
    toegang: '@voorbeeld.nl, gemeente-a.nl',
    ...extra,
  };
}

describe('nummers', () => {
  it('KVK-nummer: 8 cijfers, spaties en punten mogen', () => {
    expect(isKvk('12345678')).toBe(true);
    expect(isKvk('12 34 56 78')).toBe(true);
    expect(isKvk('1234567')).toBe(false);
    expect(isKvk('1234567a')).toBe(false);
  });
  it('btw-id: NL + 9 cijfers + B + 2 cijfers', () => {
    expect(isBtwId('NL123456789B01')).toBe(true);
    expect(isBtwId('nl 1234.56789 b01')).toBe(true);
    expect(isBtwId('NL12345678B01')).toBe(false);
    expect(isBtwId('BE0123456789')).toBe(false);
  });
  it('OIN: 20 cijfers', () => {
    expect(isOin('00000001234567890000')).toBe(true);
    expect(isOin('0000000123456789000')).toBe(false);
  });
  it('postcode en telefoon', () => {
    expect(isPostcode('1234 AB')).toBe(true);
    expect(isPostcode('1234ab')).toBe(true);
    expect(isPostcode('0123 AB')).toBe(false);
    expect(normaliseerPostcode('1234ab')).toBe('1234 AB');
    expect(isTelefoon('030 123 45 67')).toBe(true);
    expect(isTelefoon('+31 (0)30-1234567')).toBe(true);
    expect(isTelefoon('12345')).toBe(false);
  });
  it('Peppol-ID: schema:nummer', () => {
    expect(isPeppolId('0106:12345678')).toBe(true);
    expect(isPeppolId('12345678')).toBe(false);
  });
});

describe('leesDomeinen', () => {
  it('leest domeinen in verschillende schrijfwijzen en ontdubbelt', () => {
    expect(leesDomeinen('@a-b.nl, iemand@c.nl;\nA-B.nl d.example.org').domeinen).toEqual(['a-b.nl', 'c.nl', 'd.example.org']);
  });
  it('weigert openbare maildomeinen', () => {
    const d = leesDomeinen('gemeente.nl gmail.com');
    expect(d.publiek).toEqual(['gmail.com']);
    expect(d.domeinen).toEqual(['gemeente.nl']);
  });
  it('meldt ongeldige domeinen', () => {
    expect(leesDomeinen('gemeente').ongeldig).toEqual(['gemeente']);
    expect(leesDomeinen('-x.nl').ongeldig).toEqual(['-x.nl']);
  });
});

describe('controleerGegevens', () => {
  it('een volledig ingevuld formulier is in orde', () => {
    expect(controleerGegevens(geldig(), vandaag)).toEqual({});
  });

  it('meldt alle verplichte velden bij een leeg formulier', () => {
    const f = controleerGegevens(legeAanmelding(), vandaag);
    for (const v of ['organisatie', 'type', 'kvk', 'factuur_adres', 'factuur_postcode', 'factuur_plaats', 'crediteuren_email', 'contact_naam', 'contact_email', 'toegang', 'startdatum']) {
      expect(f).toHaveProperty(v);
    }
    expect(f).not.toHaveProperty('btw_nummer');
    expect(f).not.toHaveProperty('oin');
    expect(f).not.toHaveProperty('inkoopordernummer');
  });

  it('btw-nummer is optioneel voor overheden, verplicht voor verwerkers', () => {
    expect(controleerGegevens(geldig({ type: 'gemeente' }), vandaag)).toEqual({});
    expect(controleerGegevens(geldig({ type: 'verwerker' }), vandaag)).toHaveProperty('btw_nummer');
    expect(controleerGegevens(geldig({ type: 'verwerker', btw_nummer: 'NL123456789B01' }), vandaag)).toEqual({});
    expect(controleerGegevens(geldig({ btw_nummer: 'NL123' }), vandaag)).toHaveProperty('btw_nummer');
  });

  it('samenwerkingsverband heeft minstens 2 gemeenten', () => {
    expect(controleerGegevens(geldig({ aantal_gemeenten: '' }), vandaag)).toHaveProperty('aantal_gemeenten');
    expect(controleerGegevens(geldig({ aantal_gemeenten: '1' }), vandaag)).toHaveProperty('aantal_gemeenten');
    expect(controleerGegevens(geldig({ aantal_gemeenten: 'drie' }), vandaag)).toHaveProperty('aantal_gemeenten');
    expect(controleerGegevens(geldig({ aantal_gemeenten: '343' }), vandaag).aantal_gemeenten).toMatch(/342/);
    expect(controleerGegevens(geldig({ aantal_gemeenten: '342' }), vandaag)).toEqual({});
    expect(controleerGegevens(geldig({ type: 'gemeente', aantal_gemeenten: '' }), vandaag)).toEqual({});
  });

  it('e-factuur via Peppol vraagt om Peppol-ID of OIN', () => {
    expect(controleerGegevens(geldig({ factuurvorm: 'peppol' }), vandaag)).toHaveProperty('peppol_id');
    expect(controleerGegevens(geldig({ factuurvorm: 'peppol', oin: '00000001234567890000' }), vandaag)).toEqual({});
    expect(controleerGegevens(geldig({ factuurvorm: 'peppol', peppol_id: '0106:12345678' }), vandaag)).toEqual({});
  });

  it('openbaar maildomein voor toegang is niet toegestaan', () => {
    expect(controleerGegevens(geldig({ toegang: 'gmail.com' }), vandaag).toegang).toMatch(/gmail\.com/);
  });

  it('startdatum in het verleden is niet toegestaan', () => {
    expect(controleerGegevens(geldig({ startdatum: '2026-10-01' }), vandaag)).toHaveProperty('startdatum');
  });

  it('offerte: toegangsdomeinen mogen nog leeg, ingevulde domeinen worden wel gecontroleerd', () => {
    expect(controleerGegevens(geldig({ soort: 'offerte', toegang: '' }), vandaag)).toEqual({});
    expect(controleerGegevens(geldig({ soort: 'offerte', toegang: 'gmail.com' }), vandaag)).toHaveProperty('toegang');
    expect(controleerGegevens(geldig({ soort: 'aanmelding', toegang: '' }), vandaag)).toHaveProperty('toegang');
  });

  it('offerte: alleen de privacyverklaring is nodig, nog geen akkoord met de voorwaarden', () => {
    expect(Object.keys(controleerAkkoord(geldig({ soort: 'offerte' })))).toEqual(['akkoord_privacy']);
    expect(controleerAkkoord(geldig({ soort: 'offerte', akkoord_privacy: true }))).toEqual({});
  });

  it('akkoord is verplicht', () => {
    expect(Object.keys(controleerAkkoord(geldig()))).toEqual(['akkoord_voorwaarden', 'akkoord_privacy']);
    expect(controleerAkkoord(geldig({ akkoord_voorwaarden: true, akkoord_privacy: true }))).toEqual({});
  });
});

describe('verzenden', () => {
  it('stuurt precies de velden van de verborgen formulierkopie', () => {
    const g = geldig({ akkoord_voorwaarden: true, akkoord_privacy: true });
    const b = berekening(g)!;
    const velden = formulierVelden(g, b, 'LID-20261015-ABCDE');
    expect(Object.keys(velden).sort()).toEqual([...aanmeldVelden].sort());
    expect(velden.staffel).toBe('samenwerkingsverband-klein');
    expect(velden.prijs_excl_btw).toBe('2500.00');
    expect(velden.prijs_incl_btw).toBe('3025.00');
    expect(velden.einddatum).toBe('2027-10-31');
    expect(velden.toegang).toBe('voorbeeld.nl, gemeente-a.nl');
    expect(velden.crediteuren_email).toBe('facturen@voorbeeld.nl');
    expect(velden.factuur_postcode).toBe('1234 AB');
    expect(velden.soort).toBe('aanmelding');
    expect(velden.akkoord_voorwaarden).toBe('ja');
  });

  it('offerteaanvraag: soort offerte, akkoord voorwaarden niet van toepassing', () => {
    const g = geldig({ soort: 'offerte', akkoord_privacy: true });
    const velden = formulierVelden(g, berekening(g)!, 'OFF-20261015-ABCDE');
    expect(velden.soort).toBe('offerte');
    expect(velden.akkoord_voorwaarden).toBe('nvt (offerte)');
    expect(velden.akkoord_privacy).toBe('ja');
  });

  it('codeert met formuliernaam en lege honeypot', () => {
    const body = new URLSearchParams(codeer({ organisatie: 'A & B' }));
    expect(body.get('form-name')).toBe(AANMELD_FORMULIER);
    expect(body.get('bot-field')).toBe('');
    expect(body.get('organisatie')).toBe('A & B');
  });
});

describe('verborgen formulierkopie in index.html', () => {
  it('bevat precies de velden die het formulier verstuurt', async () => {
    const { readFileSync } = await import('node:fs');
    const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf-8');
    const start = html.indexOf(`<form name="${AANMELD_FORMULIER}"`);
    expect(start).toBeGreaterThan(-1);
    const blok = html.slice(start, html.indexOf('</form>', start));
    expect(blok).toContain('netlify-honeypot="bot-field"');
    const namen = [...blok.matchAll(/name="([^"]+)"/g)].map((m) => m[1]).filter((n) => !['form-name', 'bot-field', AANMELD_FORMULIER].includes(n));
    expect(namen.sort()).toEqual([...aanmeldVelden].sort());
  });
});

describe('prijsStand (prijsblok tijdens het invullen)', () => {
  it('zonder type: vraagt om het type', () => {
    const p = prijsStand(geldig({ type: '' }));
    expect(p.soort).toBe('leeg');
    if (p.soort === 'leeg') expect(p.melding).toMatch(/type organisatie/);
  });

  it('gemeente en verwerker: direct de prijs', () => {
    const p = prijsStand(geldig({ type: 'verwerker' }));
    expect(p.soort).toBe('prijs');
    if (p.soort === 'prijs') {
      expect(p.staffel.id).toBe('verwerker');
      expect(p.prijs.inclBtw).toBe(6655);
    }
  });

  it('samenwerkingsverband zonder aantal: beide prijzen en een vraag om het aantal', () => {
    const p = prijsStand(geldig({ aantal_gemeenten: '' }));
    expect(p.soort).toBe('bereik');
    if (p.soort === 'bereik') {
      expect(p.opties.map((o) => o.staffel.id)).toEqual(['samenwerkingsverband-klein', 'samenwerkingsverband-groot']);
      expect(p.melding).toMatch(/aantal deelnemende gemeenten/);
    }
  });

  it.each(['2.5', '1', 'abc', '0', '-3', '343', '500'])('ongeldig aantal gemeenten %s: melding over het aantal, niet over de startdatum', (aantal) => {
    const p = prijsStand(geldig({ aantal_gemeenten: aantal }));
    expect(p.soort).toBe('bereik');
    if (p.soort === 'bereik') {
      expect(p.melding).toMatch(/heel getal van 2 tot en met 342/);
      expect(p.melding).not.toMatch(/startdatum/);
    }
  });

  it('ongeldige startdatum: prijs blijft zichtbaar, alleen de looptijd ontbreekt', () => {
    const p = prijsStand(geldig({ startdatum: '2026-02-30' }));
    expect(p.soort).toBe('prijs');
    if (p.soort === 'prijs') {
      expect(p.prijs.exclBtw).toBe(2500);
      expect(p.looptijd).toBeNull();
    }
    const q = prijsStand(geldig());
    if (q.soort === 'prijs') expect(q.looptijd?.einddatum).toBe('2027-10-31');
  });
});

describe('aanvullende (optionele) velden', () => {
  it('btw-nummer is aanvullend voor overheden, maar niet voor een verwerker', () => {
    expect(aanvullendeVelden('gemeente')).toContain('btw_nummer');
    expect(aanvullendeVelden('samenwerkingsverband')).toContain('btw_nummer');
    expect(aanvullendeVelden('verwerker')).not.toContain('btw_nummer');
  });

  it('elk veld van stap 1 staat precies één keer in de schermvolgorde', () => {
    expect(new Set(veldenStap1).size).toBe(veldenStap1.length);
    for (const v of aanvullendeVelden('')) expect(veldenStap1).toContain(v);
  });
});

describe('mailtoMetVelden', () => {
  const velden = { organisatie: 'Testregio', ordernummer: 'LID-20261015-ABCDE', opmerkingen: '' };

  it('laat een korte e-mail heel', () => {
    const m = mailtoMetVelden('n.ahsmann@kplusv.nl', 'Aanmelding', velden);
    expect(m.ingekort).toBe(false);
    expect(decodeURIComponent(m.href)).toContain('organisatie: Testregio');
  });

  it('kort lange opmerkingen in tot onder de grens en zegt dat', () => {
    const lang = { ...velden, opmerkingen: 'Wij vragen om toepassing van de inkoopvoorwaarden. '.repeat(80) };
    const m = mailtoMetVelden('n.ahsmann@kplusv.nl', 'Aanmelding', lang);
    expect(m.ingekort).toBe(true);
    expect(m.href.length).toBeLessThanOrEqual(MAILTO_MAX);
    expect(decodeURIComponent(m.href)).toContain('[ingekort, zie het formulier]');
    expect(decodeURIComponent(m.href)).toContain('ordernummer: LID-20261015-ABCDE');
  });

  it('respecteert ook een eigen grens', () => {
    const m = mailtoMetVelden('a@b.nl', 'X', { ...velden, opmerkingen: 'é'.repeat(500) }, 600);
    expect(m.href.length).toBeLessThanOrEqual(600);
  });
});
