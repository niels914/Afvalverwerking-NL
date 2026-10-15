import { test, expect, type Page } from '@playwright/test';

// Lidmaatschap: prijzenpagina en de hele aanmeldflow tot en met de orderbevestiging.
// Draaien tegen een eigen server: PW_BASE=http://localhost:5101 npx playwright test e2e/lidmaatschap.spec.ts

async function geenHorizontaleScroll(page: Page) {
  const breedte = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, venster: window.innerWidth }));
  expect(breedte.scroll, 'pagina scrollt horizontaal').toBeLessThanOrEqual(breedte.venster);
}

async function vulGegevensIn(page: Page) {
  await page.getByLabel('Naam organisatie').fill('Afvalsamenwerking Testregio');
  await page.getByLabel(/Samenwerkingsverband van gemeenten/).check();
  await page.getByLabel('Aantal deelnemende gemeenten').fill('3');
  await page.getByLabel('KVK-nummer').fill('1234 5678');
  await page.getByLabel(/^Factuuradres/).fill('Postbus 100');
  await page.getByLabel(/^Postcode/).fill('1234ab');
  await page.getByLabel(/^Plaats/).fill('Teststad');
  await page.getByLabel('E-mailadres crediteurenadministratie').fill('facturen@testregio.nl');
  await page.getByLabel(/^Inkoopordernummer/).fill('IO-2026-0042');
  await page.getByLabel('Naam contactpersoon').fill('Jan de Vries');
  await page.getByLabel('E-mailadres contactpersoon').fill('j.devries@testregio.nl');
  await page.getByRole('button', { name: '@testregio.nl toevoegen' }).click();
  await expect(page.getByLabel('E-maildomeinen die toegang krijgen')).toHaveValue('testregio.nl');
}

test.describe('Lidmaatschap en prijzen', () => {
  test('toont staffels met prijs excl. en incl. btw, voorwaarden, vergelijking, vragen en bronnen', async ({ page }) => {
    await page.goto('/lidmaatschap');
    await expect(page.getByRole('heading', { level: 1, name: 'Lidmaatschap en prijzen' })).toBeVisible();
    await expect(page.getByText('Concept: prijzen nog niet vastgesteld').first()).toBeVisible();

    for (const naam of ['Samenwerkingsverband, klein', 'Samenwerkingsverband, groot', 'Gemeente', 'Verwerker']) {
      await expect(page.getByRole('heading', { level: 3, name: naam })).toBeVisible();
    }
    // Klein: € 2.500 excl., € 3.025,00 incl. 21 % btw (kaart en tabel)
    const tabel = page.getByRole('table').first();
    const rijKlein = tabel.getByRole('row', { name: /Samenwerkingsverband klein/ });
    await expect(rijKlein).toContainText(/2\.500,00/);
    await expect(rijKlein).toContainText(/525,00/);
    await expect(rijKlein).toContainText(/3\.025,00/);

    await expect(page.getByText(/Stilzwijgend, steeds met 12 maanden/)).toBeVisible();
    await expect(page.locator('#voorwaarden').getByText(/uiterlijk 1 maand voor de einddatum/)).toBeVisible();
    await expect(page.getByRole('row', { name: /Rekenmodel bron- en nascheiding PMD/ })).toContainText('Nee');

    const vraag = page.getByText('Hoeveel gebruikers mogen er inloggen?');
    await vraag.click();
    await expect(page.getByText(/U betaalt per organisatie/)).toBeVisible();

    const bronnen = page.locator('#bronnen');
    await expect(bronnen.getByRole('link', { name: /Belastingdienst/ })).toHaveAttribute('href', /belastingdienst\.nl/);
    await expect(bronnen).toContainText(/geraadpleegd op \d+ oktober 2026/);
    await geenHorizontaleScroll(page);
  });

  test('aanmeldknop bij een staffel kiest het juiste type', async ({ page }) => {
    await page.goto('/lidmaatschap');
    await page.getByRole('link', { name: 'Aanmelden: Verwerker' }).click();
    await expect(page).toHaveURL(/\/lidmaatschap\/aanmelden\?staffel=verwerker/);
    await expect(page.getByLabel('Afvalverwerker of sorteerder')).toBeChecked();
    await expect(page.getByRole('complementary', { name: 'Uw prijs' })).toContainText(/5\.500/);
  });
});

