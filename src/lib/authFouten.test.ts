import { describe, expect, it } from 'vitest';
import { authFoutmelding, controleerNieuwWachtwoord, domeinVan, isEmailadres, leesUrlFout, MIN_WACHTWOORD, veiligTerugpad } from './authFouten';

describe('authFoutmelding', () => {
  it('vertaalt bekende codes naar Nederlands', () => {
    expect(authFoutmelding({ code: 'invalid_credentials', status: 400 })).toMatch(/e-mailadres of het wachtwoord klopt niet/);
    expect(authFoutmelding({ code: 'email_not_confirmed' })).toMatch(/nog niet bevestigd/);
    expect(authFoutmelding({ code: 'otp_expired' })).toMatch(/verlopen of al gebruikt/);
    expect(authFoutmelding({ code: 'weak_password' })).toContain(String(MIN_WACHTWOORD));
  });
  it('leest de wachttijd uit de Engelse tekst', () => {
    expect(authFoutmelding({ code: 'over_email_send_rate_limit', message: 'For security purposes, you can only request this after 42 seconds.' })).toMatch(
      /Wacht 42 seconden/,
    );
  });
  it('herkent een netwerkfout', () => {
    expect(authFoutmelding({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' })).toMatch(/geen verbinding/);
  });
  it('toont nooit de Engelse tekst bij een onbekende code', () => {
    const m = authFoutmelding({ code: 'iets_nieuws', message: 'Something odd happened' });
    expect(m).not.toContain('Something');
    expect(m).toContain('iets_nieuws');
  });
  it('legt uit waarom er geen account wordt aangemaakt (hook op e-maildomein)', () => {
    const m = authFoutmelding({ status: 403, code: 'unexpected_failure', message: 'Geen organisatie bekend voor dit e-maildomein.' });
    expect(m).toMatch(/geen organisatie aangemeld/);
    expect(m).toMatch(/Lid worden/);
  });
  it('geeft een storingmelding bij 5xx', () => {
    expect(authFoutmelding({ status: 503 })).toMatch(/storing/);
  });
});

describe('leesUrlFout', () => {
  it('leest een fout uit de hash na een verlopen e-maillink', () => {
    expect(leesUrlFout('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid', '')).toMatch(/verlopen/);
  });
  it('geeft null zonder fout', () => {
    expect(leesUrlFout('#access_token=abc', '?terug=/tools')).toBeNull();
  });
});

describe('hulpfuncties', () => {
  it('controleert e-mailadressen', () => {
    expect(isEmailadres('naam@gemeente.nl')).toBe(true);
    expect(isEmailadres(' naam@gemeente.nl ')).toBe(true);
    expect(isEmailadres('naam@gemeente')).toBe(false);
    expect(isEmailadres('naam gemeente.nl')).toBe(false);
  });
  it('haalt het domein uit een adres', () => {
    expect(domeinVan('A.Bakker@KplusV.nl')).toBe('kplusv.nl');
    expect(domeinVan('geen-adres')).toBe('');
  });
  it('laat alleen paden binnen de site toe als terugpad', () => {
    expect(veiligTerugpad('/tools/indexcalculator?x=1')).toBe('/tools/indexcalculator?x=1');
    expect(veiligTerugpad('https://elders.nl')).toBe('/account');
    expect(veiligTerugpad('//elders.nl')).toBe('/account');
    expect(veiligTerugpad('/\\elders.nl')).toBe('/account');
    expect(veiligTerugpad('/inloggen?terug=/x')).toBe('/account');
    expect(veiligTerugpad(null)).toBe('/account');
  });
  it('controleert een nieuw wachtwoord', () => {
    expect(controleerNieuwWachtwoord('', '')?.veld).toBe('nieuw');
    expect(controleerNieuwWachtwoord('kort', 'kort')?.melding).toMatch(/te kort/);
    expect(controleerNieuwWachtwoord('lang genoeg wachtwoord', 'anders')?.veld).toBe('herhaal');
    expect(controleerNieuwWachtwoord('lang genoeg wachtwoord', 'lang genoeg wachtwoord')).toBeNull();
  });
});
