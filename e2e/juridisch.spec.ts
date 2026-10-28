import { test, expect, type Page } from '@playwright/test';
import { aanbieder, documenten, externeVerbindingen, opslag } from '../src/pages/juridisch/gegevens';
import { bekendeProblemen, status } from '../src/pages/juridisch/toegankelijkheidMeting';

// Juridische pagina's, bètamelding, voettekst, lettertype en browseropslag.
// Draai tegen een eigen server: PW_BASE=http://localhost:5105 npx playwright test e2e/juridisch.spec.ts

const paginas = Object.values(documenten);

async function geenHorizontaleScroll(page: Page) {
  const breed = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(breed, 'pagina is breder dan het scherm').toBeLessThanOrEqual(0);
}

for (const doc of paginas) {
  test.describe(doc.titel, () => {
    test('heeft conceptmarkering, versie, datum, kern en een werkende inhoudsopgave', async ({ page }) => {
      await page.goto(doc.pad);
      await expect(page.getByRole('heading', { level: 1, name: doc.titel })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(doc.titel));

      const markering = page.getByRole('note', { name: 'Concept ter juridische toetsing' });
      await expect(markering).toBeVisible();
      await expect(markering).toContainText(`Versie ${doc.versie}`);
      await expect(markering).toContainText('2026');
      await expect(page.getByText(/laatst gewijzigd op/)).toBeVisible();

      // De kern staat altijd open bovenaan.
      const kern = page.getByRole('region', { name: 'In het kort' });
      await expect(kern).toBeVisible();
      expect(await kern.getByRole('listitem').count()).toBeGreaterThanOrEqual(3);

      const knoppen = page.locator('.jd-sectie > h2 > button');
      const aantal = await knoppen.count();
      expect(aantal).toBeGreaterThanOrEqual(4);
      const breed = (page.viewportSize()?.width ?? 0) >= 760;

      // Elke sectie heeft een id, een kop met een knop en een inhoud die bij de knop hoort.
      for (let i = 0; i < aantal; i++) {
        const knop = knoppen.nth(i);
        await expect(knop).toHaveAttribute('aria-expanded', breed ? 'true' : 'false');
        const inhoudId = (await knop.getAttribute('aria-controls'))!;
        await expect(page.locator(`#${inhoudId}`)).toBeVisible({ visible: breed });
      }

      const inhoud = page.getByRole('navigation', { name: 'Op deze pagina' });
      if (breed) {
        // Breed: inhoudsopgave met een link naar elke sectie; de laatste link zet het anker in de adresbalk.
        const links = inhoud.getByRole('link');
        await expect(links).toHaveCount(aantal);
        for (let i = 0; i < aantal; i++) {
          const href = await links.nth(i).getAttribute('href');
          expect(href).toMatch(/^#[a-z0-9-]+$/);
          await expect(page.locator(`${href} > h2`)).toHaveCount(1);
        }
        const laatste = links.nth(aantal - 1);
        const href = (await laatste.getAttribute('href'))!;
        await laatste.click();
        await expect(page).toHaveURL(new RegExp(`${doc.pad}${href}$`));
        await expect(page.locator(`${href} > h2`)).toBeInViewport();
        await page.getByRole('button', { name: 'Alles inklappen' }).click();
        await expect(knoppen.first()).toHaveAttribute('aria-expanded', 'false');
      } else {
        // Smal: de koppen van de dichte secties zijn de inhoudsopgave; een klik klapt open.
        await expect(inhoud).toBeHidden();
        const laatste = knoppen.nth(aantal - 1);
        await laatste.click();
        await expect(laatste).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator(`#${await laatste.getAttribute('aria-controls')}`)).toBeVisible();
        await page.getByRole('button', { name: 'Alles uitklappen' }).click();
        await expect(knoppen.first()).toHaveAttribute('aria-expanded', 'true');
      }

      await geenHorizontaleScroll(page);
    });
  });
}

test('anker naar een plek in een dichte sectie klapt die sectie open', async ({ page }) => {
  await page.goto('/privacy#verwerking-bezoek');
  const doel = page.locator('#verwerking-bezoek');
  await expect(doel).toBeVisible();
  await expect(doel).toBeInViewport();
  await expect(doel).toContainText('webadres');
});

test('afdrukken toont alle secties en geen bediening', async ({ page }) => {
  await page.goto('/algemene-voorwaarden');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#aansprakelijkheid-inhoud')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: '11. Aansprakelijkheid' })).toBeVisible();
  await expect(page.locator('.jd-acties')).toBeHidden();
  await expect(page.locator('.jd-toetspunt').first()).toBeHidden();
});

test('verklaringen beschrijven invoer in het webadres en het gedeelde aanbestedingsarchief', async ({ page }) => {
  await page.goto('/cookies#overzicht');
  await expect(page.getByRole('heading', { level: 3, name: 'Uw invoer in het webadres' })).toBeVisible();
  await page.goto('/privacy#database');
  await expect(page.getByRole('heading', { level: 3, name: 'Gedeelde open gegevens' })).toBeVisible();
  await expect(page.locator('#database')).toContainText('ververs-aanbestedingen');
  await page.goto('/algemene-voorwaarden#persoonsgegevens');
  await expect(page.locator('#persoonsgegevens')).toContainText('webadres');
});

test('focus is zichtbaar op de knoppen van de secties', async ({ page }) => {
  await page.goto('/privacy');
  const link = page.locator('.jd-sectie-knop').first();
  await link.focus();
  const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth);
  expect(outline).not.toMatch(/^none|0px$/);
});

