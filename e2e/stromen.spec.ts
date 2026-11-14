import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Afvalstromen: overzicht en stroompagina's. Verwachte waarden komen uit dezelfde databestanden als de site.
const lees = (pad: string) => JSON.parse(readFileSync(new URL(pad, import.meta.url), 'utf8'));
const landelijk = lees('../src/data/stromen-landelijk.json');
const gemeenten = lees('../public/data/stromen-gemeenten.json');
const nl = (n: number, d = 0) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
const STROMEN = ['restafval', 'gft', 'papier', 'pmd', 'textiel', 'glas', 'grof', 'luiers', 'kca'];

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

test.describe('Overzicht /stromen', () => {
  test('toont een blok per stroom met kerncijfer en een matrix met links', async ({ page }) => {
    await page.goto('/stromen');
    await expect(page.getByRole('heading', { level: 1, name: 'Afvalstromen' })).toBeVisible();
    await expect(page.locator('.stroomkaart')).toHaveCount(STROMEN.length);
    const gft = page.locator('.stroomkaart', { hasText: 'GFT' }).first();
    const laatste = landelijk.reeksen.gft.kg.at(-1);
    await expect(gft).toContainText(`${nl(laatste)} kg`);
    await expect(gft).toContainText('per inwoner in 2025');
    await expect(page.locator('.stromen-matrix tbody tr')).toHaveCount(STROMEN.length);
    const rij = page.locator('.stromen-matrix tbody tr', { hasText: 'Textiel' });
    await expect(rij.getByRole('link', { name: /Archief/ })).toHaveAttribute('href', '/aanbestedingsarchief?stroom=Textiel');
    await expect(rij.getByRole('link', { name: /Bibliotheek/ })).toHaveAttribute('href', '/aanbestedingsarchief/documenten?stroom=Textiel');
    await geenHorizontaleScroll(page);
  });
  test('linkt vanaf de Restafvalkaart en de Kennisbank naar het overzicht', async ({ page }) => {
    await page.goto('/restafvalkaart');
    await page.getByRole('link', { name: 'Bekijk per stroom' }).click();
    await expect(page).toHaveURL(/\/stromen$/);
    await page.goto('/kennisbank');
    await expect(page.getByRole('link', { name: 'Bekijk per stroom' })).toHaveAttribute('href', '/stromen');
  });
});

