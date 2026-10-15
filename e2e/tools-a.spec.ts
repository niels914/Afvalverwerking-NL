import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Indexcalculator en CO2-heffingenscan: gratis deel, bronnen, CSV-export, deellink en betaalmuur.
// Het Pro-deel testen we alleen als E2E_EMAIL en E2E_WACHTWOORD zijn gezet (account van een lid).

const cbs = JSON.parse(readFileSync(new URL('../src/data/indexreeksen.json', import.meta.url), 'utf8'));
const cpi = cbs.reeksen.find((r: { id: string }) => r.id === 'cpi');
const EMAIL = process.env.E2E_EMAIL;
const WACHTWOORD = process.env.E2E_WACHTWOORD;

const nl = (n: number, d = 2) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

async function leesDownload(page: Page, knop: string) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: knop }).first().click()]);
  const pad = await download.path();
  return { naam: download.suggestedFilename(), tekst: readFileSync(pad!, 'utf8') };
}

test.describe('Indexcalculator', () => {
  test('rekent met echte CBS-cijfers en toont bron en peildatum', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await expect(page.getByRole('heading', { level: 1, name: 'Indexcalculator' })).toBeVisible();
    await geenHorizontaleScroll(page);

    // Standaard: CPI, jaarcijfers 2021 → laatste jaar.
    const peil = String(cpi.laatsteJaar);
    await expect(page.getByLabel('Indexreeks')).toHaveValue('cpi');
    await page.getByLabel('Basisperiode').selectOption('2021');
    await page.getByLabel('Peilperiode').selectOption(peil);
    const factor = cpi.jaren[peil] / cpi.jaren['2021'];
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(100 * factor));
    await expect(page.getByText(nl(factor, 4), { exact: true })).toBeVisible();

    // Bron en peildatum zichtbaar.
    await expect(page.getByText(/CBS-cijfers, peildatum/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: '86141NED' }).first()).toHaveAttribute('href', /opendata\.cbs\.nl/);
    await expect(page.getByRole('heading', { name: 'Bronnen en peildatum' })).toBeVisible();

    // Eigen basistarief.
    const tarief = page.getByLabel('Basistarief');
    await tarief.fill('250,50');
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(250.5 * factor));
    await tarief.fill('abc');
    await expect(page.getByText('Vul een getal in.')).toBeVisible();
    await tarief.fill('250,5');
  });

  test('wisselt naar maandcijfers en meldt voorlopige cijfers', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.getByLabel('Maandcijfers').check();
    await page.getByLabel('Basisperiode').selectOption('2024-09');
    const laatste = cpi.laatsteMaand;
    await page.getByLabel('Peilperiode').selectOption(laatste);
    const factor = cpi.maanden[laatste] / cpi.maanden['2024-09'];
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(100 * factor));
    if (cpi.voorlopig.includes(laatste)) await expect(page.getByText(/CBS noemt een van deze cijfers voorlopig/)).toBeVisible();
    await expect(page).toHaveURL(/soort=maand/);
    await geenHorizontaleScroll(page);
  });

  test('exporteert CSV en deelt de invoer via de link', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.getByLabel('Indexreeks').selectOption('cao-afval');
    await page.getByLabel('Basistarief').fill('87,5');

    const { naam, tekst } = await leesDownload(page, 'CSV downloaden');
    expect(naam).toMatch(/^indexcalculator-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(tekst).toContain('Basistarief (euro per ton);87,5');
    expect(tekst).toContain('85663NED');
    expect(tekst).toContain('Peildatum (opgehaald);' + cbs.peildatum);

    const link = await page.getByLabel('Deellink met uw invoer').first().inputValue();
    expect(link).toContain('reeks=cao-afval');
    expect(link).toContain('tarief=87.5');

    // Link openen in een nieuwe pagina geeft dezelfde invoer.
    const tweede = await page.context().newPage();
    await tweede.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(tweede.getByLabel('Indexreeks')).toHaveValue('cao-afval');
    await expect(tweede.getByLabel('Basistarief')).toHaveValue('87,5');
    await tweede.close();
  });

  test('Pro-deel zit achter de betaalmuur', async ({ page }) => {
    test.skip(!!EMAIL, 'met inlog getest in de Pro-test');
    await page.goto('/tools/indexcalculator');
    const slot = page.locator('.slotkaart');
    await expect(slot.getByRole('heading', { name: /Indexcalculator Pro/ })).toBeVisible();
    await expect(slot.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', /\/inloggen\?terug=%2Ftools%2Findexcalculator/);
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
  });
});

