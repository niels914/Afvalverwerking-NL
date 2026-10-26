import { test, expect, type Page } from '@playwright/test';
import { createClient, type Session } from '@supabase/supabase-js';

// Aanbestedingsarchief: betaalmuur voor bezoekers, RLS in de database en het archief voor leden.
// Inloggen als lid gebeurt met supabase.auth.signInWithPassword (E2E_EMAIL en E2E_WACHTWOORD uit de omgeving);
// de sessie gaat in localStorage, zoals de app die zelf bewaart. Het wachtwoord staat nooit in de repository.
// Draai met NODE_USE_ENV_PROXY=1 als het netwerk via een proxy loopt.

const URL = 'https://mnwynrioozcqqvhelqku.supabase.co';
const SLEUTEL = 'sb_publishable_I2RWzqXGfpTNOzamSLvCEw_ohby-4LM';
const OPSLAG = 'sb-mnwynrioozcqqvhelqku-auth-token';
const EMAIL = process.env.E2E_EMAIL;
const WACHTWOORD = process.env.E2E_WACHTWOORD;

/** Wacht tot de tabel de resultaten van de huidige filters toont. */
async function resultatenBinnen(page: Page) {
  await expect(page.locator('.archief-tabel')).toHaveAttribute('aria-busy', 'false');
}

const client = () => createClient(URL, SLEUTEL, { auth: { persistSession: false, autoRefreshToken: false } });

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

