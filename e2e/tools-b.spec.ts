import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Bodemassencalculator, Rekenmodel PMD en Aanbestedingstool (onderdeel tools-b, ronde 3):
// uitkomst bij binnenkomst als bandbreedte met het voorbehoud in de uitkomstzin, een stellige uitkomst pas met een eigen
// tarief, bron en peildatum onder de uitkomst, controles op onmogelijke invoer, CSV met status en afgeronde bedragen,
// tekstexport, deellink, betaalmuur, MVI-codes alleen bij de eigen productgroep, drempels per soort opdracht en print.

const cbs = JSON.parse(readFileSync(new URL('../src/data/tools-b-cbs-pmd.json', import.meta.url), 'utf8'));
const nl = (n: number) => new Intl.NumberFormat('nl-NL').format(n);

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

async function leesDownload(page: Page, knop: string, n = 0) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: knop }).nth(n).click()]);
  const pad = await download.path();
  return { naam: download.suggestedFilename(), tekst: readFileSync(pad!, 'utf8') };
}

/** Opent een inklapbaar blok op de kop. */
async function klapOpen(page: Page, kop: string | RegExp) {
  const details = page.locator('details.tb-uitklap').filter({ has: page.getByRole('heading', { name: kop }) }).first();
  if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) await details.locator('summary').first().click();
}

const hero = (page: Page) => page.locator('.tegel.hero').first();

