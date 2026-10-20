import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Echte inhoud: Restafvalkaart (CBS + PDOK), nieuws uit RSS-feeds, kennisbank en homepage.
// De verwachte waarden komen uit dezelfde databestanden als de site, zodat de test na een update blijft kloppen.

const lees = (pad: string) => JSON.parse(readFileSync(new URL(pad, import.meta.url), 'utf8'));
const afval = { ...lees('../src/data/afval-bron.json'), ...lees('../src/data/afval-gemeenten.json') };
const nieuws = lees('../src/data/nieuws.json');
const kennisbankBron = readFileSync(new URL('../src/data/kennisbank.ts', import.meta.url), 'utf8');
const kennisbankUrls = [...kennisbankBron.matchAll(/url: '([^']+)'/g)].map((m) => m[1]);

type Gem = { code: string; naam: string; provincie: string; restafval: number; scheidingsPct: number | null };
const gem = (code: string): Gem => afval.gemeenten.find((g: Gem) => g.code === code);
const nl = (n: number, d = 0) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

test.describe('Restafvalkaart', () => {
  test('tekent alle gemeenten als vlakken met legenda en bron', async ({ page }) => {
    await page.goto('/restafvalkaart');
    await expect(page.getByRole('heading', { level: 1, name: 'Restafvalkaart van Nederland' })).toBeVisible();
    await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(afval.gemeenten.length);
    await expect(page.locator('.legenda')).toContainText('Restafval per inwoner');
    await expect(page.locator('.legenda li')).toHaveCount(5);

    // Standaard: Amsterdam, met het echte CBS-cijfer.
    const ams = gem('GM0363');
    const paneel = page.locator('.gemeente-paneel');
    await expect(paneel.getByRole('heading', { level: 2, name: ams.naam })).toBeVisible();
    await expect(paneel.locator('.tegel.hero')).toContainText(`${nl(ams.restafval)} kg`);

    // Bron en peiljaar zichtbaar, met link naar CBS.
    const bron = page.locator('#bron');
    await expect(bron).toContainText(`Peiljaar ${afval.peiljaar}`);
    await expect(bron.getByRole('link', { name: /83452NED/ })).toHaveAttribute('href', afval.bron.url);
    await expect(bron.getByRole('link', { name: /CBS Gebiedsindelingen/ })).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('zoeken op gemeente kiest de gemeente en linkt naar het aanbestedingsarchief', async ({ page }) => {
    await page.goto('/restafvalkaart');
    const utrecht = gem('GM0344');
    await page.getByLabel('Zoek een gemeente').fill('utrec');
    await page.getByRole('list', { name: 'Gevonden gemeenten' }).getByRole('button', { name: /^Utrecht/ }).first().click();
    const paneel = page.locator('.gemeente-paneel');
    await expect(paneel.getByRole('heading', { level: 2, name: 'Utrecht' })).toBeFocused();
    await expect(page).toHaveURL(/gemeente=GM0344/);
    await expect(paneel.locator('.tegel.hero')).toContainText(`${nl(utrecht.restafval)} kg`);
    await expect(paneel.getByRole('link', { name: /aanbestedingsarchief/ })).toHaveAttribute('href', '/aanbestedingsarchief?zoek=Utrecht');

    // Zoeken met Enter op een naam met accent en "'s-".
    await page.getByLabel('Zoek een gemeente').fill('s-hertogenbosch');
    await page.getByLabel('Zoek een gemeente').press('Enter');
    await expect(paneel.getByRole('heading', { level: 2, name: "'s-Hertogenbosch" })).toBeVisible();

    // Onbekende naam geeft een melding.
    await page.getByLabel('Zoek een gemeente').fill('Atlantis');
    await page.getByRole('button', { name: 'Toon' }).click();
    await expect(page.getByText('Geen gemeente gevonden voor “Atlantis”.')).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('andere indicator kleurt de kaart en sorteert de tabel', async ({ page }) => {
    await page.goto('/restafvalkaart');
    await page.getByRole('button', { name: 'Gescheiden ingezameld' }).click();
    await expect(page).toHaveURL(/toon=scheidingsPct/);
    await expect(page.locator('.legenda figcaption')).toContainText('Gescheiden ingezameld');
    // Tabel staat nu gesorteerd op hoogste scheidingspercentage.
    const hoogste = [...afval.gemeenten].filter((g: Gem) => g.scheidingsPct !== null).sort((a: Gem, b: Gem) => b.scheidingsPct! - a.scheidingsPct!)[0];
    await expect(page.locator('#tabel tbody tr').first().locator('th')).toHaveText(hoogste.naam);
  });

  test('tabelweergave: filter, kiezen en CSV', async ({ page }) => {
    await page.goto('/restafvalkaart');
    const tabel = page.locator('#tabel');
    await expect(tabel.locator('tbody tr')).toHaveCount(afval.gemeenten.length);
    await tabel.getByLabel('Provincie').selectOption('Zeeland');
    const zeeland = afval.gemeenten.filter((g: Gem) => g.provincie === 'Zeeland');
    await expect(tabel.locator('tbody tr')).toHaveCount(zeeland.length);
    await tabel.getByRole('button', { name: `${zeeland[0].naam} tonen op de kaart` }).click();
    await expect(page.locator('.gemeente-paneel').getByRole('heading', { level: 2, name: zeeland[0].naam })).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), tabel.getByRole('button', { name: 'Download als CSV' }).click()]);
    expect(download.suggestedFilename()).toBe(`restafval-gemeenten-${afval.peiljaar}-zeeland.csv`);
    const csv = readFileSync((await download.path())!, 'utf8');
    expect(csv.split('\r\n')).toHaveLength(zeeland.length + 1);
    expect(csv).toContain(`${zeeland[0].code};${zeeland[0].naam};Zeeland;`);
  });

  test('klikken op een gemeente op de kaart kiest die gemeente', async ({ page }, info) => {
    test.skip(info.project.name === 'mobiel-400', 'Klik op coördinaten alleen op desktop; mobiel is gedekt via zoeken en tabel.');
    await page.goto('/restafvalkaart?gemeente=GM0363');
    await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(afval.gemeenten.length);
    const vak = page.locator('.leaflet-vak');
    const box = (await vak.boundingBox())!;
    // Midden van Nederland valt in een gemeente; welke precies maakt niet uit.
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.55);
    await expect(page).not.toHaveURL(/gemeente=GM0363/);
    await expect(page.locator('.leaflet-tooltip')).toBeVisible();
  });

  test('als de grenzen niet laden, blijft de tabel bruikbaar', async ({ page }) => {
    await page.route('**/data/gemeentegrenzen.geojson', (r) => r.abort());
    await page.goto('/restafvalkaart');
    await expect(page.getByRole('alert')).toContainText('De kaartgrenzen konden niet worden geladen');
    await expect(page.locator('#tabel tbody tr')).toHaveCount(afval.gemeenten.length);
  });
});