test.describe('bezoeker', () => {
  test('ziet de betaalmuur met een voorbeeld zonder echte aanbestedingen', async ({ page }) => {
    await page.goto('/aanbestedingsarchief?zoek=gft');
    await expect(page.getByRole('heading', { level: 1, name: 'Aanbestedingsarchief' })).toBeVisible();
    const slot = page.locator('.slotkaart');
    await expect(slot.getByText('Dit onderdeel is voor leden')).toBeVisible();
    await expect(slot.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', '/inloggen?terug=%2Faanbestedingsarchief%3Fzoek%3Dgft');
    // De wazige preview bevat alleen grijze balken: geen links naar TenderNed, geen tabelregels met tekst.
    const preview = page.locator('.vergrendeld-preview');
    await expect(preview.locator('.archief-voorbeeld')).toHaveCount(1);
    await expect(preview.locator('a[href*="tenderned.nl/aankondigingen"]')).toHaveCount(0);
    await expect(preview.locator('tbody td').first()).toHaveText('');
    await geenHorizontaleScroll(page);
  });

  test('de database geeft bezoekers geen aanbestedingen', async () => {
    const db = client();
    const tabel = await db.from('aanbestedingen').select('kenmerk').limit(1);
    expect(tabel.data ?? []).toEqual([]);
    const zoek = await db.rpc('zoek_aanbestedingen', {});
    expect(zoek.error, 'anon mag zoek_aanbestedingen niet aanroepen').not.toBeNull();
  });
});

test.describe('lid', () => {
  test.skip(!EMAIL || !WACHTWOORD, 'Zet E2E_EMAIL en E2E_WACHTWOORD voor de ledentest');

  let sessie: Session;

  test.beforeAll(async () => {
    const { data, error } = await client().auth.signInWithPassword({ email: EMAIL!, password: WACHTWOORD! });
    expect(error, error?.message).toBeNull();
    sessie = data.session!;
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ([sleutel, waarde]) => {
        window.localStorage.setItem(sleutel, waarde);
      },
      [OPSLAG, JSON.stringify(sessie)],
    );
  });

  test('database: lid leest het archief via RLS', async () => {
    const db = client();
    await db.auth.setSession({ access_token: sessie.access_token, refresh_token: sessie.refresh_token });
    const { data, error, count } = await db.rpc('zoek_aanbestedingen', { p_zoek: 'afval' }, { count: 'exact' }).select('kenmerk,tenderned_url,status').range(0, 4);
    expect(error).toBeNull();
    expect(count ?? 0).toBeGreaterThan(100);
    for (const r of data as { tenderned_url: string }[]) expect(r.tenderned_url).toMatch(/^https:\/\/www\.tenderned\.nl\/aankondigingen\/overzicht\/\d+$/);
  });

  test('zoeken via ?zoek=, filteren, sorteren en bladeren', async ({ page }) => {
    await page.goto('/aanbestedingsarchief?zoek=afval');
    const zoekveld = page.getByLabel('Zoeken in titel, opdrachtgever en omschrijving');
    await expect(zoekveld).toHaveValue('afval');
    const aantal = page.locator('.archief-aantal');
    await expect(aantal).toContainText(/\d+ aanbestedingen gevonden/);
    const rijen = page.locator('.archief-tabel tbody tr');
    await expect(rijen).toHaveCount(25);

    // Bron en actualiteit staan zichtbaar bij de data.
    await expect(page.locator('.archief-bron')).toContainText('laatst bijgewerkt op');
    await expect(page.locator('.archief-bron').getByRole('link', { name: /TenderNed/ })).toHaveAttribute('href', 'https://www.tenderned.nl/aankondigingen/overzicht');

    // Elke regel linkt naar de aankondiging op TenderNed.
    const link = rijen.first().getByRole('link', { name: /aankondiging op TenderNed/ });
    await expect(link).toHaveAttribute('href', /^https:\/\/www\.tenderned\.nl\/aankondigingen\/overzicht\/\d+$/);
    await expect(link).toHaveAttribute('target', '_blank');

    // Details: tijdlijn van publicaties.
    await rijen.first().locator('summary').click();
    await expect(rijen.first().getByText('Publicaties op TenderNed')).toBeVisible();

    // Bladeren.
    await page.getByRole('button', { name: 'Volgende pagina' }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(aantal).toContainText('pagina 2 van');
    await resultatenBinnen(page);
    await expect(page.getByRole('heading', { name: 'Resultaten' })).toBeFocused();

    // Filter op status: alleen open aanbestedingen; pagina gaat terug naar 1.
    await page.getByLabel('Status').selectOption('open');
    await expect(page).toHaveURL(/status=open/);
    await expect(page).not.toHaveURL(/pagina=/);
    await resultatenBinnen(page);
    const statussen = await page.locator('.archief-tabel td[data-label="Status"]').allInnerTexts();
    expect(statussen.length).toBeGreaterThan(0);
    for (const s of statussen) expect(s.trim()).toBe('Open voor inschrijving');

    // Sorteren op sluitingsdatum, vroegste eerst.
    await page.getByLabel('Sorteren op').selectOption('sluiting-op');
    await expect(page).toHaveURL(/sortering=sluiting-op/);
    await resultatenBinnen(page);
    await expect(page.locator('th[aria-sort="ascending"]')).toHaveText('Sluiting');
    const data = await page.locator('.archief-tabel td[data-label="Sluiting"] time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime') ?? ''));
    expect(data).toEqual([...data].sort());

    // Alles wissen en een zoekopdracht zonder resultaat.
    await page.getByRole('button', { name: 'Alle filters wissen' }).click();
    await expect(page).toHaveURL(/sortering=sluiting-op$/);
    await zoekveld.fill('zzqqxx-bestaat-niet');
    await page.getByRole('button', { name: 'Zoeken', exact: true }).click();
    await expect(aantal).toHaveText('Geen aanbestedingen gevonden.');
    await expect(page).toHaveURL(/zoek=zzqqxx-bestaat-niet/);
    await geenHorizontaleScroll(page);
  });

  test('filter op afvalstroom en provincie', async ({ page }) => {
    await page.goto('/aanbestedingsarchief');
    await page.getByLabel('Afvalstroom').selectOption('GFT en etensresten');
    await expect(page).toHaveURL(/stroom=GFT/);
    await resultatenBinnen(page);
    const stromen = page.locator('.archief-tabel td[data-label="Afvalstroom"]');
    await expect(stromen.first()).toBeVisible();
    for (const s of await stromen.allInnerTexts()) expect(s).toContain('GFT en etensresten');

    await page.getByLabel('Afvalstroom').selectOption('');
    await page.getByLabel('Provincie').selectOption('Gelderland');
    await expect(page).toHaveURL(/provincie=Gelderland/);
    await resultatenBinnen(page);
    const provincies = page.locator('.archief-tabel .archief-provincie');
    await expect(provincies.first()).toBeVisible();
    for (const p of await provincies.allInnerTexts()) expect(p).toContain('Gelderland');
    await geenHorizontaleScroll(page);
  });
});