test.describe('Bodemassencalculator', () => {
  test('toont bij binnenkomst een indicatieve bandbreedte met het voorbehoud in de uitkomstzin', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await expect(page.getByRole('heading', { level: 1, name: 'Bodemassencalculator' })).toBeVisible();
    await geenHorizontaleScroll(page);

    // Gemiddelde AVI 2024: 494.000 t × 24,4 % = 120.536 t.
    // laag: × € 10 + 4.580 t residu × (€ 30 + € 40,85) = 1.529.879 ; hoog: × € 12,19 + 18.080 t × (€ 48,76 + € 40,85) = 3.089.519
    await expect(page.getByLabel('Verbrand afval', { exact: true })).toHaveValue('494000');
    await expect(hero(page)).toContainText('Netto kosten per jaar (indicatief)');
    await expect(hero(page)).toContainText(/€\s1,53 mln tot €\s3,09 mln/);
    await expect(page.locator('.tb-kern')).toContainText('121.000 ton ruwe bodemas');
    await expect(page.locator('.tb-kern')).toContainText('Indicatief, op basis van één kostenschatting uit de nota van toelichting');
    await expect(page.locator('.tb-kern')).toContainText('geen markttarief');
    await expect(page.locator('.tb-uitkomst .badge').first()).toHaveText('Indicatief');
    await expect(page.getByText('Nog in te vullen voor bedragen')).toHaveCount(0);
    // Bronnen direct onder de uitkomst.
    await expect(page.locator('.tb-uitkomstbron').getByRole('link', { name: /Rijkswaterstaat/ })).toHaveAttribute('href', /verenigingafvalbedrijven\.nl/);
    await expect(page.locator('.tb-uitkomstbron').getByRole('link', { name: /Staatsblad 2021, 235/ })).toHaveAttribute('href', /stb-2021-235/);
    // Residu-aanname uitgelegd.
    await klapOpen(page, 'Waarom een bandbreedte?');
    await expect(page.getByText(/ongeveer 15 % residu/)).toBeVisible();

    // Eigen tarief: pas dan een stellige uitkomst. 120.536 × 18 + 4.580,4 × 83,51 = 2.552.154
    const opwerking = page.getByLabel('Uw netto opwerkingskosten (tarief min metaalopbrengst)', { exact: true });
    await expect(opwerking).toHaveValue('12,19');
    await expect(page.getByText('Kental uit 2021, indicatief: vul eigen tarief in')).toBeVisible();
    await opwerking.fill('18');
    await expect(page.locator('.tb-kern')).toContainText(/Met uw tarief kosten opwerken en residu storten netto ongeveer €\s2,55 mln per jaar/);
    await expect(hero(page)).toContainText('Netto kosten per jaar');
    await expect(hero(page)).not.toContainText('indicatief');
    await expect(page.locator('.tb-uitkomst .badge').first()).toHaveText('Met uw tarief');
    await expect(page.locator('.tb-band')).toContainText('Bandbreedte');
    await page.getByRole('button', { name: /Terug naar bronwaarde \(€\s12,19\)/ }).click();
    await expect(hero(page)).toContainText('(indicatief)');

    // Kentallen staan ingeklapt, met bron en peildatum.
    await klapOpen(page, 'Aandelen bodemas en metalen');
    await expect(page.getByLabel('Aandeel ruwe bodemas', { exact: true })).toHaveValue('24,4');
    await expect(page.getByRole('link', { name: /Rijkswaterstaat, Afvalverwerking in Nederland 2024/ }).first()).toHaveAttribute('href', /verenigingafvalbedrijven\.nl/);
    await klapOpen(page, 'Kosten van opwerken en storten');
    await expect(page.getByRole('link', { name: 'Staatsblad 2021, 235 en CBS-CPI' }).first()).toHaveAttribute('href', /officielebekendmakingen\.nl\/stb-2021-235/);
    await expect(page.getByLabel('Stortbelasting', { exact: true })).toHaveValue('40,85');

    // Bronnenlijst via het anker.
    await page.getByRole('navigation', { name: 'Op deze pagina' }).getByRole('link', { name: 'Bronnen' }).click();
    await expect(page.getByText('Netto opwerkingskosten').last()).toBeVisible();
    await expect(page.locator('.tb-bronlijst')).toContainText(/peildatum \d+ \w+ 20\d\d/);
    await geenHorizontaleScroll(page);
  });

  test('meldt onmogelijke invoer en een ongeldig veld', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await klapOpen(page, 'Aandelen bodemas en metalen');
    await page.getByLabel('Aandeel ferro', { exact: true }).fill('95');
    await expect(page.getByRole('alert').filter({ hasText: 'Controleer de invoer' })).toContainText('meer dan 100 %');
    await page.getByLabel('Aandeel ferro', { exact: true }).fill('6,9');
    await expect(page.getByText('Controleer de invoer')).toHaveCount(0);

    await page.getByLabel('Aandeel ruwe bodemas', { exact: true }).fill('45');
    await expect(page.getByText(/wijkt sterk af van het landelijke beeld/)).toBeVisible();

    await page.getByLabel('Verbrand afval', { exact: true }).fill('99000000000');
    await expect(page.getByText(/meer dan alles wat in Nederland in een jaar wordt verbrand/)).toBeVisible();

    await page.getByLabel('Verbrand afval', { exact: true }).fill('-5');
    await expect(page.getByText('Minimaal 0.')).toBeVisible();
    await expect(page.getByText(/De uitkomst is niet bijgewerkt: verbrand afval/)).toBeVisible();
  });

  test('rekent met eigen contract, met CSV, deellink en terugzetknop', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await page.getByLabel('Verbrand afval', { exact: true }).fill('100000');
    await page.getByRole('radio', { name: 'Met mijn contract: tarief en metaalprijzen' }).check();
    await expect(hero(page)).toContainText('–');
    await expect(page.getByText('Nog in te vullen voor bedragen')).toBeVisible();
    await page.getByLabel('Verwerkingstarief opwerker', { exact: true }).fill('30');
    await page.getByLabel('Opbrengst ferro', { exact: true }).fill('150');
    await page.getByLabel('Opbrengst non-ferro', { exact: true }).fill('900');
    await klapOpen(page, 'Kosten van opwerken en storten');
    await page.getByLabel('Residu dat wordt gestort', { exact: true }).fill('0');
    // kosten 24.400 × 30 = 732.000 ; opbrengst 1.683,6 × 150 + 585,6 × 900 = 779.580 → netto opbrengst 47.580
    // Met eigen contractbedragen: stellige uitkomst, afgerond.
    await expect(hero(page)).toContainText('Netto opbrengst per jaar');
    await expect(hero(page)).toContainText(/48\.000/);
    await expect(hero(page)).toContainText('opbrengst per ton verbrand');
    await expect(page.locator('.tb-kern')).toContainText('Met uw tarief levert opwerken netto ongeveer');
    await expect(page).toHaveURL(/wijze=contract/);

    const { naam, tekst } = await leesDownload(page, 'CSV downloaden');
    expect(naam).toMatch(/^bodemassencalculator-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(tekst).toContain('Invoer;Waarde;Status;Herkomst');
    expect(tekst).toContain('Verwerkingstarief (euro per ton ruwe bodemas);30;eigen waarde;uw contract');
    expect(tekst).toContain('Aandeel ruwe bodemas (% van verbrand);24,4;kental;kental Rijkswaterstaat 2024');
    expect(tekst).toContain('Uitkomst;met uw eigen tarief');
    expect(tekst).toContain('Netto kosten (euro per jaar, negatief = opbrengst);-48000');
    expect(tekst).toContain('officielebekendmakingen.nl/stb-2021-235');

    // Afwijken van de bron en terugzetten.
    await page.getByRole('button', { name: /Terug naar bronwaarde \(3,8 %\)/ }).click();
    await expect(page.getByLabel('Residu dat wordt gestort', { exact: true })).toHaveValue('3,8');

    // Deellink herstelt de invoer.
    await page.getByText('Deellink tonen').first().click();
    const link = await page.getByLabel('Deellink met uw invoer').first().inputValue();
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(page.getByLabel('Opbrengst non-ferro', { exact: true })).toHaveValue('900');
    await expect(page.getByRole('radio', { name: 'Met mijn contract: tarief en metaalprijzen' })).toBeChecked();
    await geenHorizontaleScroll(page);
  });

  test('vult het tonnage met CBS-cijfers van een gemeente', async ({ page }) => {
    const g = cbs.gemeenten.find((x: { code: string }) => x.code === 'GM0363');
    await page.goto('/tools/bodemassencalculator');
    await page.getByLabel('Gemeente of gemiddelde AVI').selectOption('GM0363');
    const ton = Math.round((g.inwoners * g.restafvalKgPerInw) / 1000);
    await expect(page.getByLabel('Verbrand afval', { exact: true })).toHaveValue(String(ton));
    await expect(page).toHaveURL(/gm=GM0363/);
    await expect(page.locator('.tb-kern')).toContainText(`${nl(ton)} ton verbrand afval`);
  });

  test('Pro zit apart achter de betaalmuur', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await expect(page.getByRole('heading', { name: 'Voor leden: meerdere installaties en gevoeligheid' })).toBeVisible();
    await expect(page.locator('.slotkaart').getByRole('heading', { name: /Bodemassencalculator Pro/ })).toBeVisible();
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
    await expect(page.locator('.vergrendeld-preview')).toContainText('Installatie 1');
  });

  test('printweergave opent de ingeklapte blokken', async ({ page }) => {
    await page.goto('/tools/bodemassencalculator');
    await expect(hero(page)).toContainText('mln');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.rapportkop')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tabel bodemas en metalen per jaar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CSV downloaden' }).first()).toBeHidden();
  });
});

