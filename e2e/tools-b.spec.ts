import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Bodemassencalculator, Rekenmodel PMD en Aanbestedingstool (onderdeel tools-b):
// rekenen met kentallen, bron en peildatum, lege velden zonder bron, CSV en tekstexport, deellink, betaalmuur, print.
// Het ledendeel van het PMD-model controleren we in de (inerte) preview achter de betaalmuur.

const cbs = JSON.parse(readFileSync(new URL('../src/data/tools-b-cbs-pmd.json', import.meta.url), 'utf8'));

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

async function leesDownload(page: Page, knop: string) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: knop }).first().click()]);
  const pad = await download.path();
  return { naam: download.suggestedFilename(), tekst: readFileSync(pad!, 'utf8') };
}

const hero = (page: Page) => page.locator('.tegel.hero').first();

test.describe('Bodemassencalculator', () => {
  test('rekent hoeveelheden met kentallen van Rijkswaterstaat en laat bedragen open zonder bron', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await expect(page.getByRole('heading', { level: 1, name: 'Bodemassencalculator' })).toBeVisible();
    await geenHorizontaleScroll(page);

    await expect(page.getByLabel('Aandeel ruwe bodemas', { exact: true })).toHaveValue('24,4');
    await expect(page.getByRole('link', { name: /Rijkswaterstaat, Afvalverwerking in Nederland 2024/ }).first()).toHaveAttribute('href', /verenigingafvalbedrijven\.nl/);
    await expect(page.locator('.bronveld-herkomst').filter({ hasText: 'peildatum' }).first()).toContainText(/peildatum \d+ \w+ 20\d\d/);

    // 100.000 t × 24,4 % = 24.400 t ruwe bodemas
    await expect(page.locator('.tegel').filter({ hasText: 'Ruwe bodemas' }).first()).toContainText('24.400 ton');
    await expect(hero(page)).toContainText('–');
    await expect(page.getByText('Nog in te vullen voor bedragen')).toBeVisible();
    await expect(page.getByLabel('Verwerkingstarief opwerker', { exact: true })).toHaveValue('');
  });

  test('rekent netto kosten na invullen, met deellink, CSV en terugzetknop', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await page.getByLabel('Verwerkingstarief opwerker', { exact: true }).fill('30');
    await page.getByLabel('Opbrengst ferro', { exact: true }).fill('150');
    await page.getByLabel('Opbrengst non-ferro', { exact: true }).fill('900');
    // kosten 24.400 × 30 = 732.000 ; opbrengst 1.683,6 × 150 + 585,6 × 900 = 779.580 → netto opbrengst 47.580
    await expect(hero(page)).toContainText('Netto opbrengst per jaar');
    await expect(hero(page)).toContainText(/47\.580/);
    await expect(page.getByText('Nog in te vullen voor bedragen')).toHaveCount(0);
    await expect(page).toHaveURL(/tarief=30/);

    const { naam, tekst } = await leesDownload(page, 'CSV downloaden');
    expect(naam).toMatch(/^bodemassencalculator-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(tekst).toContain('Verwerkingstarief (euro per ton ruwe bodemas);30;eigen waarde');
    expect(tekst).toContain('Aandeel ruwe bodemas (% van verbrand);24,4;kental Rijkswaterstaat 2024');
    expect(tekst).toContain('Netto kosten (euro, negatief = opbrengst);-47580');
    expect(tekst).toContain('verenigingafvalbedrijven.nl');

    // Afwijken van de bron en terugzetten.
    const aandeel = page.getByLabel('Aandeel ruwe bodemas', { exact: true });
    await aandeel.fill('22');
    await expect(page.getByRole('button', { name: /Terug naar bronwaarde \(24,4 %\)/ })).toBeVisible();
    await page.getByRole('button', { name: /Terug naar bronwaarde \(24,4 %\)/ }).click();
    await expect(aandeel).toHaveValue('24,4');

    // Deellink herstelt de invoer.
    const link = await page.getByLabel('Deellink met uw invoer').first().inputValue();
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(page.getByLabel('Opbrengst non-ferro', { exact: true })).toHaveValue('900');
    await expect(hero(page)).toContainText(/47\.580/);
    await geenHorizontaleScroll(page);
  });

  test('Pro zit achter de betaalmuur', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await expect(page.locator('.slotkaart').getByRole('heading', { name: /Bodemassencalculator Pro/ })).toBeVisible();
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
    await expect(page.locator('.vergrendeld-preview')).toContainText('Installatie 1');
  });
});

