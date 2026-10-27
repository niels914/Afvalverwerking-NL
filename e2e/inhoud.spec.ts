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
type Bericht = { bron: string; titel: string; inleiding: string; datum: string; link: string };
const gem = (code: string): Gem => afval.gemeenten.find((g: Gem) => g.code === code);
const nl = (n: number, d = 0) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

test.describe('Restafvalkaart', () => {
  test('tekent alle gemeenten als SVG-vlakken met legenda, bron en zonder tabval', async ({ page }) => {
    await page.goto('/restafvalkaart');
    await expect(page.getByRole('heading', { level: 1, name: 'Restafvalkaart van Nederland' })).toBeVisible();
    await expect(page.locator('.svgkaart path[data-c]')).toHaveCount(afval.gemeenten.length);
    await expect(page.locator('.legenda')).toContainText('Restafval per inwoner');
    await expect(page.locator('.legenda li')).toHaveCount(5);

    // Toetsenbord: de kaart heeft alleen de drie zoomknoppen als tabstop, geen honderden vlakken.
    const tabstops = await page.locator('.kaart-vak').evaluate((vak) =>
      [...vak.querySelectorAll<HTMLElement | SVGElement>('a, button, input, select, textarea, [tabindex], path')].filter(
        (el) => (el as HTMLElement).tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.tagName !== 'path',
      ).length,
    );
    expect(tabstops).toBeLessThanOrEqual(3);
    const focusbarePaden = await page.locator('.svgkaart path').evaluateAll((ps) => ps.filter((p) => (p as SVGElement).tabIndex >= 0).length);
    expect(focusbarePaden).toBe(0);
    await expect(page.getByRole('img', { name: /Kaart van Nederland: restafval per inwoner per gemeente/ })).toBeVisible();

    // Standaard: Amsterdam, met het echte CBS-cijfer en de kanttekening over nascheiding.
    const ams = gem('GM0363');
    const paneel = page.locator('.gemeente-paneel');
    await expect(paneel.getByRole('heading', { level: 2, name: ams.naam })).toBeVisible();
    await expect(paneel.locator('.tegel.hero')).toContainText(`${nl(ams.restafval)} kg`);
    await expect(paneel.locator('.nascheiding')).toContainText('nascheiding');

    // Bron en peiljaar direct onder de kop en onderaan, met link naar CBS.
    await expect(page.locator('.bronregel').getByRole('link', { name: /tabel 83452NED/ })).toHaveAttribute('href', afval.bron.url);
    const bron = page.locator('#bron');
    await expect(bron).toContainText(`Peiljaar ${afval.peiljaar}`);
    await expect(bron.getByRole('link', { name: /83452NED/ })).toHaveAttribute('href', afval.bron.url);
    await expect(bron.getByRole('link', { name: /CBS Gebiedsindelingen/ })).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('zoeken: suggesties, Den Bosch, dubbelzinnige en onbekende namen', async ({ page }) => {
    await page.goto('/restafvalkaart');
    const utrecht = gem('GM0344');
    const zoek = page.getByLabel('Zoek een gemeente');
    await zoek.fill('utrec');
    await page.getByRole('list', { name: 'Gevonden gemeenten' }).getByRole('button', { name: /^Utrecht/ }).first().click();
    const paneel = page.locator('.gemeente-paneel');
    await expect(paneel.getByRole('heading', { level: 2, name: 'Utrecht' })).toBeFocused();
    await expect(page).toHaveURL(/gemeente=GM0344/);
    await expect(paneel.locator('.tegel.hero')).toContainText(`${nl(utrecht.restafval)} kg`);
    await expect(paneel.getByRole('link', { name: /aanbestedingsarchief/ })).toHaveAttribute('href', '/aanbestedingsarchief?zoek=Utrecht');

    // Gangbare naam en Enter.
    await zoek.fill('den bosch');
    await zoek.press('Enter');
    await expect(paneel.getByRole('heading', { level: 2, name: "'s-Hertogenbosch" })).toBeVisible();
    await zoek.fill('Den Haag');
    await zoek.press('Enter');
    await expect(paneel.getByRole('heading', { level: 2, name: "'s-Gravenhage" })).toBeVisible();

    // Bergen bestaat twee keer: de pagina kiest niet zelf.
    await zoek.fill('Bergen');
    await zoek.press('Enter');
    await expect(page.getByText(/gemeenten gevonden voor “Bergen”\. Kies er een uit de lijst\./)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Gevonden gemeenten' }).getByRole('button', { name: /Bergen \(NH\.\)/ })).toBeVisible();
    await expect(paneel.getByRole('heading', { level: 2, name: "'s-Gravenhage" })).toBeVisible();

    // Onbekende naam geeft een melding.
    await zoek.fill('Atlantis');
    await page.getByRole('button', { name: 'Toon', exact: true }).click();
    await expect(page.getByText(/Geen gemeente gevonden voor “Atlantis”/)).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('onbekende gemeente in de link geeft een melding', async ({ page }) => {
    await page.goto('/restafvalkaart?gemeente=Atlantis');
    await expect(page.getByText(/De gemeente “Atlantis” uit de link bestaat niet/)).toBeVisible();
    await page.goto('/restafvalkaart?gemeente=GM0344');
    await expect(page.locator('.gemeente-paneel').getByRole('heading', { level: 2, name: 'Utrecht' })).toBeVisible();
    await expect(page.getByText(/uit de link bestaat niet/)).toHaveCount(0);
  });

  test('andere indicator kleurt de kaart en sorteert de tabel', async ({ page }) => {
    await page.goto('/restafvalkaart');
    const kleurVoor = await page.locator('.svgkaart path[data-c="GM0344"]').getAttribute('fill');
    await page.getByRole('button', { name: 'Gescheiden ingezameld' }).click();
    await expect(page).toHaveURL(/toon=scheidingsPct/);
    await expect(page.locator('.legenda figcaption')).toContainText('Gescheiden ingezameld');
    await expect(page.locator('.svgkaart path[data-c="GM0344"]')).not.toHaveAttribute('fill', kleurVoor!);
    const hoogste = [...afval.gemeenten].filter((g: Gem) => g.scheidingsPct !== null).sort((a: Gem, b: Gem) => b.scheidingsPct! - a.scheidingsPct!)[0];
    await expect(page.locator('#tabel tbody tr').first().locator('th button')).toHaveText(hoogste.naam);
  });

  test('tabelweergave: eerst 25, alles tonen, filter, kiezen en CSV', async ({ page }) => {
    await page.goto('/restafvalkaart');
    const tabel = page.locator('#tabel');
    await expect(tabel.locator('tbody tr')).toHaveCount(25);
    await tabel.getByRole('button', { name: `Toon alle ${afval.gemeenten.length} gemeenten` }).click();
    await expect(tabel.locator('tbody tr')).toHaveCount(afval.gemeenten.length);
    // Op 400 px blijven de drie cijferkolommen in beeld, zonder horizontaal scrollen in de tabel.
    const overloop = await tabel.locator('.kaarttabel').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overloop).toBeLessThanOrEqual(1);

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
    await geenHorizontaleScroll(page);
  });

  test('klikken, zweven en zoomen op de kaart', async ({ page }, info) => {
    test.skip(info.project.name === 'mobiel-400', 'Zweven en klikken op coördinaten alleen op desktop; mobiel is gedekt via zoeken en tabel.');
    await page.goto('/restafvalkaart');
    await expect(page.locator('.svgkaart path[data-c]')).toHaveCount(afval.gemeenten.length);
    const svg = page.locator('.svgkaart svg');
    const box = (await svg.boundingBox())!;
    // Midden van Nederland valt in een gemeente; welke precies maakt niet uit.
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55);
    await expect(page.locator('.kaart-tip')).toBeVisible();
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.55);
    await expect(page).toHaveURL(/gemeente=GM\d{4}/);
    await expect(page).not.toHaveURL(/gemeente=GM0363/);

    const viewBox = await svg.getAttribute('viewBox');
    await page.getByRole('button', { name: 'Inzoomen' }).click();
    await expect(svg).not.toHaveAttribute('viewBox', viewBox!);
    await page.getByRole('button', { name: 'Heel Nederland' }).click();
    await expect(svg).toHaveAttribute('viewBox', viewBox!);
  });

  test('als de kaart niet laadt, blijft de tabel bruikbaar', async ({ page }) => {
    await page.route('**/data/gemeentekaart.json', (r) => r.abort());
    await page.goto('/restafvalkaart');
    await expect(page.getByRole('alert')).toContainText('De kaart kon niet worden geladen');
    await expect(page.locator('#tabel tbody tr')).toHaveCount(25);
  });
});

test.describe('Nieuws', () => {
  test('toont echte berichten met datum, bron en link naar het origineel, met zoeken en filters', async ({ page }) => {
    await page.goto('/nieuws');
    await expect(page.getByRole('heading', { level: 1, name: 'Nieuws' })).toBeVisible();
    const berichten: Bericht[] = nieuws.berichten;
    const eerste = berichten[0];
    const artikel = page.locator('article.bericht').first();
    await expect(artikel.getByRole('link', { name: eerste.titel })).toHaveAttribute('href', eerste.link);
    await expect(artikel).toContainText(`Bron: ${eerste.bron}`);
    await expect(artikel.locator('time')).toHaveAttribute('datetime', eerste.datum);
    await expect(page.getByText(/Bijgewerkt op/)).toBeVisible();
    await expect(page.locator('article.bericht')).toHaveCount(Math.min(10, berichten.length));
    // Geen inleidingen met vastgeplakte trefwoorden uit de feed.
    for (const b of berichten) expect(b.inleiding).not.toMatch(/\|/);

    // Zoeken.
    await page.getByLabel('Zoek in titel en inleiding').fill('statiegeld');
    const metStatiegeld = berichten.filter((b) => `${b.titel} ${b.inleiding} ${b.bron}`.toLowerCase().includes('statiegeld')).length;
    await expect(page.getByText(`${metStatiegeld} ${metStatiegeld === 1 ? 'bericht' : 'berichten'}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Wis filters' }).click();

    // Filters zitten op smalle schermen achter "Filters".
    const filters = page.locator('details.filters-inklap');
    if (!(await filters.evaluate((d) => (d as HTMLDetailsElement).open))) await filters.locator('summary').click();
    const bronOpties = await page.getByLabel('Bron').locator('option').allTextContents();
    for (const naam of bronOpties.slice(1)) expect(berichten.some((b) => b.bron === naam)).toBe(true);
    const bron = bronOpties[bronOpties.length - 1];
    await page.getByLabel('Bron').selectOption(bron);
    const aantal = berichten.filter((b) => b.bron === bron).length;
    await expect(page.getByText(`${aantal} ${aantal === 1 ? 'bericht' : 'berichten'}`, { exact: true })).toBeVisible();
    await page.getByLabel('Periode').selectOption(eerste.datum.slice(0, 4));
    await expect(page.locator('article.bericht time').first()).toHaveAttribute('datetime', new RegExp(`^${eerste.datum.slice(0, 4)}`));
    await geenHorizontaleScroll(page);
  });
});

test.describe('Kennisbank', () => {
  test('toont echte publicaties met uitgever, inklapbare filters en werkende zoekfunctie', async ({ page }) => {
    await page.goto('/kennisbank');
    await expect(page.getByRole('heading', { level: 1, name: 'Kennisbank' })).toBeVisible();
    await expect(page.locator('article.bericht')).toHaveCount(8);
    await page.getByRole('button', { name: `Toon alle ${kennisbankUrls.length} publicaties` }).click();
    await expect(page.locator('article.bericht')).toHaveCount(kennisbankUrls.length);
    const hrefs = await page.locator('article.bericht h2 a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(new Set(hrefs)).toEqual(new Set(kennisbankUrls));
    // Geen dubbele labels zoals "Cijfers Cijfers".
    for (const meta of await page.locator('article.bericht .meta').allTextContents()) expect(meta).not.toMatch(/Cijfers\s*Cijfers/);

    await page.getByLabel('Zoeken', { exact: true }).fill('afvalstoffenbelasting');
    await expect(page.locator('article.bericht').first()).toBeVisible();
    const titels = await page.locator('article.bericht h2').allTextContents();
    expect(titels.length).toBeGreaterThan(0);
    expect(titels.length).toBeLessThan(kennisbankUrls.length);
    await page.getByLabel('Zoeken', { exact: true }).fill('');
    const filters = page.locator('details.filters-inklap');
    if (!(await filters.evaluate((d) => (d as HTMLDetailsElement).open))) await filters.locator('summary').click();
    await page.getByLabel('Thema').selectOption('Textiel');
    await expect(page.locator('article.bericht')).toHaveCount(1);
    await geenHorizontaleScroll(page);
  });
});

test.describe('Homepage', () => {
  test('toont landelijke CBS-cijfers met definitie, echte berichten en de kleine kaart met tekstalternatief', async ({ page }) => {
    await page.goto('/');
    const l = afval.landelijkActueel;
    await expect(page.getByRole('heading', { name: `Huishoudelijk afval in Nederland, ${l.jaar}` })).toBeVisible();
    await expect(page.getByText(`${nl(l.restafvalKgPerInw)} kg`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${nl(l.scheidingsPct)} %`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${nl(l.totaalKgPerInw)} kg`, { exact: true })).toBeVisible();
    await expect(page.locator('.definitie')).toContainText(`${nl(l.restafvalKgPerInw + l.verbouwingsrestafvalKgPerInw)} kg`);
    await expect(page.getByRole('link', { name: 'per gemeente' }).first()).toHaveAttribute('href', '/restafvalkaart?toon=restafval#tabel');
    await expect(page.getByRole('link', { name: nieuws.berichten[0].titel })).toHaveAttribute('href', nieuws.berichten[0].link);
    await expect(page.locator('.svgkaart path[data-c]')).toHaveCount(afval.gemeenten.length);
    await expect(page.getByRole('img', { name: new RegExp(afval.samenvatting.laagste.naam) })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alle gemeenten in een tabel' })).toHaveAttribute('href', '/restafvalkaart#tabel');
    await expect(page.locator('main').getByText(/voorbeeldbericht|fictief|verzonnen/i)).toHaveCount(0);
    await geenHorizontaleScroll(page);
  });
});