test.describe('Rekenmodel bron- en nascheiding PMD', () => {
  test('toont de staffel en bronnen openbaar, het model alleen voor leden', async ({ page }) => {
    await page.goto('/tools/pmd-rekenmodel');
    await expect(page.getByRole('heading', { level: 1, name: 'Rekenmodel bron- en nascheiding PMD' })).toBeVisible();
    await geenHorizontaleScroll(page);
    await klapOpen(page, 'Staffel inzamelvergoeding 2026–2028');
    const staffel = page.getByRole('region', { name: 'Tabel staffel inzamelvergoeding' });
    await expect(staffel).toContainText(/325/);
    await expect(staffel).toContainText(/163/);
    await expect(page.getByRole('link', { name: /onderhandelingsresultaat Verpact, VNG en NVRD/ })).toHaveAttribute('href', /nvrd\.nl/);
    await klapOpen(page, 'Bronnen en peildatum');
    await expect(page.locator('.tb-bronlijst')).toContainText('IPR Normag');
    await expect(page.locator('.slotkaart').getByRole('heading', { name: /Rekenmodel bron- en nascheiding PMD/ })).toBeVisible();
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
  });

  test('rekent in de preview met CBS-cijfers van de gemeente uit de link', async ({ page }) => {
    const g = cbs.gemeenten.find((x: { code: string }) => x.code === 'GM1680');
    await page.goto('/tools/pmd-rekenmodel?gm=GM1680&cat=1&tn=10');
    const preview = page.locator('.vergrendeld-preview');
    await expect(preview.getByLabel('Gemeente', { exact: true })).toHaveValue('GM1680');
    const ton = Math.round((g.inwoners * g.pmdKgPerInw) / 1000);
    await expect(preview).toContainText(`${nl(ton)} t PMD`);
    await expect(preview.getByLabel('Inzamelvergoeding Verpact', { exact: true })).toHaveValue('325');
    await expect(preview.getByLabel('Teruggewonnen PMD', { exact: true })).toHaveValue('10');
    await expect(preview.locator('.tb-kern')).toContainText('goedkoper');
    await expect(page).toHaveURL(/gm=GM1680/);
  });
});

