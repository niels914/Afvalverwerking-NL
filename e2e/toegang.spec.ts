import { test, expect, type Page } from '@playwright/test';

// Ledentoegang: inloggen, inloglink, wachtwoord vergeten, account, uitloggen en de betaalmuur.
// Echte inlogtest alleen met E2E_EMAIL en E2E_WACHTWOORD (een account op het domein van een actieve organisatie).
// Het wachtwoord staat nooit in de repository. E-mails versturen we niet echt: die aanroepen worden onderschept.

const EMAIL = process.env.E2E_EMAIL;
const WACHTWOORD = process.env.E2E_WACHTWOORD;

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

async function logIn(page: Page) {
  await page.getByLabel('E-mailadres').fill(EMAIL!);
  await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD!);
  await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
}

test.describe('bezoeker', () => {
  test('navbar toont Inloggen en de betaalmuur verwijst naar inloggen en lid worden', async ({ page }) => {
    await page.goto('/aanbestedingsarchief');
    const nav = page.locator('header.nav');
    await expect(nav.getByRole('link', { name: 'Inloggen' })).toBeVisible();
    await expect(nav.getByText('Bekijk als')).toHaveCount(0);

    const slot = page.locator('.slotkaart').first();
    await expect(slot).toBeVisible();
    await expect(slot.getByText('Dit onderdeel is voor leden')).toBeVisible();
    await expect(slot.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', '/inloggen?terug=%2Faanbestedingsarchief');
    await expect(slot.getByRole('link', { name: 'Lid worden' })).toHaveAttribute('href', '/lidmaatschap/aanmelden');
    await geenHorizontaleScroll(page);

    // Accountknop is met het toetsenbord bereikbaar en heeft een zichtbare focusrand.
    const knop = nav.getByRole('link', { name: 'Inloggen' });
    await knop.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(knop).toBeFocused();
    const rand = await knop.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(rand).not.toBe('none');
  });

  test('inlogpagina toont vóór inloggen een echt voorbeeld met bron, peildatum en prijsindicatie', async ({ page }) => {
    await page.goto('/inloggen');
    const main = page.locator('main');

    // Echt voorbeeld uit het archief: drie aanbestedingen, elk met een eigen TenderNed-link, plus bron en peildatum.
    const voorbeeld = main.locator('section.kaart').filter({ has: page.getByRole('heading', { level: 2, name: 'Voorbeeld uit het aanbestedingsarchief' }) });
    await expect(voorbeeld).toBeVisible();
    const regels = voorbeeld.getByTestId('voorbeeld-archief').getByRole('listitem');
    await expect(regels).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(regels.nth(i).getByRole('link', { name: /Aankondiging op TenderNed/ })).toHaveAttribute(
        'href',
        /^https:\/\/www\.tenderned\.nl\/aankondigingen\/overzicht\/\d+$/,
      );
    }
    await expect(voorbeeld).toContainText('1.435 aanbestedingen');
    await expect(voorbeeld.getByText(/Bron: .*peildatum 27 oktober 2026/)).toBeVisible();
    await expect(voorbeeld.getByRole('link', { name: /TenderNed, aankondigingen/ })).toHaveAttribute('href', 'https://www.tenderned.nl/aankondigingen/overzicht');

    // Prijsindicatie: vanaf … per jaar, met conceptlabel.
    const prijs = main.locator('section.kaart').filter({ has: page.getByRole('heading', { level: 2, name: 'Lid worden' }) });
    await expect(prijs).toContainText(/Vanaf\s*€\s*1\.500\s*per jaar/);
    await expect(prijs.getByText('Concept', { exact: true })).toBeVisible();
    await prijs.getByText('Prijs per soort organisatie').click();
    await expect(prijs.getByText('Eén gemeente die zelf inzameling of verwerking contracteert')).toBeVisible();
    await expect(prijs.getByRole('link', { name: 'Meld uw organisatie aan' })).toHaveAttribute('href', '/lidmaatschap/aanmelden');

    // Wat leden verder krijgen en wat open is.
    const aanbod = main.locator('section.kaart').filter({ has: page.getByRole('heading', { level: 2, name: 'Wat leden verder krijgen' }) });
    await expect(aanbod.getByRole('link', { name: 'Rekenmodel bron- en nascheiding PMD' })).toBeVisible();
    await expect(aanbod.getByRole('link', { name: 'Restafvalkaart' })).toHaveAttribute('href', '/restafvalkaart');
    // Uitleg en privacylink zitten in een inklapbaar blok.
    const privacy = main.getByRole('link', { name: 'privacyverklaring', exact: true });
    await expect(privacy).toBeHidden();
    await page.getByText('Zo werkt de toegang').click();
    await expect(privacy).toHaveAttribute('href', '/privacy');
    await expect(privacy).toBeVisible();

    // Op mobiel eerst het formulier, dan het voorbeeld, dan de prijs.
    if ((page.viewportSize()?.width ?? 0) <= 820) {
      const y = async (l: typeof voorbeeld) => (await l.boundingBox())!.y;
      const formulier = main.locator('.inlog-kaart');
      expect(await y(formulier)).toBeLessThan(await y(voorbeeld));
      expect(await y(voorbeeld)).toBeLessThan(await y(prijs));
    }
    await geenHorizontaleScroll(page);
  });

  test('nieuw account op een onbekend domein: uitleg in het Nederlands', async ({ page }) => {
    await page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ code: 403, error_code: 'unexpected_failure', msg: 'Geen organisatie bekend voor dit e-maildomein.' }),
      }),
    );
    await page.goto('/inloggen');
    await page.getByLabel('E-mailadres').fill('iemand@onbekend-voorbeeld.nl');
    await page.getByRole('button', { name: 'Stuur mij een inloglink' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Dat lukte niet' })).toContainText('geen organisatie aangemeld');
  });

  test('account zonder sessie: doorsturen zonder verspringende pagina', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((lijst) => {
        for (const e of lijst.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/account');
    await expect(page).toHaveURL(/\/inloggen\?terug=%2Faccount$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Inloggen' })).toBeVisible();
    await page.waitForTimeout(500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls, 'cumulatieve layout shift').toBeLessThan(0.1);
  });

  test('inlogformulier: labels, controle vooraf en foutmelding van de server', async ({ page }) => {
    await page.goto('/inloggen');
    await expect(page.getByRole('heading', { level: 1, name: 'Inloggen' })).toBeVisible();
    await geenHorizontaleScroll(page);

    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    const email = page.getByLabel('E-mailadres');
    await expect(page.getByText('Vul uw e-mailadres in.')).toBeVisible();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toBeFocused();

    await email.fill('naam@gemeente');
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    await expect(page.getByText(/Dit is geen geldig e-mailadres/)).toBeVisible();

    await email.fill('bestaat-niet-e2e@kplusv.nl');
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    await expect(page.getByText('Vul uw wachtwoord in.')).toBeVisible();

    // Wachtwoord tonen en verbergen.
    const ww = page.getByLabel('Wachtwoord', { exact: true });
    await ww.fill('zeker-niet-het-goede-wachtwoord');
    await page.getByRole('button', { name: 'Toon wachtwoord' }).click();
    await expect(ww).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    const fout = page.getByRole('alert').filter({ hasText: 'Dat lukte niet' });
    await expect(fout).toContainText('Het e-mailadres of het wachtwoord klopt niet');
    await expect(fout).not.toContainText('Invalid');
  });

  test('inloglink per e-mail aanvragen', async ({ page }) => {
    let verzoek: Record<string, unknown> | null = null;
    let redirect = '';
    await page.route('**/auth/v1/otp**', async (route) => {
      verzoek = route.request().postDataJSON();
      redirect = new URL(route.request().url()).searchParams.get('redirect_to') ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/inloggen?terug=%2Ftools%2Fpmd-rekenmodel');
    await page.getByLabel('E-mailadres').fill('collega@kplusv.nl');
    await page.getByRole('button', { name: 'Stuur mij een inloglink' }).click();

    await expect(page.getByRole('heading', { name: 'Kijk in uw mailbox' })).toBeFocused();
    await expect(page.getByRole('status').filter({ hasText: 'inloglink gestuurd' })).toContainText('collega@kplusv.nl');
    await expect(page.getByRole('button', { name: /Opnieuw versturen kan over \d+ s/ })).toBeDisabled();
    expect(verzoek).toMatchObject({ email: 'collega@kplusv.nl', create_user: true });
    expect(redirect).toContain('/inloggen?terug=%2Ftools%2Fpmd-rekenmodel');
    await geenHorizontaleScroll(page);

    await page.getByRole('button', { name: 'Ander e-mailadres gebruiken' }).click();
    await expect(page.getByLabel('E-mailadres')).toBeVisible();
  });

  test('te snel een nieuwe e-mail: Nederlandse melding met wachttijd', async ({ page }) => {
    await page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'over_email_send_rate_limit', error_code: 'over_email_send_rate_limit', msg: 'For security purposes, you can only request this after 37 seconds.' }),
      }),
    );
    await page.goto('/inloggen');
    await page.getByLabel('E-mailadres').fill('collega@kplusv.nl');
    await page.getByRole('button', { name: 'Stuur mij een inloglink' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Dat lukte niet' })).toContainText('Wacht 37 seconden');
  });

  test('wachtwoord vergeten', async ({ page }) => {
    let redirect = '';
    await page.route('**/auth/v1/recover**', async (route) => {
      redirect = new URL(route.request().url()).searchParams.get('redirect_to') ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/inloggen');
    await page.getByRole('button', { name: 'Wachtwoord vergeten?' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Wachtwoord vergeten' })).toBeVisible();
    await page.getByRole('button', { name: 'Stuur herstellink' }).click();
    await expect(page.getByText('Vul uw e-mailadres in.')).toBeVisible();
    await page.getByLabel('E-mailadres').fill('collega@kplusv.nl');
    await page.getByRole('button', { name: 'Stuur herstellink' }).click();
    await expect(page.getByRole('heading', { name: 'Kijk in uw mailbox' })).toBeVisible();
    expect(redirect).toContain('/inloggen?stap=nieuw-wachtwoord');
  });

  test('verlopen e-maillink geeft een duidelijke melding', async ({ page }) => {
    await page.goto('/inloggen#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    await expect(page.getByRole('alert')).toContainText('Deze link is verlopen of al gebruikt');

    await page.goto('/inloggen?stap=nieuw-wachtwoord');
    await expect(page.getByRole('alert')).toContainText('Deze link werkt niet meer');
    await page.getByRole('link', { name: 'Nieuwe herstellink aanvragen' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Wachtwoord vergeten' })).toBeVisible();
  });

  test('account zonder sessie stuurt naar inloggen', async ({ page }) => {
    await page.goto('/account');
    await expect(page).toHaveURL(/\/inloggen\?terug=%2Faccount$/);
  });
});

test.describe('ingelogd', () => {
  test.skip(!EMAIL || !WACHTWOORD, 'Zet E2E_EMAIL en E2E_WACHTWOORD voor de inlogtests.');
  test.describe.configure({ mode: 'serial' });

  test('lid: inloggen vanaf de betaalmuur, inhoud zien, account bekijken en uitloggen', async ({ page }) => {
    await page.goto('/aanbestedingsarchief');
    await page.locator('.slotkaart').getByRole('link', { name: 'Inloggen' }).click();
    await expect(page).toHaveURL(/\/inloggen\?terug=/);
    await logIn(page);

    // Terug op de pagina waar de gebruiker was, nu zonder slot.
    await expect(page).toHaveURL(/\/aanbestedingsarchief$/);
    await expect(page.locator('.slotkaart')).toHaveCount(0);
    const knop = page.locator('header.nav').getByRole('link', { name: /Mijn account/ });
    await expect(knop).toContainText('Lid');

    await knop.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Mijn account' })).toBeVisible();
    // Bovenaan de kern: status, organisatie en geldig tot.
    await expect(page.getByTestId('lidstatus')).toContainText('Actief');
    await expect(page.getByTestId('organisatie')).toHaveText('KplusV');
    await expect(page.getByTestId('geldig-tot')).not.toBeEmpty();
    // Ledendashboard: snelkoppelingen, nieuwste aanbestedingen en nieuws.
    const snel = page.getByRole('region', { name: 'Snel naar' });
    await expect(snel.getByRole('link', { name: /Aanbestedingsarchief/ })).toHaveAttribute('href', '/aanbestedingsarchief');
    await expect(snel.getByRole('link', { name: /Indexcalculator/ })).toHaveAttribute('href', '/tools/indexcalculator');
    await expect(snel.getByRole('link', { name: 'Restafvalkaart' })).toHaveAttribute('href', '/restafvalkaart');
    await expect(snel.getByText('Alleen leden')).toHaveCount(0);
    // Volledige beschrijvingen (niet afgekapt) en geen woord dat midden in breekt.
    const snelTekst = snel.locator('.snel-tekst');
    expect(await snelTekst.count()).toBeGreaterThan(3);
    for (const t of await snelTekst.all()) {
      await expect(t).toBeVisible();
      expect(await t.evaluate((el) => el.scrollHeight <= el.clientHeight + 1), 'beschrijving afgekapt').toBe(true);
    }
    const gebroken = await snel.locator('.snel-titel, .snel-tekst').evaluateAll((els) =>
      els.flatMap((el) => {
        const tekst = el.firstChild;
        if (!tekst || tekst.nodeType !== Node.TEXT_NODE) return [];
        const woorden: string[] = [];
        const re = /\S+/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(tekst.textContent ?? ''))) {
          const r = document.createRange();
          r.setStart(tekst, m.index);
          r.setEnd(tekst, m.index + m[0].length);
          // Een woord dat over twee regels loopt, heeft twee rechthoeken.
          if (new Set(Array.from(r.getClientRects()).map((x) => Math.round(x.top))).size > 1) woorden.push(m[0]);
        }
        return woorden;
      }),
    );
    expect(gebroken, 'woorden die midden in breken').toEqual([]);

    // Aanbestedingen: per regel een directe TenderNed-link, en een keuze met link naar het archief met hetzelfde filter.
    const lijst = page.getByTestId('recente-aanbestedingen');
    await expect(lijst.getByRole('listitem').first()).toBeVisible();
    const aantal = await lijst.getByRole('listitem').count();
    for (let i = 0; i < aantal; i++) {
      await expect(lijst.getByRole('listitem').nth(i).getByRole('link', { name: /Bekijk op TenderNed/ })).toHaveAttribute('href', /^https:\/\/www\.tenderned\.nl\//);
    }
    await expect(page.getByRole('link', { name: 'Alle aanbestedingen in het archief' })).toHaveAttribute('href', '/aanbestedingsarchief');
    const openKnop = page.getByRole('button', { name: /Open, sluit het eerst/ });
    await openKnop.click();
    await expect(openKnop).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: 'Alle open aanbestedingen in het archief' })).toHaveAttribute(
      'href',
      '/aanbestedingsarchief?status=open&sortering=sluiting-op',
    );
    await expect(lijst.getByRole('listitem').first()).toContainText('Open voor inschrijving');
    await expect(page.getByRole('heading', { level: 2, name: 'Laatste nieuws' })).toBeVisible();
    await geenHorizontaleScroll(page);

    // Details zijn ingeklapt.
    await expect(page.getByTestId('account-email')).toBeHidden();
    await page.getByText('Lidmaatschap in detail').click();
    await expect(page.getByText(/eigen afspraak met KplusV/)).toBeVisible();
    await page.getByText('Inloggegevens en wachtwoord').click();
    await expect(page.getByTestId('account-email')).toHaveText(EMAIL!);
    await expect(page.locator('main').getByRole('link', { name: 'privacyverklaring', exact: true })).toHaveAttribute('href', '/privacy');
    await geenHorizontaleScroll(page);

    // Controle vooraf bij wachtwoord wijzigen (er wordt niets opgeslagen).
    await page.getByRole('button', { name: 'Wachtwoord instellen of wijzigen' }).click();
    await page.getByRole('form', { name: 'Nieuw wachtwoord' }).getByLabel('Nieuw wachtwoord', { exact: true }).fill('kort');
    await page.getByRole('button', { name: 'Wachtwoord opslaan' }).click();
    await expect(page.getByText(/te kort: minimaal 10 tekens/)).toBeVisible();
    await page.getByRole('button', { name: 'Annuleren' }).click();

    await page.getByRole('button', { name: 'Uitloggen' }).click();
    await expect(page).toHaveURL(/\/inloggen\?melding=uitgelogd/);
    await expect(page.getByText('U bent uitgelogd.')).toBeVisible();
    await expect(page.locator('header.nav').getByRole('link', { name: 'Inloggen' })).toBeVisible();

    await page.goto('/aanbestedingsarchief');
    await expect(page.locator('.slotkaart').first()).toBeVisible();
  });

  test('betaalmuur: tijdens de controle niet bedienbaar, daarna dezelfde inhoud zonder nieuwe opbouw', async ({ page }) => {
    await page.goto('/inloggen');
    await logIn(page);
    await expect(page).toHaveURL(/\/account$/);

    // Controle van het lidmaatschap 1,5 seconde vertragen, zodat de laadstap te zien is.
    await page.route('**/rest/v1/rpc/is_lid', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto('/tools/pmd-rekenmodel');
    const muur = page.getByTestId('vergrendeld');
    await expect(muur).toHaveAttribute('data-stand', 'laden');
    const preview = muur.locator('> .vergrendeld-preview');
    await expect(preview).toHaveAttribute('inert', '');
    await expect(preview).toHaveAttribute('aria-hidden', 'true');
    // Een element uit de inhoud markeren; na de controle moet precies dat element er nog zijn.
    const eersteVeld = preview.locator('select, input:not([readonly])').first();
    await expect(eersteVeld).toBeAttached();
    await eersteVeld.evaluate((el) => ((window as unknown as { __veld: Element }).__veld = el));

    await expect(muur).toHaveAttribute('data-stand', 'open');
    await expect(page.locator('.slotkaart')).toHaveCount(0);
    const inhoud = muur.locator('> .vergrendeld-inhoud');
    await expect(inhoud).not.toHaveAttribute('inert', /.*/);
    expect(await page.evaluate(() => (window as unknown as { __veld: Element }).__veld.isConnected), 'inhoud opnieuw opgebouwd').toBe(true);
    await expect(inhoud.locator('select, input:not([readonly])').first()).toBeEditable();
    await geenHorizontaleScroll(page);

    await page.goto('/account');
    await page.getByRole('button', { name: 'Uitloggen' }).click();
    await expect(page).toHaveURL(/\/inloggen\?melding=uitgelogd/);
  });

  test('lidmaatschap wordt per paginalading één keer gecontroleerd', async ({ page }) => {
    await page.goto('/inloggen');
    await logIn(page);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId('lidstatus')).toContainText('Actief');

    let aanroepen = 0;
    page.on('request', (r) => {
      if (r.url().includes('/rest/v1/rpc/is_lid')) aanroepen += 1;
    });
    await page.reload();
    await expect(page.getByTestId('lidstatus')).toContainText('Actief');
    await page.goto('/account');
    await expect(page.getByTestId('lidstatus')).toContainText('Actief');
    await page.waitForTimeout(1500);
    expect(aanroepen, 'aantal is_lid-aanroepen bij twee paginaladingen').toBeLessThanOrEqual(2);
    await page.getByRole('button', { name: 'Uitloggen' }).click();
    await expect(page).toHaveURL(/\/inloggen\?melding=uitgelogd/);
  });

  test('ingelogd zonder lidmaatschap: passende uitleg in betaalmuur en account', async ({ page }) => {
    // Doe alsof de organisatie van dit account geen lid (meer) is.
    await page.route('**/rest/v1/rpc/is_lid', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: 'false' }));
    await page.route('**/rest/v1/rpc/mijn_lidmaatschap', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            organisatie: 'KplusV',
            organisatietype: 'overig',
            status: 'actief',
            effectieve_status: 'verlopen',
            geldig_tot: '2026-09-30',
            domein: 'kplusv.nl',
            is_lid: false,
          },
        ]),
      }),
    );
    await page.goto('/inloggen?terug=%2Faanbestedingsarchief');
    await logIn(page);
    await expect(page).toHaveURL(/\/aanbestedingsarchief$/);

    const slot = page.locator('.slotkaart').first();
    await expect(slot).toContainText(`U bent ingelogd als ${EMAIL}`);
    await expect(slot).toContainText('is verlopen');
    await expect(slot.getByRole('link', { name: 'Lid worden' })).toBeVisible();
    await expect(slot.getByRole('button', { name: 'Inloggen met ander adres' })).toBeVisible();
    await expect(page.locator('header.nav').getByRole('link', { name: /Mijn account/ })).toContainText('Geen lid');
    await geenHorizontaleScroll(page);

    await page.goto('/account');
    await expect(page.getByTestId('lidstatus')).toContainText('Verlopen');
    await expect(page.getByTestId('geldig-tot')).toHaveText('30 september 2026');
    await expect(page.getByRole('link', { name: 'Lidmaatschap verlengen of opnieuw aanmelden' })).toBeVisible();
    // Niet-leden zien welke onderdelen voor leden zijn, en geen ledendata.
    await expect(page.getByRole('region', { name: 'Snel naar' }).getByText('Alleen leden').first()).toBeVisible();
    await expect(page.getByTestId('recente-aanbestedingen')).toHaveCount(0);

    // Ander adres: uitloggen en terug naar het inlogformulier.
    await page.goto('/aanbestedingsarchief');
    await page.locator('.slotkaart').first().getByRole('button', { name: 'Inloggen met ander adres' }).click();
    await expect(page).toHaveURL(/\/inloggen\?terug=%2Faanbestedingsarchief/);
    await expect(page.getByLabel('E-mailadres')).toBeVisible();
  });
});