test.describe('Stroompagina', () => {
  test('GFT: kerncijfers met bron, ontwikkeling, kaart, tabel, tools en archief', async ({ page }) => {
    await page.goto('/stromen/gft');
    await expect(page.getByRole('heading', { level: 1, name: 'GFT' })).toBeVisible();
    const kern = page.locator('.ta-kern');
    await expect(kern).toContainText(`${nl(landelijk.reeksen.gft.kg.at(-1))} kg`);
    await expect(kern.getByRole('link', { name: /tabel 83558NED/ })).toBeVisible();
    await expect(kern).toContainText('Spreiding gemeenten 2024');

    // Ontwikkeling: grafiek met tekstalternatief en tabel
    const grafiek = page.locator('#ontwikkeling');
    await grafiek.locator('summary').click({ trial: true }).catch(() => undefined);
    await page.evaluate(() => document.querySelectorAll('details.blok').forEach((d) => ((d as HTMLDetailsElement).open = true)));
    await expect(grafiek.getByRole('img', { name: /Lijngrafiek van gft in kilo per inwoner/ })).toBeVisible();

    // Per gemeente: kaart, legenda, tabel; kiezen toont het landelijke gemiddelde ernaast
    const kaart = page.locator('#per-gemeente');
    await expect(kaart.locator('.svgkaart path[data-c]')).toHaveCount(gemeenten.gemeenten.length);
    await expect(kaart.locator('.legenda li')).toHaveCount(5 + (gemeenten.gemeenten.some((g: { gft: number | null }) => g.gft === null) ? 1 : 0));
    const tabel = kaart.locator('table');
    await expect(tabel.locator('tbody tr')).toHaveCount(25);
    await kaart.getByLabel('Zoek een gemeente of provincie').fill('utrecht');
    await expect(tabel.locator('tbody tr').first()).toContainText('Utrecht');
    await tabel.getByRole('button', { name: /Utrecht tonen op de kaart/ }).first().click();
    const paneel = kaart.locator('.gemeente-paneel');
    await expect(paneel.getByRole('heading', { name: 'Utrecht' })).toBeVisible();
    await expect(paneel).toContainText('Landelijk');
    const utrecht = gemeenten.gemeenten.find((g: { naam: string }) => g.naam === 'Utrecht');
    await expect(paneel).toContainText(`${nl(utrecht.gft)} kg`);

    // Tools en archief
    await expect(page.locator('#tools').getByRole('link', { name: 'Aanbestedingstool' })).toHaveAttribute('href', '/tools/aanbestedingstool?stroom=gft');
    await expect(page.locator('#aanbestedingen').getByRole('link', { name: /Aanbestedingsarchief, gefilterd op/ })).toHaveAttribute(
      'href',
      '/aanbestedingsarchief?stroom=GFT%20en%20etensresten',
    );
  });

  test('toetsenbord: de kaart is geen tabval', async ({ page }) => {
    await page.goto('/stromen/gft');
    await page.evaluate(() => document.querySelectorAll('details.blok').forEach((d) => ((d as HTMLDetailsElement).open = true)));
    await expect(page.locator('#per-gemeente .svgkaart path[data-c]').first()).toBeAttached();
    const focusbaar = await page.locator('#per-gemeente .svgkaart path').evaluateAll((ps) => ps.filter((p) => (p as SVGElement).tabIndex >= 0).length);
    expect(focusbaar).toBe(0);
  });

  test('verwerking en regels hebben bij elk feit een bron met link en peildatum; wat ontbreekt staat erbij', async ({ page }) => {
    await page.goto('/stromen/textiel');
    await page.evaluate(() => document.querySelectorAll('details.blok').forEach((d) => ((d as HTMLDetailsElement).open = true)));
    const verwerking = page.locator('#verwerking');
    await expect(verwerking).toContainText('Niet te onderbouwen');
    const feiten = verwerking.locator('.feiten > li');
    expect(await feiten.count()).toBeGreaterThan(0);
    for (const li of await feiten.all()) {
      await expect(li.locator('.bron-regel a').first()).toHaveAttribute('href', /^https:\/\//);
      await expect(li.locator('.bron-regel')).toContainText('Gelezen op 13 november 2026');
    }
    const regels = page.locator('#regels .regels > li');
    expect(await regels.count()).toBeGreaterThan(1);
    await expect(page.locator('#regels')).toContainText('geen juridisch advies');
    await expect(page.locator('#regels li').first()).toContainText('Voor een gemeente:');
  });

  test('restafval linkt naar de Heffingenscan van de gekozen gemeente', async ({ page }) => {
    await page.goto('/stromen/restafval?gemeente=GM0363');
    await page.evaluate(() => document.querySelectorAll('details.blok').forEach((d) => ((d as HTMLDetailsElement).open = true)));
    await expect(page.locator('#per-gemeente .gemeente-paneel').getByRole('heading', { name: 'Amsterdam' })).toBeVisible();
    await expect(page.locator('#per-gemeente .gemeente-paneel').getByRole('link', { name: /Heffingenscan voor Amsterdam/ })).toHaveAttribute('href', /^\/heffingenscan(\/|\?)/);
    // CBS-verdeling over verwerkingsmethoden
    await expect(page.locator('#verwerking')).toContainText('Scheiden achteraf');
  });

  test('aandachtspunten voor het contract komen uit de Aanbestedingstool en zijn gelabeld', async ({ page }) => {
    await page.goto('/stromen/pmd#contract');
    const blok = page.locator('#contract');
    await expect(blok).toContainText('geen juridisch advies');
    await expect(blok.locator('.criteria > li').first()).toBeVisible();
    await expect(blok.locator('.criteria')).toContainText(/Voorbeeld KplusV|MVI-criterium/);
  });

  test('publicaties bij de stroom en het kennisbankfilter', async ({ page }) => {
    await page.goto('/stromen/textiel#publicaties');
    await expect(page.locator('#publicaties .publicaties > li').first()).toBeVisible();
    await page.getByRole('link', { name: /Alle publicaties over textiel/ }).click();
    await expect(page).toHaveURL(/\/kennisbank\?stroom=textiel/);
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => ((d as HTMLDetailsElement).open = true)));
    await expect(page.getByLabel('Afvalstroom')).toHaveValue('textiel');
  });

  test('een onbekende stroom geeft de pagina niet gevonden', async ({ page }) => {
    await page.goto('/stromen/bestaatniet');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/niet gevonden/i);
  });

  for (const id of ['restafval', 'pmd', 'textiel', 'luiers']) {
    test(`geen horizontale scroll op ${id}, ook met alle blokken open`, async ({ page }) => {
      await page.goto(`/stromen/${id}`);
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => ((d as HTMLDetailsElement).open = true)));
      await page.waitForTimeout(500);
      await geenHorizontaleScroll(page);
    });
  }
});