test.describe('Rekenmodel bron- en nascheiding PMD', () => {
  test('toont de staffel 2026–2028 en bronnen openbaar, het model alleen voor leden', async ({ page }) => {
    await page.goto('/tools/pmd-rekenmodel');
    await expect(page.getByRole('heading', { level: 1, name: 'Rekenmodel bron- en nascheiding PMD' })).toBeVisible();
    await geenHorizontaleScroll(page);
    const staffel = page.getByRole('region', { name: 'Tabel staffel inzamelvergoeding' });
    await expect(staffel).toContainText(/325/);
    await expect(staffel).toContainText(/163/);
    await expect(page.getByRole('link', { name: /onderhandelingsresultaat Verpact, VNG en NVRD/ })).toHaveAttribute('href', /nvrd\.nl/);
    await expect(page.getByRole('heading', { name: 'Bronnen en peildatum' })).toBeVisible();
    await expect(page.locator('.slotkaart').getByRole('heading', { name: /Rekenmodel bron- en nascheiding PMD/ })).toBeVisible();
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
  });

  test('rekent in de preview met CBS-cijfers van de gemeente uit de link', async ({ page }) => {
    const g = cbs.gemeenten.find((x: { code: string }) => x.code === 'GM1680');
    await page.goto('/tools/pmd-rekenmodel?gm=GM1680&cat=1&tn=10');
    const preview = page.locator('.vergrendeld-preview');
    await expect(preview.getByLabel('Gemeente', { exact: true })).toHaveValue('GM1680');
    const ton = Math.round((g.inwoners * g.pmdKgPerInw) / 1000);
    await expect(preview).toContainText(`${new Intl.NumberFormat('nl-NL').format(ton)} ton`);
    await expect(preview.getByLabel('Inzamelvergoeding Verpact', { exact: true })).toHaveValue('325');
    await expect(preview.getByLabel('Teruggewonnen PMD', { exact: true })).toHaveValue('10');
    await expect(preview).toContainText('Goedkoopst');
    await expect(page).toHaveURL(/gm=GM1680/);
  });
});

