import { test, expect, type Page } from '@playwright/test';
import { aanbieder, documenten, opslag } from '../src/pages/juridisch/gegevens';

// Juridische pagina's, bètamelding, voettekst, lettertype en browseropslag.
// Draai tegen een eigen server: PW_BASE=http://localhost:5105 npx playwright test e2e/juridisch.spec.ts

const paginas = Object.values(documenten);

async function geenHorizontaleScroll(page: Page) {
  const breed = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(breed, 'pagina is breder dan het scherm').toBeLessThanOrEqual(0);
}

for (const doc of paginas) {
  test.describe(doc.titel, () => {
    test('heeft conceptmarkering, versie, datum en een werkende inhoudsopgave', async ({ page }) => {
      await page.goto(doc.pad);
      await expect(page.getByRole('heading', { level: 1, name: doc.titel })).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(doc.titel));

      const markering = page.getByRole('note', { name: 'Concept ter juridische toetsing' });
      await expect(markering).toBeVisible();
      await expect(markering).toContainText(`Versie ${doc.versie}`);
      await expect(markering).toContainText('2026');
      await expect(page.getByText(/laatst gewijzigd op/)).toBeVisible();

      const inhoud = page.getByRole('navigation', { name: 'Op deze pagina' });
      const links = inhoud.getByRole('link');
      const aantal = await links.count();
      expect(aantal).toBeGreaterThanOrEqual(4);

      // Elk anker heeft een doel met een kop.
      for (let i = 0; i < aantal; i++) {
        const href = await links.nth(i).getAttribute('href');
        expect(href).toMatch(/^#[a-z0-9-]+$/);
        const doel = page.locator(`${href} > h2`);
        await expect(doel).toHaveCount(1);
      }

      // De laatste link brengt de sectie in beeld en zet het anker in de adresbalk.
      const laatste = links.nth(aantal - 1);
      const href = (await laatste.getAttribute('href'))!;
      await laatste.click();
      await expect(page).toHaveURL(new RegExp(`${doc.pad}${href}$`));
      await expect(page.locator(`${href} > h2`)).toBeInViewport();

      await geenHorizontaleScroll(page);
    });
  });
}

test('focus is zichtbaar op links in de inhoudsopgave', async ({ page }) => {
  await page.goto('/privacy');
  const link = page.getByRole('navigation', { name: 'Op deze pagina' }).getByRole('link').first();
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

test('geen cookies en alleen beschreven browseropslag', async ({ page, context }) => {
  test.setTimeout(120_000);
  const routes = ['/', '/restafvalkaart', '/nieuws', '/kennisbank', '/tools', '/tools/indexcalculator', '/lidmaatschap', '/lidmaatschap/aanmelden', '/inloggen', '/over-het-platform', '/privacy', '/cookies'];
  for (const r of routes) {
    await page.goto(r);
    await page.waitForLoadState('load');
  }
  // De kaart laadt tegels van OpenStreetMap; geef die even de tijd.
  await page.goto('/restafvalkaart');
  await page.waitForTimeout(1500);

  // Vul één veld van het aanmeldformulier in: dat mag alleen de beschreven sessieopslag maken.
  await page.goto('/lidmaatschap/aanmelden');
  const eersteVeld = page.getByRole('textbox').first();
  if (await eersteVeld.isVisible()) await eersteVeld.fill('Testorganisatie');

  expect(await context.cookies(), 'de site of een andere partij zette een cookie').toEqual([]);
  const sleutels = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  const beschreven = opslag.map((o) => o.sleutel);
  expect(sleutels.filter((s) => !beschreven.includes(s)), 'onbeschreven sleutel in browseropslag').toEqual([]);
});
