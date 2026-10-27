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

/** Op de telefoon staan filters achter "Filters en sorteren"; open die eerst. */
async function filtersOpen(page: Page) {
  const knop = page.locator('.archief-filterinklap > summary');
  if ((await knop.count()) && !(await page.locator('.archief-filterinklap').evaluate((d) => (d as HTMLDetailsElement).open))) await knop.click();
}

const client = () => createClient(URL, SLEUTEL, { auth: { persistSession: false, autoRefreshToken: false } });

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

test.describe('bezoeker', () => {
  test('ziet open aanbestedingen en de betaalmuur voor het volledige archief', async ({ page }) => {
    await page.goto('/aanbestedingsarchief');
    await expect(page.getByRole('heading', { level: 1, name: 'Aanbestedingsarchief' })).toBeVisible();

    // Open aanbestedingen: titel, opdrachtgever, sluitdatum en link naar TenderNed.
    const open = page.locator('.open-lijst');
    await expect(open.getByRole('heading', { name: 'Open voor inschrijving' })).toBeVisible();
    await expect(open.locator('.archief-aantal')).toContainText(/\d+ open aanbesteding/);
    const regels = open.locator('.open-regels li');
    expect(await regels.count()).toBeGreaterThan(0);
    await expect(regels.first().getByRole('link', { name: /aankondiging op TenderNed/ })).toHaveAttribute('href', /^https:\/\/www\.tenderned\.nl\/aankondigingen\/overzicht\/\d+$/);
    for (const t of await open.locator('.open-sluit').allInnerTexts()) expect(t).toMatch(/^Sluit /);
    // Eerst tien, de rest op verzoek.
    expect(await regels.count()).toBeLessThanOrEqual(10);
    const meer = open.getByRole('button', { name: /^Alle \d+ open aanbestedingen tonen$/ });
    if (await meer.count()) {
      await meer.click();
      expect(await regels.count()).toBeGreaterThan(10);
      await expect(open.getByRole('button', { name: 'Alleen de eerste 10 tonen' })).toHaveAttribute('aria-expanded', 'true');
    }
    // Geen marktconsultatie bij de open aanbestedingen (inspectiepunt ronde 1: Rotterdam 618943).
    for (const t of await open.locator('.archief-titel').allInnerTexts()) expect(t.toLowerCase()).not.toContain('marktconsultatie');
    // Geen filters, details of export voor bezoekers.
    await expect(open.getByLabel('Status')).toHaveCount(0);
    await expect(open.locator('details')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Download CSV' })).toHaveCount(0);

    // Betaalmuur met wazige preview zonder echte data.
    const slot = page.locator('.slotkaart');
    await expect(slot.getByText('Dit onderdeel is voor leden')).toBeVisible();
    await expect(slot.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', '/inloggen?terug=%2Faanbestedingsarchief');
    const preview = page.locator('.vergrendeld-preview');
    await expect(preview.locator('.archief-voorbeeld')).toHaveCount(1);
    await expect(preview.locator('a[href*="tenderned.nl/aankondigingen"]')).toHaveCount(0);
    await expect(preview.locator('tbody td').first()).toHaveText('');
    await geenHorizontaleScroll(page);
  });

  test('zoeken in open aanbestedingen via ?zoek=', async ({ page }) => {
    await page.goto('/aanbestedingsarchief?zoek=zzqqxx-bestaat-niet');
    const open = page.locator('.open-lijst');
    await expect(open.getByLabel('Zoeken in titel en opdrachtgever')).toHaveValue('zzqqxx-bestaat-niet');
    await expect(open.locator('.archief-aantal')).toHaveText('Geen open aanbestedingen gevonden voor “zzqqxx-bestaat-niet”.');
    await open.getByLabel('Zoeken in titel en opdrachtgever').fill('');
    await open.getByRole('button', { name: 'Zoeken' }).click();
    await expect(page).not.toHaveURL(/zoek=/);
    await expect(open.locator('.archief-aantal')).toContainText(/\d+ open aanbesteding/);
  });

  test('de database geeft bezoekers alleen open aanbestedingen met vijf velden', async () => {
    const db = client();
    const tabel = await db.from('aanbestedingen').select('kenmerk').limit(1);
    expect(tabel.data ?? []).toEqual([]);
    const overzicht = await db.from('aanbestedingen_overzicht').select('kenmerk').limit(1);
    expect(overzicht.data ?? []).toEqual([]);
    const zoek = await db.rpc('aanbestedingen_zoeken', {});
    expect(zoek.error, 'anon mag aanbestedingen_zoeken niet aanroepen').not.toBeNull();
    const oud = await db.rpc('zoek_aanbestedingen', {});
    expect(oud.error, 'anon mag zoek_aanbestedingen niet aanroepen').not.toBeNull();

    const { data, error } = await db.rpc('open_aanbestedingen_zoeken', { p_zoek: null });
    expect(error).toBeNull();
    const rijen = data as Record<string, unknown>[];
    expect(rijen.length).toBeGreaterThan(0);
    expect(rijen.length).toBeLessThanOrEqual(100);
    const nu = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'medium' }).format(new Date()).replace(' ', 'T');
    for (const r of rijen) {
      expect(Object.keys(r).sort()).toEqual(['opdrachtgever', 'sluiting_tijd_bekend', 'sluitingsdatum', 'tenderned_url', 'titel']);
      expect(String(r.sluitingsdatum) >= nu.slice(0, 16), `sluitingsdatum ${r.sluitingsdatum} ligt in de toekomst`).toBe(true);
    }
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
    const { data, error, count } = await db.rpc('aanbestedingen_zoeken', { p_zoek: 'afval' }, { count: 'exact' }).select('kenmerk,tenderned_url,status').range(0, 4);
    expect(error).toBeNull();
    expect(count ?? 0).toBeGreaterThan(100);
    for (const r of data as { tenderned_url: string }[]) expect(r.tenderned_url).toMatch(/^https:\/\/www\.tenderned\.nl\/aankondigingen\/overzicht\/\d+$/);

    // Marktconsultatie die als aankondiging is gepubliceerd, is nooit "open" (Rotterdam 618943).
    const rotterdam = await db.rpc('aanbestedingen_zoeken', { p_zoek: '618943' }).select('kenmerk,status');
    expect(rotterdam.data).toEqual([{ kenmerk: 618943, status: 'marktconsultatie' }]);
    const open = await db.rpc('aanbestedingen_zoeken', { p_status: 'open' }).select('titel');
    for (const r of open.data as { titel: string }[]) expect(r.titel.toLowerCase()).not.toMatch(/marktconsultatie|marktverkenning/);

    // Zoeken op CPV-code, woordgroep tussen aanhalingstekens en tekens als % en * zonder fout.
    const cpv = await db.rpc('aanbestedingen_zoeken', { p_zoek: '90511400' }, { count: 'exact', head: true });
    expect(cpv.count ?? 0).toBeGreaterThan(0);
    const groep = await db.rpc('aanbestedingen_zoeken', { p_zoek: '"oud papier" 100% *' }, { count: 'exact', head: true });
    expect(groep.error).toBeNull();
    expect(groep.count ?? 0).toBeGreaterThan(0);

    // Afval als hoofdopdracht filtert de nevencodes weg.
    const alle = await db.rpc('aanbestedingen_zoeken', {}, { count: 'exact', head: true });
    const hoofd = await db.rpc('aanbestedingen_zoeken', { p_alleen_hoofd: true }, { count: 'exact', head: true });
    expect(hoofd.count ?? 0).toBeGreaterThan(0);
    expect(hoofd.count ?? 0).toBeLessThan(alle.count ?? 0);
  });

  test('zoeken via ?zoek=, filteren, sorteren en bladeren', async ({ page }) => {
    await page.goto('/aanbestedingsarchief?zoek=afval');
    const zoekveld = page.getByLabel('Zoeken in titel, opdrachtgever, omschrijving en CPV-code');
    await expect(zoekveld).toHaveValue('afval');
    const aantal = page.locator('.archief-aantal');
    await expect(aantal).toContainText(/\d+ aanbestedingen gevonden/);
    const rijen = page.locator('.archief-tabel tbody tr');
    await expect(rijen).toHaveCount(25);

    // Leden zien geen aparte lijst voor bezoekers.
    await expect(page.locator('.open-lijst')).toHaveCount(0);
    // Bron en actualiteit staan zichtbaar bij de data.
    await expect(page.locator('.archief-bron')).toContainText('Laatst bijgewerkt op');
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
    await filtersOpen(page);
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
    await filtersOpen(page);
    await page.getByLabel('Afvalstroom').selectOption('GFT en etensresten');
    await expect(page).toHaveURL(/stroom=GFT/);
    await resultatenBinnen(page);
    // Op desktop in de kolom Afvalstroom, op de telefoon in de regel onder de titel.
    const rijen = page.locator('.archief-tabel tbody tr');
    await expect(rijen.first()).toBeVisible();
    for (const s of await rijen.allInnerTexts()) expect(s).toContain('GFT en etensresten');

    await filtersOpen(page);
    await page.getByLabel('Afvalstroom').selectOption('');
    await page.getByLabel('Provincie').selectOption('Gelderland');
    await expect(page).toHaveURL(/provincie=Gelderland/);
    await resultatenBinnen(page);
    const provincies = page.locator('.archief-tabel .archief-meta');
    await expect(provincies.first()).toBeVisible();
    for (const p of await provincies.allInnerTexts()) expect(p).toContain('Gelderland');
    await geenHorizontaleScroll(page);
  });

  test('snelkeuze, link kopiëren, CSV en een pagina voorbij het einde', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/aanbestedingsarchief?pagina=999');
    await resultatenBinnen(page);
    // ?pagina=999 gaat naar de laatste pagina in plaats van een lege tabel.
    await expect(page).not.toHaveURL(/pagina=999/);
    await expect(page.locator('.archief-tabel tbody tr').first()).toBeVisible();

    await page.getByRole('button', { name: /Open voor inschrijving, vroegste sluiting eerst/ }).click();
    await expect(page).toHaveURL(/status=open/);
    await expect(page).toHaveURL(/sortering=sluiting-op/);
    await resultatenBinnen(page);
    await expect(page.getByRole('button', { name: /Open voor inschrijving, vroegste sluiting eerst/ })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Link kopiëren' }).click();
    await expect(page.locator('.archief-acties-melding')).toHaveText(/Link naar deze zoekopdracht gekopieerd|Kopiëren lukte niet/);

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^aanbestedingen-afval-\d{4}-\d{2}-\d{2}\.csv$/);
    const pad = await download.path();
    const inhoud = (await import('node:fs')).readFileSync(pad!, 'utf8');
    expect(inhoud.startsWith('\uFEFFKenmerk;Opdrachtgever;Titel;')).toBe(true);
    expect(inhoud).toContain('Open voor inschrijving');
    await expect(page.locator('.archief-acties-melding')).toContainText('CSV met');

    // Statusuitleg is zichtbaar op te vragen.
    await page.getByText('Wat betekenen de statussen en lege velden?').click();
    await expect(page.locator('.archief-legenda dt', { hasText: 'Gegund' })).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('op de telefoon een compacte lijst', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobiel-400', 'alleen op 400 px');
    await page.goto('/aanbestedingsarchief?status=open&sortering=sluiting-op');
    await resultatenBinnen(page);
    const eerste = page.locator('.archief-tabel tbody tr').first();
    await expect(eerste.locator('.archief-mobiel-kern')).toBeVisible();
    await expect(eerste.locator('.archief-mobiel-kern')).toContainText(/Sluit .* · (nog \d+ dag|vandaag)/);
    await expect(eerste.locator('td[data-label="Procedure"]')).toBeHidden();
    const hoogte = await page.locator('.archief-tabel').evaluate((e) => e.getBoundingClientRect().height);
    const rijen = await page.locator('.archief-tabel tbody tr').count();
    expect(hoogte / rijen, 'gemiddelde hoogte per aanbesteding').toBeLessThan(200);
    await geenHorizontaleScroll(page);
  });
});
