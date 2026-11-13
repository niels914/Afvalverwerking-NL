import { test, expect, type Page } from '@playwright/test';

// Heffingenscan restafval: zoeken, gemeentepagina met de controlecijfers van Overbetuwe, nascheiding, eigen cijfers
// en deellink, aanvraagformulier (Netlify en Supabase onderschept) en randgevallen.
// Draai tegen een eigen server: PW_BASE=http://localhost:5111 npx playwright test e2e/heffingenscan.spec.ts

async function geenHorizontaleScroll(page: Page) {
  const breedte = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, venster: window.innerWidth }));
  expect(breedte.scroll, 'pagina scrollt horizontaal').toBeLessThanOrEqual(breedte.venster);
}

/** Onderschept Netlify (POST naar /) en Supabase (rapportaanvragen); er gaat niets echt de deur uit. */
async function onderschep(page: Page, uitkomst: { netlify: number; supabase: number }) {
  const verstuurd: { netlify: string[]; supabase: string[] } = { netlify: [], supabase: [] };
  await page.route('**/*', async (route) => {
    const r = route.request();
    const url = new URL(r.url());
    if (r.method() === 'POST' && url.pathname === '/') {
      verstuurd.netlify.push(r.postData() ?? '');
      return route.fulfill({ status: uitkomst.netlify, body: '' });
    }
    if (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/rest/v1/rapportaanvragen')) {
      if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      verstuurd.supabase.push(r.postData() ?? '');
      return route.fulfill({ status: uitkomst.supabase, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: uitkomst.supabase >= 400 ? '{"message":"fout"}' : '' });
    }
    return route.continue();
  });
  return verstuurd;
}

async function vulFormulier(page: Page) {
  await page.getByLabel(/^Naam/).fill('Jan de Vries');
  await page.getByLabel(/^Functie/).fill('Beleidsadviseur afval');
  await page.getByLabel(/^E-mailadres/).fill('j.devries@voorbeeld.nl');
  await page.getByLabel(/Rapport voor één gemeente/).check();
  await page.getByLabel(/Ik ga akkoord met de/).check();
}