test.describe('Aanbestedingstool', () => {
  test('doorloopt opdracht, criteria, weging en overzicht en downloadt het resultaat', async ({ page }) => {
    await page.goto('/tools/aanbestedingstool');
    await expect(page.getByRole('heading', { level: 1, name: 'Aanbestedingstool' })).toBeVisible();
    await geenHorizontaleScroll(page);

    // Restafval met tariefkental: raming als bandbreedte (40.000 t × 7 jaar × € 95,85 tot € 110,85).
    await expect(page.getByText('€ 26.838.000 tot € 31.038.000')).toBeVisible();
    // Bron van het tariefkental bij de raming; de vaste balk verschijnt pas vanaf stap 2 (niet over de stroomkeuze).
    await expect(page.getByRole('link', { name: /Strategy&/ }).first()).toBeVisible();
    await expect(page.locator('.ab-vast')).toHaveCount(0);

    // GFT, eigen tarief → één bedrag en drempeltoets.
    await page.getByRole('radio', { name: /GFT-afval/ }).check();
    await expect(page.getByLabel('Geraamd tarief', { exact: true })).toHaveValue('');
    await expect(page.getByText('Vul een geraamd tarief in')).toBeVisible();
    await page.getByLabel('Geraamd tarief', { exact: true }).fill('80');
    // 40.000 t × € 80 × (5 + 2) jaar = € 22.400.000
    await expect(page.getByText(/22\.400\.000/).first()).toBeVisible();
    await expect(page.getByText('Europees aanbesteden.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /PIANOo, drempelbedragen 2026 en 2027/ })).toHaveAttribute('href', /pianoo\.nl/);

    // Soort opdracht: 1.000 t × € 80 × 7 = € 560.000 → boven 216.000, onder de concessiedrempel van 5.404.000.
    await page.getByLabel('Volume', { exact: true }).fill('1000');
    await expect(page.getByText('Europees aanbesteden.', { exact: true })).toBeVisible();
    await page.getByLabel('Soort opdracht').selectOption('concessie');
    await expect(page.getByText('Onder de Europese drempel.', { exact: true })).toBeVisible();
    await expect(page.locator('.notitie').filter({ hasText: 'Onder de Europese drempel.' })).toContainText('€ 5.404.000');
    await page.getByLabel('Soort opdracht').selectOption('diensten');
    await page.getByLabel('Volume', { exact: true }).fill('40000');
    await page.getByRole('button', { name: 'Volgende: eisen en criteria' }).click();

    // Stap 2: MVI-criteria met code en link; gedetailleerde methode erbij kiezen.
    await expect(page.getByRole('heading', { name: 'Stap 2 · Eisen en criteria' })).toBeFocused();
    await expect(page.locator('.ab-vast')).toContainText('Raming');
    // MVI-overzicht met directe link naar de productgroep.
    await expect(page.locator('.ab-mvi-overzicht')).toContainText('Productgroep Verwerking huishoudelijk afval');
    await expect(page.locator('.ab-mvi-overzicht')).toContainText('049.006');
    await expect(page.locator('.ab-mvi-overzicht').getByRole('link')).toHaveAttribute('href', 'https://www.mvicriteria.nl/nl/webtool?product_group=54&cluster=5');
    await expect(page.getByText('MVI 049.006 · Significant')).toBeVisible();
    await page.evaluate(() => document.querySelectorAll<HTMLDetailsElement>('details.ab-meer').forEach((d) => (d.open = true)));
    // De link gaat naar de productgroep en zegt dat ook.
    await expect(page.getByRole('link', { name: /Productgroep Verwerking huishoudelijk afval in de MVI-criteriatool \(zoek op 049\.006\)/ })).toHaveAttribute(
      'href',
      'https://www.mvicriteria.nl/nl/webtool?product_group=54&cluster=5',
    );
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
    expect(txt.tekst).toContain('Soort opdracht: Diensten of leveringen');
    expect(txt.tekst).toContain('Herkomst: MVI 049.006 (Significant) – https://www.mvicriteria.nl/nl/webtool?product_group=54&cluster=5');
    expect(txt.tekst).toContain('[ ] De geraamde waarde ligt op of boven het drempelbedrag');

    const csv = await leesDownload(page, 'CSV downloaden');
    expect(csv.tekst).toContain('Weging;Procent');
    expect(csv.tekst).toMatch(/\r\nPrijs;\d+\r\n/);
    expect(csv.tekst).toContain('Gunningscriterium;Klimaat;CO2-score van de GFT-verwerking, gedetailleerde methode');

    // Deellink opent het overzicht met dezelfde keuzes.
    await page.getByText('Deellink tonen').click();
    const link = await page.getByLabel('Deellink met uw invoer').inputValue();
    expect(link).toContain('stroom=gft');
    expect(link).toContain('type=diensten');
    expect(link).toContain('gft-co2-detail');
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(page.getByRole('heading', { name: 'Stap 4 · Overzicht' })).toBeVisible();
    await expect(page.getByText('Officieel MVI-criterium 049.007, ambitieniveau ambitieus.')).toBeVisible();

    // Printweergave: rapportkop zichtbaar, knoppen en vaste balk weg.
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.rapportkop')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Printen of opslaan als PDF' })).toBeHidden();
    await expect(page.locator('.ab-vast')).toBeHidden();
  });

  test('koppelt MVI-codes alleen aan de eigen productgroep (textiel)', async ({ page }) => {
    await page.goto('/tools/aanbestedingstool?stroom=textiel&stap=2');
    await expect(page.locator('.ab-mvi-overzicht')).toContainText('Voor deze stroom bestaat geen MVI-productgroep');
    await expect(page.getByText('Ontleend aan MVI 049.012 · andere productgroep')).toBeVisible();
    await expect(page.getByText(/^MVI 049\.\d{3} · /)).toHaveCount(0);
    await page.getByLabel('Alleen officiële MVI-criteria').check();
    await expect(page.getByText('Geen criteria bij deze filters.')).toBeVisible();
    await page.getByLabel('Alleen officiële MVI-criteria').uncheck();
    await page.getByRole('button', { name: 'Stap 4: Overzicht' }).click();
    await expect(page.getByText(/Voor textiel bestaat geen MVI-productgroep/).first()).toBeVisible();
    const txt = await leesDownload(page, 'Tekstbestand downloaden');
    expect(txt.tekst).toContain('Herkomst: MVI 049.012 (Basis), ontleend aan productgroep Verwerking huishoudelijk afval; voor deze stroom bestaat geen MVI-productgroep');
  });

  test('zoekt op trefwoord, signaleert een onwaarschijnlijke raming en houdt een leeg tarief leeg', async ({ page }) => {
    await page.goto('/tools/aanbestedingstool');
    await page.getByLabel('Volume', { exact: true }).fill('50.000.000');
    await expect(page.getByText(/groter dan al het fijne huishoudelijke restafval in Nederland/)).toBeVisible();
    await page.getByLabel('Volume', { exact: true }).fill('0');
    await page.getByRole('button', { name: 'Stap 2: Eisen en criteria' }).click();
    await expect(page.locator('.ab-vast')).toContainText('vul in stap 1 een volume in');
    await page.getByRole('button', { name: 'Stap 1: Opdracht' }).click();
    await page.getByLabel('Volume', { exact: true }).fill('40000');
    await page.getByRole('radio', { name: /^PMD/ }).check();
    await expect(page.getByLabel('Geraamd tarief', { exact: true })).toHaveValue('');
    await expect(page.getByText('Nog niet ingevuld').first()).toBeVisible();

    // Direct naar stap 2 via de stappenbalk.
    await page.getByRole('button', { name: 'Stap 2: Eisen en criteria' }).click();
    await expect(page.getByRole('heading', { name: 'Stap 2 · Eisen en criteria' })).toBeFocused();
    const zoek = page.getByLabel('Zoeken in eisen en criteria');
    const alle = await page.locator('.ab-criterium').count();
    await zoek.fill('social return');
    const gevonden = await page.locator('.ab-criterium').count();
    expect(gevonden).toBeGreaterThan(0);
    expect(gevonden).toBeLessThan(alle);
    await expect(page.getByText(new RegExp(`${gevonden} van ${alle} getoond`))).toBeVisible();
    await zoek.fill('xyzonbekend');
    await expect(page.getByText('Geen criteria bij deze filters.')).toBeVisible();
    await zoek.fill('');
    await expect(page.locator('.ab-criterium')).toHaveCount(alle);
    await geenHorizontaleScroll(page);

    // Deellink: PMD zonder tarief blijft zonder tarief, ook al heeft de standaardstroom een kental.
    await page.getByRole('button', { name: 'Stap 4: Overzicht' }).click();
    await expect(page.getByText('niet te bepalen zonder tarief')).toBeVisible();
    await page.getByText('Deellink tonen').click();
    const link = await page.getByLabel('Deellink met uw invoer').inputValue();
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(page.getByRole('heading', { name: 'Stap 4 · Overzicht' })).toBeVisible();
    await expect(page.getByText('niet te bepalen zonder tarief')).toBeVisible();

    // Een link met alleen een andere stroom krijgt de standaardselectie van die stroom.
    await page.goto('/tools/aanbestedingstool?stroom=gft&stap=2');
    await expect(page.getByRole('checkbox', { name: 'CO2-score van de GFT-verwerking, basismethode' })).toBeChecked();
    await expect(page.getByLabel('Geraamd tarief', { exact: true })).toHaveCount(0);
  });
});