test.describe('Aanbestedingstool', () => {
  test('doorloopt opdracht, criteria, weging en overzicht en downloadt het resultaat', async ({ page }) => {
    await page.goto('/tools/aanbestedingstool');
    await expect(page.getByRole('heading', { level: 1, name: 'Aanbestedingstool' })).toBeVisible();
    await geenHorizontaleScroll(page);

    // Stap 1: GFT, tarief invullen → geraamde waarde en drempeltoets.
    await page.getByRole('radio', { name: /GFT-afval/ }).check();
    await expect(page.getByLabel('Geraamd tarief', { exact: true })).toHaveValue('');
    await expect(page.getByText('Vul een geraamd tarief in')).toBeVisible();
    await page.getByLabel('Geraamd tarief', { exact: true }).fill('80');
    // 40.000 t × € 80 × (5 + 2) jaar = € 22.400.000
    await expect(page.getByText(/22\.400\.000/).first()).toBeVisible();
    await expect(page.getByText('Europees aanbesteden.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /PIANOo, drempelbedragen 2026 en 2027/ })).toHaveAttribute('href', /pianoo\.nl/);
    await page.getByRole('button', { name: 'Volgende: eisen en criteria' }).click();

    // Stap 2: MVI-criteria met code en link; gedetailleerde methode erbij kiezen.
    await expect(page.getByRole('heading', { name: 'Stap 2 · Eisen en criteria' })).toBeFocused();
    await expect(page.getByText('MVI 049.006 · Significant')).toBeVisible();
    await expect(page.getByRole('link', { name: /MVI-criterium 049\.006 in de MVI-criteriatool/ })).toHaveAttribute('href', 'https://www.mvicriteria.nl/nl/webtool?product_group=54&cluster=5');
    const detail = page.getByRole('checkbox', { name: 'CO2-score van de GFT-verwerking, gedetailleerde methode' });
    await expect(detail).not.toBeChecked();
    await detail.check();
    await page.getByRole('button', { name: 'Gunningscriteria' }).click();
    await expect(page.getByRole('checkbox', { name: 'Garantie op productiefouten van minimaal zeven jaar' })).toHaveCount(0);
    await page.getByLabel('Alleen officiële MVI-criteria').check();
    await expect(page.getByRole('checkbox', { name: 'Aandeel hergebruik en recycling' })).toHaveCount(0);
    await geenHorizontaleScroll(page);
    await page.getByRole('button', { name: 'Volgende: weging' }).click();

    // Stap 3: weging.
    await page.getByLabel('Prijs', { exact: true }).fill('0');
    await expect(page.getByText(/Prijs weegt 0 %/).first()).toBeVisible();
    await page.getByLabel('Prijs', { exact: true }).fill('60');
    // Het puntenveld is breed genoeg voor drie cijfers.
    await page.getByLabel('Prijs', { exact: true }).fill('100');
    expect(await page.getByLabel('Prijs', { exact: true }).evaluate((el) => (el as HTMLInputElement).scrollWidth <= (el as HTMLInputElement).clientWidth)).toBe(true);
    await page.getByLabel('Prijs', { exact: true }).fill('60');
    await page.getByRole('button', { name: 'Volgende: overzicht' }).click();

    // Stap 4: overzicht, checklist, downloads.
    await expect(page.getByText('Officieel MVI-criterium 049.007, ambitieniveau ambitieus.')).toBeVisible();
    await expect(page.getByText(/basis- én de gedetailleerde CO2-methode/)).toBeVisible();
    await geenHorizontaleScroll(page);

    const txt = await leesDownload(page, 'Tekstbestand downloaden');
    expect(txt.naam).toMatch(/^aanbesteding-gft-afval-\d{4}-\d{2}-\d{2}\.txt$/);
    expect(txt.tekst).toContain('Afvalstroom: GFT-afval');
    expect(txt.tekst).toContain('Herkomst: MVI 049.006 (Significant) – https://www.mvicriteria.nl/nl/webtool?product_group=54&cluster=5');
    expect(txt.tekst).toContain('[ ] De geraamde waarde ligt op of boven het drempelbedrag');

    const csv = await leesDownload(page, 'CSV downloaden');
    expect(csv.tekst).toContain('Weging;Procent');
    expect(csv.tekst).toMatch(/\r\nPrijs;\d+\r\n/);
    expect(csv.tekst).toContain('Gunningscriterium;Klimaat;CO2-score van de GFT-verwerking, gedetailleerde methode');

    // Deellink opent het overzicht met dezelfde keuzes.
    const link = await page.getByLabel('Deellink met uw invoer').inputValue();
    expect(link).toContain('stroom=gft');
    expect(link).toContain('gft-co2-detail');
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(page.getByRole('heading', { name: 'Stap 4 · Overzicht' })).toBeVisible();
    await expect(page.getByText('Officieel MVI-criterium 049.007, ambitieniveau ambitieus.')).toBeVisible();

    // Printweergave: rapportkop zichtbaar, knoppen weg.
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.rapportkop')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Printen of opslaan als PDF' })).toBeHidden();
  });
});

test('Overzicht rekentools noemt per tool de bronnen', async ({ page }) => {
  await page.goto('/tools');
  await expect(page.getByRole('heading', { level: 1, name: 'Rekentools' })).toBeVisible();
  await expect(page.getByText('Rijkswaterstaat, Afvalverwerking in Nederland 2024')).toBeVisible();
  await expect(page.getByText(/Akkoord Verpact, VNG en NVRD/)).toBeVisible();
  await expect(page.getByText('Gratis deel + Pro voor leden').first()).toBeVisible();
  await geenHorizontaleScroll(page);
});

// Ledendeel met een echte inlog. Draai met E2E_EMAIL en E2E_WACHTWOORD van een account bij een actieve lidorganisatie.
const EMAIL = process.env.E2E_EMAIL;
const WACHTWOORD = process.env.E2E_WACHTWOORD;