test.describe('Heffingenscan: overzicht en zoeken', () => {
  test('toont het landelijke beeld, het voorbeeld Overbetuwe en een doorzoekbare, sorteerbare tabel', async ({ page }) => {
    await page.goto('/heffingenscan');
    await expect(page.getByRole('heading', { level: 1, name: 'Heffingenscan restafval' })).toBeVisible();
    await expect(page.getByText('Dit is een bovengrens.').first()).toBeVisible();
    await expect(page.getByRole('note', { name: 'Status van het wetsvoorstel' })).toContainText('Tweede Kamer');
    await expect(page.getByRole('link', { name: /Bekijk de scan voor Overbetuwe/ })).toHaveAttribute('href', '/heffingenscan/overbetuwe');

    const tabel = page.getByRole('region', { name: /Tabel met alle gemeenten/ });
    await page.getByLabel('Zoek in de tabel').fill('arnhem');
    await expect(tabel.getByRole('link', { name: 'Arnhem', exact: true })).toBeVisible();
    await page.getByLabel('Zoek in de tabel').fill('');
    const kop = page.getByRole('columnheader', { name: /Heffingen 2035/ });
    // Eerste klik: grootste bedrag bovenaan; tweede klik: omgekeerd.
    await kop.getByRole('button').click();
    await expect(kop).toHaveAttribute('aria-sort', 'descending');
    await kop.getByRole('button').click();
    await expect(kop).toHaveAttribute('aria-sort', 'ascending');
    await kop.getByRole('button').click();
    await expect(kop).toHaveAttribute('aria-sort', 'descending');
    // Aflopend: een grote stad staat bovenaan, niet Aa en Hunze.
    await expect(tabel.getByRole('row').nth(1)).not.toContainText('Aa en Hunze');
    await expect(tabel.getByText('nascheiding').first()).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('zoekveld: Den Haag en Den Bosch werken als alias, Enter en klik gaan naar de gemeentepagina', async ({ page }) => {
    await page.goto('/heffingenscan');
    const veld = page.getByRole('combobox', { name: 'Zoek uw gemeente' });
    await veld.fill('Den Haag');
    await expect(page.getByRole('option', { name: /Gravenhage/ })).toBeVisible();
    await veld.press('Enter');
    await expect(page).toHaveURL(/\/heffingenscan\/s-gravenhage$/);
    await expect(page.getByRole('heading', { level: 1, name: /Heffingenscan restafval: 's-Gravenhage/ })).toBeVisible();

    await page.goto('/heffingenscan');
    await page.getByRole('combobox', { name: 'Zoek uw gemeente' }).fill('den bosch');
    await page.getByRole('button', { name: 'Toon mijn gemeente' }).click();
    await expect(page).toHaveURL(/\/heffingenscan\/s-hertogenbosch$/);

    await page.goto('/heffingenscan');
    await page.getByRole('combobox', { name: 'Zoek uw gemeente' }).fill('Overbet');
    await page.getByRole('option', { name: /Overbetuwe/ }).click();
    await expect(page).toHaveURL(/\/heffingenscan\/overbetuwe$/);
  });

  test('dubbelzinnige naam (Bergen) vraagt om een keuze; onbekende naam geeft een melding', async ({ page }) => {
    await page.goto('/heffingenscan');
    const veld = page.getByRole('combobox', { name: 'Zoek uw gemeente' });
    await veld.fill('Bergen');
    await veld.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Kies er een uit de lijst' })).toBeVisible();
    await expect(page.getByRole('option', { name: /Bergen \(L\.\)/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Bergen \(NH\.\)/ })).toBeVisible();
    await veld.fill('Xyzzyville');
    await veld.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'Geen gemeente gevonden' })).toBeVisible();
  });
});

test.describe('Heffingenscan: gemeentepagina Overbetuwe', () => {
  test('toont de controlecijfers, de nascheidingsmelding en de wetsstatus', async ({ page }) => {
    await page.goto('/heffingenscan/overbetuwe');
    await expect(page.getByRole('heading', { level: 1, name: 'Heffingenscan restafval: Overbetuwe' })).toBeVisible();
    await expect(page).toHaveTitle(/Heffingenscan Overbetuwe: €\s545\.467 aan heffingen op restafval in 2035/);
    await expect(page.getByText(/48\.945 inwoners en 20\.585 huishoudens/)).toBeVisible();

    const tegels = page.getByRole('group', { name: /Heffingen op restafval in 2026, 2030 en 2035/ });
    await expect(tegels).toContainText('€ 128.500');
    await expect(tegels).toContainText('€ 371.404');
    await expect(tegels).toContainText('€ 545.467');
    await expect(tegels).toContainText('€ 6 per huishouden');
    await expect(tegels).toContainText('€ 18 per huishouden');
    await expect(tegels).toContainText('€ 26 per huishouden');

    await expect(page.getByRole('note', { name: 'Nascheiding' })).toContainText('bovengrens');
    await expect(page.getByRole('note', { name: 'Status van het wetsvoorstel' })).toContainText('12 november 2026');

    // De CO2-heffing drijft de stijging, per ton, cumulatief en besparing.
    const tekst = page.locator('.hs-pagina');
    await expect(tekst).toContainText('20 % van de heffingen CO2-heffing, in 2035 63 %');
    await expect(tekst).toContainText('€ 38,33');
    await expect(tekst).toContainText('€ 110,78');
    await expect(tekst).toContainText('€ 162,69');
    await expect(tekst).toContainText('€ 3,55 mln bij Belastingplan 2027 en € 4,64 mln bij Belastingplan 2026');
    await expect(tekst).toContainText('circa € 54.220');

    // De tabel per jaar is inklapbaar en bevat alle jaren.
    await page.getByText('Tabel per jaar').click();
    await expect(page.getByRole('row', { name: /^2035 / })).toContainText('€ 545.467');
    await expect(page.getByRole('img', { name: /Heffingen op restafval per jaar voor Overbetuwe/ })).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('een gemeente zonder nascheiding heeft geen nascheidingsmelding', async ({ page }) => {
    await page.goto('/heffingenscan/arnhem');
    await expect(page.getByRole('heading', { level: 1, name: 'Heffingenscan restafval: Arnhem' })).toBeVisible();
    await expect(page.getByRole('note', { name: 'Nascheiding' })).toHaveCount(0);
    await expect(page.getByRole('note', { name: 'Status van het wetsvoorstel' })).toBeVisible();
  });

  test('eigen cijfers: aangepaste berekening, melding, deellink en terugzetten', async ({ page }) => {
    await page.goto('/heffingenscan/overbetuwe');
    await page.getByRole('heading', { name: 'Rekenen met eigen cijfers' }).click();
    const verbrand = page.getByLabel('Deel van het fijne restafval dat wordt verbrand');
    await verbrand.fill('50');
    await expect(page).toHaveURL(/verbrand=50/);
    await expect(page.getByText('Deze pagina rekent met aangepaste cijfers.')).toBeVisible();
    const tegels = page.getByRole('group', { name: /Heffingen op restafval in 2026, 2030 en 2035/ });
    await expect(tegels).toContainText('€ 272.734'); // helft van € 545.467
    // Ongeldige invoer wordt gemeld en niet doorgerekend.
    await verbrand.fill('150');
    await expect(page.getByText('Maximaal 100.')).toBeVisible();
    await expect(tegels).toContainText('€ 272.734');
    await verbrand.fill('50');

    // De deellink geeft dezelfde berekening.
    const link = await page.getByRole('button', { name: 'Link kopiëren' }).evaluate(() => window.location.href);
    await page.goto(link);
    await expect(page.getByText('Deze pagina rekent met aangepaste cijfers.')).toBeVisible();
    await expect(page.getByRole('group', { name: /Heffingen op restafval in 2026, 2030 en 2035/ })).toContainText('€ 272.734');

    // CSV-download.
    await page.getByRole('heading', { name: 'Rekenen met eigen cijfers' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV downloaden' }).click()]);
    expect(dl.suggestedFilename()).toMatch(/^heffingenscan-overbetuwe-\d{4}-\d{2}-\d{2}\.csv$/);

    await page.getByRole('button', { name: 'Terug naar de CBS-cijfers' }).first().click();
    await expect(page).not.toHaveURL(/verbrand=/);
    await expect(page.getByRole('group', { name: /Heffingen op restafval in 2026, 2030 en 2035/ })).toContainText('€ 545.467');
  });

  test('methode en bronnen: tarieventabel en bronlinks met peildatum', async ({ page }) => {
    await page.goto('/heffingenscan/overbetuwe');
    await page.getByRole('heading', { name: 'Methode en bronnen' }).click();
    await expect(page.getByRole('table', { name: /Afvalstoffenbelasting in euro per ton afval/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Eerste Kamer, dossier 37\.022/ })).toHaveAttribute('href', /eerstekamer\.nl/);
    await expect(page.getByText('Aanname, vul eigen waarde in').first()).toBeVisible();
    await expect(page.getByText(/peildatum 13 november 2026/).first()).toBeVisible();
  });

  test('printweergave: kop met logo, bronnen en "indicatief", zonder formulier; hooguit twee pagina\'s', async ({ page }) => {
    await page.goto('/heffingenscan/overbetuwe');
    await page.waitForSelector('.hs-pagina');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.rapportkop')).toBeVisible();
    await expect(page.locator('.rapportkop img')).toBeVisible();
    await expect(page.locator('.rapportkop')).toContainText('Indicatief, prijspeil 2026');
    await expect(page.locator('.hs-printbronnen')).toContainText('CBS 83452NED');
    await expect(page.locator('.hs-printbronnen')).toContainText('Belastingplan 2027');
    await expect(page.locator('#aanvragen')).toBeHidden();
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(paginas, 'de afdruk is langer dan twee pagina\'s').toBeLessThanOrEqual(2);
  });

  test('onbekende gemeente: nette melding met zoekveld, geen lege pagina', async ({ page }) => {
    await page.goto('/heffingenscan/bestaat-niet');
    await expect(page.getByRole('heading', { level: 1, name: 'Gemeente niet gevonden' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Zoek uw gemeente' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Naar alle gemeenten' })).toBeVisible();
  });

  test('geen horizontale scroll, ook met het formulier en het gestapelde diagram', async ({ page }) => {
    for (const pad of ['/heffingenscan', '/heffingenscan/amsterdam', '/heffingenscan/aanvragen?gemeente=arnhem']) {
      await page.goto(pad);
      await page.waitForSelector('.hs-pagina');
      await geenHorizontaleScroll(page);
    }
  });
});

test.describe('Heffingenscan: rapportaanvraag', () => {
  test('valideert de verplichte velden en het e-mailadres', async ({ page }) => {
    await onderschep(page, { netlify: 200, supabase: 201 });
    await page.goto('/heffingenscan/overbetuwe');
    await page.getByRole('button', { name: 'Aanvraag versturen' }).click();
    const samenvatting = page.getByRole('alert').filter({ hasText: 'Controleer de aanvraag' });
    await expect(samenvatting).toContainText('Vul uw naam in.');
    await expect(samenvatting).toContainText('Vul uw functie in.');
    await expect(samenvatting).toContainText('Vul uw e-mailadres in.');
    await expect(samenvatting).toContainText('Kies wat u wilt aanvragen.');
    await expect(samenvatting).toContainText('Ga akkoord met de privacyverklaring');
    await expect(page.getByLabel(/^Naam/)).toBeFocused();
    await expect(page.getByLabel(/^Organisatie/)).toHaveValue('Gemeente Overbetuwe');
    await page.getByLabel(/^E-mailadres/).fill('geen-adres');
    await page.getByRole('button', { name: 'Aanvraag versturen' }).click();
    await expect(page.getByText('Vul een geldig e-mailadres in, bijvoorbeeld naam@gemeente.nl.').first()).toBeVisible();
  });

  test('verstuurt naar Netlify en Supabase met gemeentecode, kerncijfers en bron; toont de bevestiging', async ({ page }) => {
    const verstuurd = await onderschep(page, { netlify: 200, supabase: 201 });
    await page.goto('/heffingenscan/overbetuwe?bron=linkedin-1');
    await vulFormulier(page);
    await page.getByRole('button', { name: 'Aanvraag versturen' }).click();
    await expect(page.getByRole('heading', { name: 'Bedankt, uw aanvraag voor Overbetuwe is binnen.' })).toBeVisible();
    await expect(page.getByText('binnen één werkdag')).toBeVisible();
    await expect(page.getByText('Houd voor dat gesprek bij de hand')).toContainText('verwerkingscontract');
    expect(verstuurd.netlify).toHaveLength(1);
    const n = new URLSearchParams(verstuurd.netlify[0]);
    expect(n.get('form-name')).toBe('rapportaanvraag');
    expect(n.get('gemeentecode')).toBe('GM1734');
    expect(n.get('bron')).toBe('linkedin-1');
    expect(n.get('keuze')).toBe('rapport');
    expect(n.get('kerncijfers')!.replace(/\u00a0/g, ' ')).toContain('€ 545.467');
    expect(n.get('bot-field')).toBe('');
    expect(verstuurd.supabase).toHaveLength(1);
    const s = JSON.parse(verstuurd.supabase[0]);
    expect(s).toMatchObject({ gemeentecode: 'GM1734', gemeente: 'Overbetuwe', email: 'j.devries@voorbeeld.nl', akkoord_privacy: true, bron: 'linkedin-1', telefoon: null });
  });

  test('de bron blijft voor de sessie bewaard, ook op een andere pagina', async ({ page }) => {
    const verstuurd = await onderschep(page, { netlify: 200, supabase: 201 });
    await page.goto('/heffingenscan?bron=mail-oktober');
    await page.getByRole('combobox', { name: 'Zoek uw gemeente' }).fill('Arnhem');
    await page.getByRole('option', { name: /Arnhem/ }).first().click();
    await vulFormulier(page);
    await page.getByRole('button', { name: 'Aanvraag versturen' }).click();
    await expect(page.getByRole('heading', { name: /is binnen/ })).toBeVisible();
    expect(new URLSearchParams(verstuurd.netlify[0]).get('bron')).toBe('mail-oktober');
  });

  test('lukt één van de twee, dan is de aanvraag binnen', async ({ page }) => {
    await onderschep(page, { netlify: 500, supabase: 201 });
    await page.goto('/heffingenscan/overbetuwe');
    await vulFormulier(page);
    await page.getByRole('button', { name: 'Aanvraag versturen' }).click();
    await expect(page.getByRole('heading', { name: /is binnen/ })).toBeVisible();
  });

  test('lukt geen van beide, dan staat er een mailknop met de ingevulde gegevens', async ({ page }) => {
    await onderschep(page, { netlify: 500, supabase: 400 });
    await page.goto('/heffingenscan/overbetuwe');
    await vulFormulier(page);
    await page.getByRole('button', { name: 'Aanvraag versturen' }).click();
    await expect(page.getByRole('heading', { name: 'Versturen is niet gelukt' })).toBeVisible();
    const mail = page.getByRole('link', { name: 'Aanvraag per e-mail sturen' });
    const href = (await mail.getAttribute('href'))!;
    expect(href).toMatch(/^mailto:n\.ahsmann@kplusv\.nl\?subject=/);
    const body = decodeURIComponent(href.split('body=')[1]).replace(/\u00a0/g, ' ');
    expect(body).toContain('Jan de Vries');
    expect(body).toContain('j.devries@voorbeeld.nl');
    expect(body).toContain('GM1734');
    expect(body).toContain('€ 545.467');
    // De invoer staat nog in het formulier.
    await expect(page.getByLabel(/^Naam/)).toHaveValue('Jan de Vries');
  });

  test('/heffingenscan/aanvragen?gemeente=… toont alleen het formulier; zonder gemeente eerst het zoekveld', async ({ page }) => {
    await onderschep(page, { netlify: 200, supabase: 201 });
    await page.goto('/heffingenscan/aanvragen?gemeente=den-haag');
    await expect(page.getByRole('heading', { level: 1, name: /Rapport aanvragen: 's-Gravenhage/ })).toBeVisible();
    await expect(page.getByLabel(/^Organisatie/)).toHaveValue("Gemeente 's-Gravenhage");
    await page.goto('/heffingenscan/aanvragen');
    await expect(page.getByRole('heading', { level: 1, name: 'Rapport aanvragen' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Zoek uw gemeente' }).fill('Overbetuwe');
    await page.getByRole('button', { name: 'Toon mijn gemeente' }).click();
    await expect(page).toHaveURL(/aanvragen\?gemeente=overbetuwe/);
    await expect(page.getByRole('button', { name: 'Aanvraag versturen' })).toBeVisible();
  });

  test('de knop "Rapport aanvragen" springt naar het formulier', async ({ page }) => {
    await page.goto('/heffingenscan/overbetuwe');
    await expect(page.getByRole('heading', { name: 'Betaalt Overbetuwe niet te veel?' })).toBeVisible();
    await page.getByRole('link', { name: 'Rapport aanvragen' }).click();
    await expect(page).toHaveURL(/#aanvragen$/);
    await expect(page.locator('#aanvragen')).toBeInViewport();
  });
});

test.describe('Heffingenscan: prerender per gemeente', () => {
  test('de eigen HTML heeft titel, canonical en deelafbeelding en de app laadt daarna', async ({ page, request }) => {
    const res = await request.get('/heffingenscan/arnhem/');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<title>Heffingenscan Arnhem: €\s[\d.]+ aan heffingen op restafval in 2035<\/title>/);
    expect(html).toContain('rel="canonical" href="');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('og-heffingenscan.png');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('>Heffingenscan restafval: Arnhem</h1>');
    await page.goto('/heffingenscan/arnhem/');
    await expect(page.getByRole('heading', { level: 1, name: 'Heffingenscan restafval: Arnhem' })).toBeVisible();
    await expect(page.locator('.hs-statisch')).toHaveCount(0);
    expect((await request.get('/og-heffingenscan.png')).headers()['content-type']).toContain('image/png');
  });
});