test.describe('Aanmelden', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lidmaatschap/aanmelden');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.removeItem('afvalplatform-aanmelding');
    });
    await page.reload();
  });

  test('meldt ontbrekende velden in een foutsamenvatting', async ({ page }) => {
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    const samenvatting = page.getByRole('alert');
    await expect(samenvatting).toBeVisible();
    await expect(samenvatting).toContainText('Naam organisatie');
    await expect(samenvatting).toContainText('KVK-nummer');
    await expect(samenvatting).toContainText('E-maildomeinen voor toegang');
    await samenvatting.getByRole('link', { name: /Naam organisatie/ }).click();
    await expect(page.getByLabel('Naam organisatie')).toBeFocused();
    await expect(page.getByLabel('Naam organisatie')).toHaveAttribute('aria-invalid', 'true');
    await geenHorizontaleScroll(page);
  });

  test('verwerker moet een btw-nummer opgeven, gmail.com geeft geen toegang', async ({ page }) => {
    await vulGegevensIn(page);
    await page.getByLabel('Afvalverwerker of sorteerder').check();
    await page.getByLabel('E-maildomeinen die toegang krijgen').fill('gmail.com');
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    const samenvatting = page.getByRole('alert');
    await expect(samenvatting).toContainText('Alleen overheden mogen dit leeg laten');
    await expect(samenvatting).toContainText('gmail.com');
  });

  test('volledige aanmelding: prijs, controle, akkoord en orderbevestiging', async ({ page }) => {
    let verstuurd = '';
    await page.route('**/', async (route) => {
      if (route.request().method() === 'POST') {
        verstuurd = route.request().postData() ?? '';
        await route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
      } else {
        await route.continue();
      }
    });

    await vulGegevensIn(page);
    const prijs = page.getByRole('complementary', { name: 'Uw prijs' });
    await expect(prijs).toContainText('Samenwerkingsverband, klein');
    await expect(prijs).toContainText(/3\.025,00/);
    await geenHorizontaleScroll(page);

    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Controleer uw aanmelding' })).toBeVisible();
    await expect(page.getByText('IO-2026-0042')).toBeVisible();
    await expect(page.getByText('1234 AB Teststad')).toBeVisible();
    await expect(page.getByText(/Totaal per jaar incl\. btw/)).toBeVisible();
    await geenHorizontaleScroll(page);

    // Zonder akkoord niet verzenden
    await page.getByRole('button', { name: 'Aanmelding verzenden' }).click();
    await expect(page.getByRole('alert')).toContainText('Algemene voorwaarden');
    expect(verstuurd).toBe('');

    await expect(page.getByRole('link', { name: /^algemene voorwaarden/ })).toHaveAttribute('href', '/algemene-voorwaarden');
    await expect(page.getByRole('link', { name: /^privacyverklaring/ })).toHaveAttribute('href', '/privacy');
    await page.getByLabel(/ga akkoord met de/).check();
    await page.getByLabel(/Ik heb de privacyverklaring/).check();
    await page.getByRole('button', { name: 'Aanmelding verzenden' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Aanmelding ontvangen' })).toBeVisible();
    await expect(page.locator('.lm-ordernummer')).toHaveText(/^LID-\d{8}-[A-Z2-9]{5}$/);
    await expect(page.getByText('Wat er nu gebeurt')).toBeVisible();
    await expect(page.getByText(/met inkoopordernummer IO-2026-0042/)).toBeVisible();
    await geenHorizontaleScroll(page);

    const body = new URLSearchParams(verstuurd);
    expect(body.get('form-name')).toBe('aanmelding');
    expect(body.get('bot-field')).toBe('');
    expect(body.get('staffel')).toBe('samenwerkingsverband-klein');
    expect(body.get('kvk')).toBe('12345678');
    expect(body.get('prijs_excl_btw')).toBe('2500.00');
    expect(body.get('prijs_incl_btw')).toBe('3025.00');
    expect(body.get('toegang')).toBe('testregio.nl');
    expect(body.get('akkoord_voorwaarden')).toBe('ja');
    expect(body.get('ordernummer')).toMatch(/^LID-/);
  });

  test('als verzenden mislukt: duidelijke melding, lokaal bewaard en e-mail als alternatief', async ({ page }) => {
    await page.route('**/', async (route) => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'fout' });
      else await route.continue();
    });
    await vulGegevensIn(page);
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    await page.getByLabel(/ga akkoord met de/).check();
    await page.getByLabel(/Ik heb de privacyverklaring/).check();
    await page.getByRole('button', { name: 'Aanmelding verzenden' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Aanmelding nog niet verzonden' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('niet verzonden');
    await expect(page.getByRole('link', { name: 'Aanmelding per e-mail sturen' })).toHaveAttribute('href', /^mailto:.*Testregio/);
    const bewaard = await page.evaluate(() => JSON.parse(localStorage.getItem('afvalplatform-aanmelding') ?? '[]'));
    expect(bewaard).toHaveLength(1);
    expect(bewaard[0].organisatie).toBe('Afvalsamenwerking Testregio');
    await page.getByRole('button', { name: 'Opnieuw proberen' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Controleer uw aanmelding' })).toBeVisible();
  });
});