test('Overzicht rekentools noemt per tool de bronnen', async ({ page }) => {
  await page.goto('/tools');
  await expect(page.getByRole('heading', { level: 1, name: 'Rekentools' })).toBeVisible();
  await expect(page.getByText(/Rijkswaterstaat, Afvalverwerking in Nederland 2024/)).toBeVisible();
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
    await expect(page.locator('.slotkaart')).toHaveCount(0, { timeout: 15_000 });
  }

  test('Bodemassencalculator Pro: meerdere installaties, totaal, gevoeligheid en CSV', async ({ page }) => {
    await logInNaar(page, '/tools/bodemassencalculator');
    await page.getByRole('button', { name: '+ Installatie toevoegen' }).click();
    await page.getByLabel('Verbrand in ton, Installatie 2', { exact: true }).fill('50000');
    // 1.851.840,37 (gemiddelde AVI) + 50.000 t: 12.200 × 12,19 + 463,6 × 83,51 = 187.433,24 → 2.039.274
    const totaalTegel = page.locator('.tegel.hero').filter({ hasText: /totaal/ });
    await expect(totaalTegel).toContainText('Netto kosten totaal (indicatief)');
    await expect(totaalTegel).toContainText(/€\s2,04 mln/);
    await expect(page.getByText(/Indicatief voor Installatie 1, Installatie 2/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tabel gevoeligheidsanalyse' })).toContainText('Netto opwerkingskosten');
    await geenHorizontaleScroll(page);

    const { naam, tekst } = await leesDownload(page, 'CSV downloaden', 1);
    expect(naam).toMatch(/^bodemassencalculator-pro-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(tekst).toContain('Installatie 2;50000;24,4;12,19;3,8;42,66');
    expect(tekst).toMatch(/Totaal;544000;.*;2039273,6/);
    await expect(page.getByRole('button', { name: /Rapport maken/ }).first()).toBeVisible();
  });

  test('Rekenmodel PMD: indicatief bij binnenkomst, conclusie pas met eigen nascheidingstarief, controle en CSV', async ({ page }) => {
    await logInNaar(page, '/tools/pmd-rekenmodel');
    await expect(page.getByLabel('Inwoners', { exact: true })).toHaveValue('100000');
    // Kental nascheidingskosten zonder vaste eenheid: geen conclusie, wel bandbreedte en omslagpunt.
    // bron: 2.100 t × (325 − 228 − 103,35) = −13.335 ; omslag k = (−13.335 + 2.000 × 103,35) / 16.800 + 17,26 = 28,77
    const kern = page.locator('.tb-kern');
    await expect(kern).toContainText('Indicatief, want de nascheidingskosten zijn een kental zonder vaste eenheid in de bron');
    await expect(kern).not.toContainText('Met uw nascheidingstarief');
    await expect(kern).not.toContainText('hoeveel PMD er ook');
    await expect(hero(page)).toContainText('Omslagpunt nascheidingstarief');
    await expect(hero(page)).toContainText(/€\s29 per ton/);
    await expect(page.locator('.tb-uitkomst .badge').first()).toHaveText('Indicatief');
    await expect(page.getByText('Kental, eenheid onzeker: vul eigen tarief in')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Opbouw per route' })).toContainText(/€\s290\.000 tot €\s2,01 mln/);
    await expect(page.locator('.tb-uitkomstbron').getByRole('link', { name: /akkoord Verpact/ })).toHaveAttribute('href', /nvrd\.nl/);

    const indicatief = await leesDownload(page, 'CSV downloaden');
    expect(indicatief.tekst).toContain('Invoer;Waarde;Status;Herkomst');
    expect(indicatief.tekst).toContain('Nascheidingskosten (euro per ton restafval);119,85;kental, eenheid onzeker');
    expect(indicatief.tekst).toContain('Verschil nascheiding − bronscheiding (euro, positief = bronscheiding goedkoper);zie bandbreedte');
    expect(indicatief.tekst).toContain('Omslagpunt nascheidingstarief (euro per ton restafval);28,77');

    // Eigen tarief € 45: na = 16.800 × (45 − 17,26) − 2.000 × 103,35 = 259.332 ; verschil 272.667
    await page.getByLabel('Tarief van uw nascheider (nascheidingskosten)', { exact: true }).fill('45');
    await expect(kern).toContainText(/Met uw nascheidingstarief is bronscheiding ongeveer €\s273\.000 per jaar goedkoper/);
    await expect(kern).toContainText('binnen de bronwaarden');
    await expect(hero(page)).toContainText('Voordeel bronscheiding');
    await expect(page.locator('.tb-uitkomst .badge').first()).toHaveText('Met uw tarief');
    await expect(page.getByRole('region', { name: 'Opbouw per route' })).toContainText('Bandbreedte');

    await klapOpen(page, 'Nascheiding');
    await page.getByLabel('Teruggewonnen PMD', { exact: true }).fill('400');
    await expect(page.getByRole('alert').filter({ hasText: 'Controleer de invoer' })).toContainText('Dat kan niet');
    await page.getByLabel('Teruggewonnen PMD', { exact: true }).fill('15');

    const { tekst } = await leesDownload(page, 'CSV downloaden');
    expect(tekst).toContain('Teruggewonnen PMD bij nascheiding (kg per inwoner);15;eigen waarde');
    expect(tekst).toContain('Nascheidingskosten (euro per ton restafval);45;eigen waarde');
    // na: 259.332 + 500 × 103,35 = 311.007 → afgerond 311.000
    expect(tekst).toContain('Netto per jaar (euro, negatief = opbrengst);-13000;311000');
    expect(tekst).toContain('Inzamelvergoeding (euro per ton PMD);228;officieel;https://www.nvrd.nl/');

    // Ongeldig aantal inwoners: melding dat de uitkomst niet is bijgewerkt.
    await page.getByLabel('Inwoners', { exact: true }).fill('0');
    await expect(page.getByText('Minimaal 1.')).toBeVisible();
    await expect(page.getByText(/De uitkomst is niet bijgewerkt: inwoners/)).toBeVisible();

    // Gemeente kiezen vult CBS-cijfers in.
    const g = cbs.gemeenten.find((x: { code: string }) => x.code === 'GM0363');
    await page.getByLabel('Gemeente', { exact: true }).selectOption('GM0363');
    await expect(page.getByLabel('Inwoners', { exact: true })).toHaveValue(String(g.inwoners));
    await expect(page).toHaveURL(/gm=GM0363/);
    await geenHorizontaleScroll(page);
    await expect(page.getByRole('button', { name: /Rapport maken/ })).toBeVisible();
  });
});