test.describe('Nieuws', () => {
  test('toont echte berichten met datum, bron en link naar het origineel', async ({ page }) => {
    await page.goto('/nieuws');
    await expect(page.getByRole('heading', { level: 1, name: 'Nieuws' })).toBeVisible();
    const eerste = nieuws.berichten[0];
    const artikel = page.locator('article.bericht').first();
    await expect(artikel.getByRole('link', { name: eerste.titel })).toHaveAttribute('href', eerste.link);
    await expect(artikel).toContainText(`Bron: ${eerste.bron}`);
    await expect(artikel.locator('time')).toHaveAttribute('datetime', eerste.datum);
    await expect(page.getByText(/Bijgewerkt op/)).toBeVisible();

    // Filter op bron.
    const bronnen = [...new Set(nieuws.berichten.map((b: { bron: string }) => b.bron))] as string[];
    const bron = bronnen[bronnen.length - 1];
    await page.getByLabel('Bron').selectOption(bron);
    const aantal = nieuws.berichten.filter((b: { bron: string }) => b.bron === bron).length;
    await expect(page.getByText(`${aantal} ${aantal === 1 ? 'bericht' : 'berichten'}`, { exact: true })).toBeVisible();
    await geenHorizontaleScroll(page);
  });
});

test.describe('Kennisbank', () => {
  test('toont echte publicaties met uitgever en werkende zoekfunctie', async ({ page }) => {
    await page.goto('/kennisbank');
    await expect(page.getByRole('heading', { level: 1, name: 'Kennisbank' })).toBeVisible();
    await expect(page.locator('article.bericht')).toHaveCount(kennisbankUrls.length);
    const hrefs = await page.locator('article.bericht h2 a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(new Set(hrefs)).toEqual(new Set(kennisbankUrls));

    await page.getByLabel('Zoeken').fill('afvalstoffenbelasting');
    await expect(page.locator('article.bericht').first()).toBeVisible();
    const titels = await page.locator('article.bericht h2').allTextContents();
    expect(titels.length).toBeGreaterThan(0);
    expect(titels.length).toBeLessThan(kennisbankUrls.length);
    await page.getByLabel('Zoeken').fill('');
    await page.getByLabel('Thema').selectOption('Textiel');
    await expect(page.locator('article.bericht')).toHaveCount(1);
    await geenHorizontaleScroll(page);
  });
});

test.describe('Homepage', () => {
  test('toont CBS-kerncijfers, echte berichten en de kleine kaart', async ({ page }) => {
    await page.goto('/');
    const c = afval.controle;
    await expect(page.getByText(`${nl(c.landelijkRestafvalKgPerInw)} kg`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${nl(c.landelijkScheidingsPctCbs)} %`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Bron: CBS, tabellen ${afval.bron.tabelId}`)).toBeVisible();
    await expect(page.getByRole('link', { name: nieuws.berichten[0].titel })).toHaveAttribute('href', nieuws.berichten[0].link);
    await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(afval.gemeenten.length);
    await expect(page.locator('main').getByText(/voorbeeldbericht|fictief|verzonnen/i)).toHaveCount(0);
    await geenHorizontaleScroll(page);
  });
});