test('algemene voorwaarden tonen de conceptprijzen uit de lidmaatschapsdata', async ({ page }) => {
  await page.goto('/algemene-voorwaarden#prijs-en-betaling');
  const tabel = page.getByRole('region', { name: 'Jaarprijs per staffel' });
  await expect(tabel).toBeVisible();
  await expect(tabel.getByRole('row')).toHaveCount(5);
  await expect(tabel).toContainText('€');
});

test('bètamelding verwijst naar de uitleg over voorbeelddata', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('note', { name: 'Bètaversie' });
  await expect(banner).toContainText('Bèta');
  await banner.getByRole('link', { name: 'Wat betekent dit?' }).click();
  await expect(page).toHaveURL(/\/disclaimer#voorbeelddata$/);
  await expect(page.getByRole('heading', { level: 2, name: /voorbeelddata/ })).toBeInViewport();
});

test('voettekst toont aanbieder, KVK-nummer, contact en colofon', async ({ page }) => {
  await page.goto('/');
  const voet = page.getByRole('contentinfo');
  await expect(voet).toContainText(aanbieder.naam);
  await expect(voet).toContainText(`KVK ${aanbieder.kvk}`);
  await expect(voet.getByRole('link', { name: aanbieder.contact.email })).toHaveAttribute('href', `mailto:${aanbieder.contact.email}`);
  for (const doc of paginas) {
    await expect(voet.locator(`a[href="${doc.pad}"]`)).toHaveCount(1);
  }
  await voet.getByRole('link', { name: 'Colofon' }).click();
  await expect(page).toHaveURL(/\/disclaimer#colofon$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Colofon' })).toBeInViewport();
  await geenHorizontaleScroll(page);
});

test('Poppins komt van de eigen server, niet van Google', async ({ page }) => {
  const extern: string[] = [];
  const fonts: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) extern.push(url);
    if (r.resourceType() === 'font') fonts.push(url);
  });
  await page.goto('/privacy');
  await page.evaluate(() => document.fonts.ready);
  expect(extern).toEqual([]);
  expect(fonts.length).toBeGreaterThan(0);
  for (const f of fonts) expect(new URL(f).pathname).toMatch(/^\/fonts\/poppins-.*\.woff2$/);
  expect(await page.evaluate(() => document.fonts.check('600 16px Poppins'))).toBe(true);
  const html = await page.content();
  expect(html).not.toContain('fonts.googleapis.com');
});

test('geen cookies, alleen beschreven browseropslag en geen onbeschreven verbindingen', async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  const eigenHost = new URL(baseURL ?? 'http://localhost').hostname;
  const toegestaan = externeVerbindingen.map((v) => v.host);
  const vreemd = new Set<string>();
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (host !== eigenHost && !toegestaan.includes(host)) vreemd.add(`${host} (op ${page.url()})`);
  });
  const routes = [
    '/', '/restafvalkaart', '/nieuws', '/kennisbank', '/tools', '/tools/aanbestedingstool', '/tools/indexcalculator',
    '/tools/co2-heffingenscan', '/tools/bodemassencalculator', '/tools/pmd-rekenmodel', '/aanbestedingsarchief',
    '/lidmaatschap', '/over-het-platform', '/lidmaatschap/aanmelden', '/inloggen', '/account',
    ...paginas.map((d) => d.pad),
  ];
  for (const r of routes) {
    await page.goto(r);
    await page.waitForLoadState('load');
  }
  // De kaart laadt de gemeentegrenzen; geef die even de tijd.
  await page.goto('/restafvalkaart');
  await page.waitForLoadState('networkidle');

  // Vul één veld van het aanmeldformulier in: dat mag alleen de beschreven sessieopslag maken.
  await page.goto('/lidmaatschap/aanmelden');
  const eersteVeld = page.getByRole('textbox').first();
  if (await eersteVeld.isVisible()) await eersteVeld.fill('Testorganisatie');

  expect(await context.cookies(), 'de site of een andere partij zette een cookie').toEqual([]);
  const sleutels = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  const beschreven = opslag.map((o) => o.sleutel);
  expect(sleutels.filter((s) => !beschreven.includes(s)), 'onbeschreven sleutel in browseropslag').toEqual([]);
  expect([...vreemd], 'verbinding met een server die niet in de cookie- en privacyverklaring staat').toEqual([]);
});

test('toegankelijkheidsverklaring toont status, meting en bekende problemen uit de meetgegevens', async ({ page }) => {
  await page.goto('/toegankelijkheid');
  await expect(page.getByRole('region', { name: 'In het kort' })).toContainText(`Status ${status.letter}`);
  const uitklappen = page.getByRole('button', { name: 'Alles uitklappen' });
  if (await uitklappen.isVisible()) await uitklappen.click();
  await expect(page.getByText(`Status ${status.letter}:`, { exact: false }).first()).toBeVisible();
  const schaal = page.getByRole('list', { name: 'Statussen A tot en met E' });
  await expect(schaal.getByRole('listitem')).toHaveCount(5);
  await expect(schaal.locator('[aria-current="true"]')).toContainText('status van dit platform');
  await expect(page.getByRole('region', { name: 'Lighthouse-scores per pagina' })).toBeVisible();
  for (const p of bekendeProblemen) {
    await expect(page.getByRole('heading', { level: 3, name: p.onderdeel })).toBeVisible();
  }
});

test('kaart haalt geen kaarttegels of andere bestanden bij derden op', async ({ page, baseURL }) => {
  const eigenHost = new URL(baseURL ?? 'http://localhost').hostname;
  const extern: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).hostname !== eigenHost) extern.push(r.url());
  });
  await page.goto('/restafvalkaart');
  await expect(page.locator('.kaart-vak svg path').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(extern).toEqual([]);
});