test.describe('Als lid ingelogd', () => {
  test.skip(!EMAIL || !WACHTWOORD, 'Zet E2E_EMAIL en E2E_WACHTWOORD voor de ledentests.');

  async function logInNaar(page: Page, pad: string) {
    await page.goto(`/inloggen?terug=${encodeURIComponent(pad)}`);
    await page.getByLabel('E-mailadres').fill(EMAIL!);
    await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD!);
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${pad.replace(/\//g, '\\/')}`));
    await expect(page.locator('.slotkaart')).toHaveCount(0);
  }

  test('Bodemassencalculator Pro: meerdere installaties, totaal, gevoeligheid en CSV', async ({ page }) => {
    await logInNaar(page, '/tools/bodemassencalculator');
    const vul = (label: string, w: string) => page.getByLabel(label, { exact: true }).fill(w);
    await vul('Tarief in €/t, Installatie 1', '30');
    await vul('Ferro in €/t, Installatie 1', '150');
    await vul('Non-ferro in €/t, Installatie 1', '900');
    await page.getByRole('button', { name: '+ Installatie toevoegen' }).click();
    // Installatie 2 begint met de invoer van het gratis deel: zonder tarief is het totaal onvolledig.
    const totaalTegel = page.locator('.tegel.hero').filter({ hasText: /totaal/ });
    await expect(totaalTegel).toContainText('–');
    await vul('Verbrand in ton, Installatie 2', '50000');
    await vul('Tarief in €/t, Installatie 2', '30');
    await vul('Ferro in €/t, Installatie 2', '150');
    await vul('Non-ferro in €/t, Installatie 2', '900');
    // 47.580 + 23.790 = 71.370 netto opbrengst
    await expect(totaalTegel).toContainText('Netto opbrengst totaal');
    await expect(totaalTegel).toContainText('71.370');
    await expect(page.getByRole('region', { name: 'Tabel gevoeligheidsanalyse' })).toContainText('Verwerkingstarief');
    await geenHorizontaleScroll(page);

    const knop = page.getByRole('button', { name: 'CSV downloaden' }).nth(1);
    const [download] = await Promise.all([page.waitForEvent('download'), knop.click()]);
    const tekst = readFileSync((await download.path())!, 'utf8');
    expect(download.suggestedFilename()).toMatch(/^bodemassencalculator-pro-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(tekst).toContain('Installatie 2;50000;24,4');
    expect(tekst).toMatch(/Totaal;150000;.*;-71370/);
    await expect(page.getByRole('button', { name: /Rapport maken/ }).first()).toBeVisible();
  });

  test('Rekenmodel PMD: beide routes, omslag en CSV met herkomst', async ({ page }) => {
    await logInNaar(page, '/tools/pmd-rekenmodel');
    await expect(page.getByLabel('Inwoners', { exact: true })).toHaveValue('100000');
    await page.getByLabel('Teruggewonnen PMD', { exact: true }).fill('15');
    // bron: 2.100 t × (325 − 228 − 103,35) = −13.335 ; na: 16.800 × (119,85 − 17,26) − 1.500 × 103,35 = 1.568.487
    await expect(page.getByText(/bronscheiding €\s1\.581\.822 per jaar goedkoper/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Opbouw per route' })).toContainText('1.568.487');
    await expect(page.getByText('Opbrengst per inwoner')).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV downloaden' }).click()]);
    const tekst = readFileSync((await download.path())!, 'utf8');
    expect(tekst).toContain('Teruggewonnen PMD bij nascheiding (kg per inwoner);15;aanname gebruiker');
    expect(tekst).toContain('Netto per jaar (euro, negatief = opbrengst);-13335;1568487');
    expect(tekst).toContain('Inzamelvergoeding (euro per ton PMD);228;https://www.nvrd.nl/');

    // Gemeente kiezen vult CBS-cijfers in.
    const g = cbs.gemeenten.find((x: { code: string }) => x.code === 'GM0363');
    await page.getByLabel('Gemeente', { exact: true }).selectOption('GM0363');
    await expect(page.getByLabel('Inwoners', { exact: true })).toHaveValue(String(g.inwoners));
    await expect(page).toHaveURL(/gm=GM0363/);
    await geenHorizontaleScroll(page);
    await expect(page.getByRole('button', { name: /Rapport maken/ })).toBeVisible();
  });
});
