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

  test('inlogpagina verwijst naar privacyverklaring en aanmelden', async ({ page }) => {
    await page.goto('/inloggen');
    await expect(page.locator('main').getByRole('link', { name: 'privacyverklaring', exact: true })).toHaveAttribute('href', '/privacy');
    await expect(page.getByRole('link', { name: 'Meld uw organisatie aan' })).toHaveAttribute('href', '/lidmaatschap/aanmelden');
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
    await expect(page.getByTestId('account-email')).toHaveText(EMAIL!);
    await expect(page.getByTestId('organisatie')).toContainText('KplusV');
    await expect(page.getByTestId('lidstatus')).toContainText('Actief');
    await expect(page.getByTestId('geldig-tot')).not.toBeEmpty();
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

    // Ander adres: uitloggen en terug naar het inlogformulier.
    await page.goto('/aanbestedingsarchief');
    await page.locator('.slotkaart').first().getByRole('button', { name: 'Inloggen met ander adres' }).click();
    await expect(page).toHaveURL(/\/inloggen\?terug=%2Faanbestedingsarchief/);
    await expect(page.getByLabel('E-mailadres')).toBeVisible();
  });
});