test.describe('CO2-heffingenscan', () => {
  test('rekent met het wettelijke tarief en de correctiefactor', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    await expect(page.getByRole('heading', { level: 1, name: 'CO2-heffingenscan' })).toBeVisible();
    await geenHorizontaleScroll(page);

    await page.getByLabel('Restafval').fill('10000');
    await page.getByLabel('Fossiele emissiefactor').fill('0,4');
    await page.getByLabel('Heffingsjaar').selectOption('2027');
    // Geldend recht 2027: € 153,32; vrijgesteld 0,97 × 1,023 × 0,70
    const deel = 0.97 * 1.023 * 0.7;
    const kosten = 4000 * (1 - deel) * 153.32;
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(Math.round(kosten), 0));
    await expect(page.getByText('€ 153,32').first()).toBeVisible();

    // Wetsvoorstel: 2027 € 129,15 en een zichtbaar label.
    await page.getByLabel(/Voorstel BP 2027/).check();
    await expect(page.locator('.tegel').nth(2)).toContainText('€ 129,15');
    await expect(page.getByText(/nog niet aangenomen/)).toBeVisible();

    // Eigen vrijgesteld deel.
    await page.getByLabel('Eigen percentage van uw verwerker').check();
    await page.getByLabel('Vrijgesteld deel van de uitstoot').fill('25');
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(Math.round(4000 * 0.75 * 129.15), 0));
  });

  test('toont tarieventabel, bronnen en aannames', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    const tabel = page.getByRole('region', { name: 'Tabel tarief en correctiefactor per jaar' });
    await expect(tabel.getByRole('row', { name: /2030/ })).toContainText('€ 303,55');
    await expect(tabel.getByRole('row', { name: /2035/ })).toContainText('€ 328,01');
    await expect(page.getByRole('link', { name: /Wet belastingen op milieugrondslag/ }).first()).toHaveAttribute('href', /wetten\.overheid\.nl/);
    await expect(page.getByText('Aanname, vul eigen waarde in').first()).toBeVisible();
    await expect(page.getByText('Kental, afgeleid uit bron').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Wat kan er veranderen' })).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('exporteert CSV en herstelt invoer uit de deellink', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    await page.getByLabel('Restafval').fill('12345');
    await page.getByLabel('Heffingsjaar').selectOption('2031');
    await page.getByLabel(/Voorstel BP 2027/).check();

    const { tekst } = await leesDownload(page, 'CSV downloaden');
    expect(tekst).toContain('Restafval (ton per jaar);12345;aanname gebruiker');
    expect(tekst).toContain('Heffingsjaar;2031');
    expect(tekst).toContain('rijksfinancien.nl');

    const link = await page.getByLabel('Deellink met uw invoer').first().inputValue();
    const tweede = await page.context().newPage();
    await tweede.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(tweede.getByLabel('Restafval')).toHaveValue('12345');
    await expect(tweede.getByLabel('Heffingsjaar')).toHaveValue('2031');
    await expect(tweede.getByLabel(/Voorstel BP 2027/)).toBeChecked();
    await tweede.close();
  });

  test('Pro-deel zit achter de betaalmuur', async ({ page }) => {
    test.skip(!!EMAIL, 'met inlog getest in de Pro-test');
    await page.goto('/tools/co2-heffingenscan');
    await expect(page.locator('.slotkaart').getByRole('heading', { name: /CO2-heffingenscan Pro/ })).toBeVisible();
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
  });
});

test.describe('Navigatie en printweergave', () => {
  for (const [pad, titel, anker] of [
    ['/tools/indexcalculator', 'Indexcalculator', 'Bronnen en peildatum'],
    ['/tools/co2-heffingenscan', 'CO2-heffingenscan', 'Tarieven per jaar'],
  ] as const) {
    test(`${titel}: inhoudsopgave en rapportkop bij printen`, async ({ page }) => {
      await page.goto(pad);
      const nav = page.getByRole('navigation', { name: 'Op deze pagina' });
      await nav.getByRole('link', { name: anker }).click();
      await expect(page).toHaveURL(/#/);
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('.rapportkop')).toBeVisible();
      await expect(page.locator('.rapportkop')).toContainText(`Rapport ${titel}`);
      await expect(nav).toBeHidden();
      await expect(page.getByRole('button', { name: 'CSV downloaden' }).first()).toBeHidden();
    });
  }
});

test.describe('Pro voor leden', () => {
  test.skip(!EMAIL || !WACHTWOORD, 'Zet E2E_EMAIL en E2E_WACHTWOORD om het Pro-deel te testen.');

  async function logIn(page: Page, terug: string) {
    await page.goto(`/inloggen?terug=${encodeURIComponent(terug)}`);
    await page.getByLabel('E-mailadres').fill(EMAIL!);
    await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD!);
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    await page.waitForURL(`**${terug}**`);
  }

  test('Indexcalculator Pro: weging, contractjaren en CSV', async ({ page }) => {
    await logIn(page, '/tools/indexcalculator');
    await expect(page.getByRole('heading', { name: 'Tarief per contractjaar' })).toBeVisible();
    await expect(page.getByText(/Samen 100 %/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tabel tarief per contractjaar' }).getByRole('row')).not.toHaveCount(1);
    const { tekst } = await leesDownload(page, 'CSV downloaden'); // eerste knop = gratis deel
    expect(tekst).toContain('Indexcalculator');
    await expect(page.getByRole('button', { name: 'Rapport maken' })).toBeVisible();
  });

  test('CO2-heffingenscan Pro: scenario’s en vergelijking', async ({ page }) => {
    await logIn(page, '/tools/co2-heffingenscan');
    await expect(page.getByRole('region', { name: 'Tabel heffing per jaar per scenario' })).toBeVisible();
    await expect(page.getByText(/Huidig scenario, totaal/)).toBeVisible();
  });
});
