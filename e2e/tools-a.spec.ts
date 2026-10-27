import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Indexcalculator en CO2-heffingenscan: gratis deel, bronnen, CSV-export, deellink en betaalmuur.
// Het Pro-deel testen we alleen als E2E_EMAIL en E2E_WACHTWOORD zijn gezet (account van een lid).

const cbs = JSON.parse(readFileSync(new URL('../src/data/indexreeksen.json', import.meta.url), 'utf8'));
const cpi = cbs.reeksen.find((r: { id: string }) => r.id === 'cpi');
const EMAIL = process.env.E2E_EMAIL;
const WACHTWOORD = process.env.E2E_WACHTWOORD;

const nl = (n: number, d = 2) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

async function geenHorizontaleScroll(page: Page) {
  const overloop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overloop, 'pagina scrolt horizontaal').toBeLessThanOrEqual(0);
}

async function leesDownload(page: Page, knop: string) {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: knop }).first().click()]);
  const pad = await download.path();
  return { naam: download.suggestedFilename(), tekst: readFileSync(pad!, 'utf8') };
}

test.describe('Indexcalculator', () => {
  test('rekent met echte CBS-cijfers en toont bron en peildatum', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await expect(page.getByRole('heading', { level: 1, name: 'Indexcalculator' })).toBeVisible();
    await geenHorizontaleScroll(page);

    // Standaard: CPI, jaarcijfers 2021 → laatste jaar.
    const peil = String(cpi.laatsteJaar);
    await expect(page.getByLabel('Indexreeks', { exact: true })).toHaveValue('cpi');
    await page.getByLabel('Basisperiode', { exact: true }).selectOption('2021');
    await page.getByLabel('Peilperiode', { exact: true }).selectOption(peil);
    const factor = cpi.jaren[peil] / cpi.jaren['2021'];
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(100 * factor));
    await expect(page.getByText(nl(factor, 4), { exact: true })).toBeVisible();

    // Kern bovenaan met dezelfde uitkomst.
    const kern = page.getByRole('region', { name: 'In het kort' });
    await expect(kern).toContainText(nl(100 * factor));
    await expect(kern).toContainText('Afronding: indexcijfers zoals CBS ze publiceert, indexfactor niet afgerond, tarief op hele centen');

    // Bron en peildatum zichtbaar.
    await expect(page.getByText(/CBS-cijfers, peildatum/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: '86141NED' }).first()).toHaveAttribute('href', /opendata\.cbs\.nl/);
    await expect(page.getByRole('heading', { name: 'Bronnen en peildatum' })).toBeVisible();

    // Eigen basistarief.
    const tarief = page.getByLabel('Basistarief', { exact: true });
    await tarief.fill('250,50');
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(250.5 * factor));
    await tarief.fill('abc');
    await expect(page.getByText('Vul een getal in.')).toBeVisible();
    await tarief.fill('250,5');
  });

  test('wisselt naar maandcijfers en meldt voorlopige cijfers', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.getByLabel('Maandcijfers').check();
    await page.getByLabel('Basisperiode', { exact: true }).selectOption('2024-09');
    const laatste = cpi.laatsteMaand;
    await page.getByLabel('Peilperiode', { exact: true }).selectOption(laatste);
    const factor = cpi.maanden[laatste] / cpi.maanden['2024-09'];
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(100 * factor));
    if (cpi.voorlopig.includes(laatste)) await expect(page.getByText(/CBS noemt een van deze cijfers voorlopig/)).toBeVisible();
    await expect(page).toHaveURL(/soort=maand/);
    await geenHorizontaleScroll(page);
  });

  test('rondt af volgens het contract en zet de afronding in link en CSV', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.getByLabel('Basisperiode', { exact: true }).selectOption('2021');
    const peil = String(cpi.laatsteJaar);
    await page.getByLabel('Peilperiode', { exact: true }).selectOption(peil);
    await page.getByLabel('Basistarief', { exact: true }).fill('87,65');
    await page.locator('#afronding summary').click();
    await page.getByLabel('Indexcijfers afronden').selectOption('1');
    await page.getByLabel('Indexfactor afronden').selectOption('3');
    const r1 = (n: number) => Math.round(n * 10) / 10;
    const factor = Math.round((r1(cpi.jaren[peil]) / r1(cpi.jaren['2021'])) * 1000) / 1000;
    await expect(page.locator('.tegel').nth(1)).toContainText(nl(factor, 3));
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(Math.round(87.65 * factor * 100) / 100));
    await expect(page).toHaveURL(/rindex=1/);
    await expect(page).toHaveURL(/rfactor=3/);
    const { tekst } = await leesDownload(page, 'CSV downloaden');
    expect(tekst).toContain('Afronding;indexcijfers op 1 decimaal, indexfactor op 3 decimalen, tarief op hele centen');
    expect(tekst).toContain(`Indexfactor;${String(factor).replace('.', ',')}`);
  });

  test('legt bij de dieselprijs uit dat accijns en btw erin zitten', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.getByLabel('Indexreeks', { exact: true }).selectOption('pomp-diesel');
    await expect(page.getByRole('note').filter({ hasText: 'inclusief accijns en btw' })).toBeVisible();
    await expect(page.getByText(/per liter/).first()).toBeVisible();
  });

  test('klapt achtergrond in en opent die via de inhoudsopgave', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    const bronnen = page.locator('details#bronnen');
    await expect(bronnen).not.toHaveAttribute('open', '');
    await page.getByRole('navigation', { name: 'Op deze pagina' }).getByRole('link', { name: 'Bronnen en peildatum' }).click();
    await expect(bronnen).toHaveAttribute('open', '');
    await expect(bronnen.getByText('Officiële bron').first()).toBeVisible();
    // Formule en gebruikte invoer zitten ingeklapt in de uitkomst.
    await expect(page.locator('.formule').first()).toBeHidden();
    await page.getByText('Zo ontstaat deze uitkomst').first().click();
    await expect(page.locator('.formule').first()).toBeVisible();
    await geenHorizontaleScroll(page);
  });

  test('exporteert CSV en deelt de invoer via de link', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.getByLabel('Indexreeks', { exact: true }).selectOption('cao-afval');
    await page.getByLabel('Basistarief', { exact: true }).fill('87,5');

    const { naam, tekst } = await leesDownload(page, 'CSV downloaden');
    expect(naam).toMatch(/^indexcalculator-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(tekst).toContain('Basistarief (euro per ton);87,5');
    expect(tekst).toContain('85663NED');
    expect(tekst).toContain('Peildatum (opgehaald);' + cbs.peildatum);

    const link = await page.getByLabel('Deellink met uw invoer').first().inputValue();
    expect(link).toContain('reeks=cao-afval');
    expect(link).toContain('tarief=87.5');

    // Link openen in een nieuwe pagina geeft dezelfde invoer.
    const tweede = await page.context().newPage();
    await tweede.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(tweede.getByLabel('Indexreeks', { exact: true })).toHaveValue('cao-afval');
    await expect(tweede.getByLabel('Basistarief', { exact: true })).toHaveValue('87,5');
    await tweede.close();
  });

  test('Pro-deel zit achter de betaalmuur', async ({ page }) => {
    test.skip(!!EMAIL, 'met inlog getest in de Pro-test');
    await page.goto('/tools/indexcalculator');
    const slot = page.locator('.slotkaart');
    await expect(slot.getByRole('heading', { name: /Indexcalculator Pro/ })).toBeVisible();
    await expect(slot.getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', /\/inloggen\?terug=%2Ftools%2Findexcalculator/);
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
  });

  test('Pro-preview rekent contractjaren met de voorbeeldweging', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    const r = (id: string) => cbs.reeksen.find((x: { id: string }) => x.id === id);
    const [cao, ppi] = [r('cao-afval'), r('ppi-energie')];
    const j = String(cpi.laatsteJaar); // contractjaar laatsteJaar + 1 gebruikt het jaarcijfer van laatsteJaar
    const f = 0.5 * (cao.jaren[j] / cao.jaren['2021']) + 0.3 * (cpi.jaren[j] / cpi.jaren['2021']) + 0.2 * (ppi.jaren[j] / ppi.jaren['2021']);
    const tabel = page.locator('.vergrendeld-preview table').first();
    await expect(tabel).toContainText(String(cpi.laatsteJaar + 1));
    await expect(tabel).toContainText(nl(100 * f));
  });
});

test.describe('Indexcalculator: vergelijking in de deellink', () => {
  test('een gedeelde link bewaart de vergeleken contractjaren', async ({ page }) => {
    await page.goto('/tools/indexcalculator?soort=jaar&tarief=100&reeks=cpi&basis=2021&peil=2025&weging=cpi:100&vast=0&van=2022&tot=2026&verschuiving=1&maand=9&vgl=2023-2025');
    const preview = page.locator('.vergrendeld-preview');
    await expect(preview.getByText('Verschil 2023 → 2025')).toBeVisible();
    // Contractjaar J gebruikt het jaarcijfer van J − 1.
    const f = cpi.jaren['2024'] / cpi.jaren['2022'];
    await expect(preview.locator('.tegel').filter({ hasText: 'Verschil 2023 → 2025' })).toContainText(nl((f - 1) * 100, 1));
    await expect(page).toHaveURL(/vgl=2023-2025/);
  });
});

test.describe('Indexcalculator: ronde 3', () => {
  const Q = 'soort=jaar&tarief=100&reeks=cpi&basis=2021&peil=2025&weging=cpi:100&vast=0&van=2022&tot=2026&verschuiving=1&maand=9';

  test('de grote Pro-tegel toont het tarief van het gekozen contractjaar, gelijk aan de tabel', async ({ page }) => {
    await page.goto(`/tools/indexcalculator?${Q}&vgl=2022-2025`);
    const pro = page.locator('.ta-pro');
    const hero = pro.locator('.tegel.hero');
    await expect(hero.locator('.tegel-label')).toHaveText(/Tarief contractjaar 2025/i);
    // Contractjaar 2025 rekent met het jaarcijfer 2024 (indexcijfer uit het voorgaande jaar).
    const tarief = nl(Math.round((100 * cpi.jaren['2024']) / cpi.jaren['2021'] * 100) / 100);
    await expect(hero.locator('.tegel-waarde')).toContainText(tarief);
    await expect(hero).toContainText('indexcijfer 2024');
    // Voor bezoekers is het Pro-deel een inerte preview: zoeken via CSS in plaats van rollen.
    const rij = pro.locator('table.ta-kaarttabel tbody tr').filter({ has: page.locator('th', { hasText: /^2025/ }) });
    await expect(rij).toContainText(tarief);
    await expect(rij).toContainText('in tegel');
    // Het tarief bij peilperiode 2025 uit het gratis deel is een ander getal, met een ander label.
    await expect(page.locator('.tegel.hero').first().locator('.tegel-label')).toHaveText(/Tarief peilperiode 2025/i);
    await geenHorizontaleScroll(page);
  });

  test('rekent met een eigen indexreeks en zet die in de deellink', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.locator('#eigen-reeks summary').click();
    await page.getByLabel('Naam van de reeks').fill('Sectorindex');
    await page.getByLabel('Indexcijfers per periode').fill('2021 80\n2024 90\n2025 100\nfout');
    await expect(page.getByText(/Niet gelezen en overgeslagen: regel 4/)).toBeVisible();
    await page.getByLabel('Indexreeks', { exact: true }).selectOption('eigen');
    await page.getByLabel('Basisperiode', { exact: true }).selectOption('2021');
    await page.getByLabel('Peilperiode', { exact: true }).selectOption('2025');
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(125));
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText('eigen indexcijfers');
    await expect(page).toHaveURL(/ereeks=2021%3A80%2C2024%3A90%2C2025%3A100/);
    await expect(page).toHaveURL(/enaam=Sectorindex/);
    const link = await page.getByLabel('Deellink met uw invoer').first().inputValue();
    const tweede = await page.context().newPage();
    await tweede.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(tweede.getByLabel('Indexreeks', { exact: true })).toHaveValue('eigen');
    await expect(tweede.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(125));
    await tweede.close();
  });

  test('toont geen oud bedrag na ongeldige invoer', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    await page.getByLabel('Basistarief', { exact: true }).fill('abc');
    const kern = page.getByRole('region', { name: 'In het kort' });
    await expect(kern).toContainText('Uitkomst niet bijgewerkt');
    await expect(kern).toContainText('Basistarief');
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toHaveText('–');
    await page.getByLabel('Basistarief', { exact: true }).fill('100');
    await expect(kern).not.toContainText('Uitkomst niet bijgewerkt');
  });

  test('laat de som zien om na te rekenen, met CBS-verwijzingen, en de versie', async ({ page }) => {
    await page.goto('/tools/indexcalculator');
    const blok = page.locator('.ta-narekenen');
    await expect(blok).toContainText('Zelf narekenen');
    await expect(blok).toContainText('÷');
    await expect(blok.getByRole('link', { name: /CBS-tabel 86141NED/ })).toHaveAttribute('href', /opendata\.cbs\.nl/);
    await expect(blok.getByRole('link', { name: /CBS over indexeren/ })).toHaveAttribute('href', /cbs\.nl\/nl-nl\/achtergrond/);
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText(/Versie \d/);
    const { tekst } = await leesDownload(page, 'CSV downloaden');
    expect(tekst).toContain('Narekenen;');
    expect(tekst).toContain('Versie tool;');
  });
});

test.describe('CO2-heffingenscan', () => {
  test('rekent met het wettelijke tarief en de correctiefactor', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    await expect(page.getByRole('heading', { level: 1, name: 'CO2-heffingenscan' })).toBeVisible();
    await geenHorizontaleScroll(page);

    // Standaard: 2,6 % inflatie, dus geldend recht 2027 = (103,66 + 49,66) × 1,026.
    await expect(page.locator('.tegel').nth(2)).toContainText(nl((103.66 + 49.66) * 1.026));
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText('ook met 2,6');
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText('0,380');

    await page.getByLabel('Restafval', { exact: true }).fill('10000');
    await page.getByLabel('Fossiele emissiefactor').fill('0,4');
    await page.getByLabel('Heffingsjaar').selectOption('2027');
    await page.getByLabel('Inflatiecorrectie per jaar').fill('0');
    // Geldend recht 2027 zonder inflatie: € 153,32; vrijgesteld 0,97 × 1,023 × 0,70
    const deel = 0.97 * 1.023 * 0.7;
    const kosten = 4000 * (1 - deel) * 153.32;
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(Math.round(kosten), 0));
    await expect(page.getByText('€ 153,32').first()).toBeVisible();

    // Wetsvoorstel: 2027 € 129,15 en een zichtbaar label.
    await page.getByRole('radio', { name: /Voorstel BP 2027/ }).check();
    await expect(page.locator('.tegel').nth(2)).toContainText('€ 129,15');
    await expect(page.getByText(/nog niet aangenomen/).first()).toBeVisible();

    // Eigen vrijgesteld deel.
    await page.getByLabel('Eigen percentage van uw verwerker').check();
    await page.getByLabel('Vrijgesteld deel van de uitstoot').fill('25');
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toContainText(nl(Math.round(4000 * 0.75 * 129.15), 0));
  });

  test('toont tarieventabel, bronnen en aannames', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    const tabel = page.getByRole('region', { name: 'Tabel tarief en correctiefactor per jaar' });
    await expect(tabel).toBeHidden(); // ingeklapt
    await page.getByRole('heading', { name: 'Tarieven per jaar' }).click();
    await expect(tabel).toBeVisible();
    await page.getByLabel('Inflatiecorrectie per jaar').fill('0');
    await expect(tabel.getByRole('row', { name: /^2030/ })).toContainText('€ 303,55');
    await expect(tabel.getByRole('row', { name: /^2035/ })).toContainText('€ 328,01');
    await page.getByRole('heading', { name: 'Bronnen en peildatum' }).click();
    await expect(page.getByRole('link', { name: /Wet belastingen op milieugrondslag/ }).first()).toHaveAttribute('href', /wetten\.overheid\.nl/);
    await expect(page.getByText('Aanname, vul eigen waarde in').first()).toBeVisible();
    await expect(page.getByText('Kental, afgeleid uit bron').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /lijst van energiedragers/ }).first()).toHaveAttribute('href', /rvo\.nl/);
    await expect(page.getByRole('heading', { name: 'Wat kan er veranderen' })).toBeVisible();
    // Eerlijke vergelijking: tabel in prijspeil 2026 en een waarschuwing bij 0 % inflatie.
    const pp = page.getByRole('region', { name: 'Tabel tariefpad in prijspeil 2026' });
    await expect(pp.getByRole('row', { name: /2030/ })).toContainText('€ 304');
    await expect(pp.getByRole('row', { name: /2030/ })).toContainText('€ 193');
    await expect(page.getByText(/Zonder inflatieaanname lijkt het voorstel/)).toBeVisible();
    await page.getByLabel('Inflatiecorrectie per jaar').fill('2');
    await expect(page.getByText(/Zonder inflatieaanname lijkt het voorstel/)).toBeHidden();
    await expect(tabel.getByRole('row', { name: /^2027/ })).toContainText(nl((103.66 + 49.66) * 1.02));
    await geenHorizontaleScroll(page);
  });

  test('is op 400 px kort genoeg: kern bovenaan, details ingeklapt', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobiel-400', 'alleen mobiel');
    for (const pad of ['/tools/co2-heffingenscan', '/tools/indexcalculator']) {
      await page.goto(pad);
      await expect(page.getByRole('region', { name: 'In het kort' })).toBeVisible();
      await expect(page.locator('.slotkaart')).toBeVisible();
      const hoogte = await page.evaluate(() => document.documentElement.scrollHeight);
      expect(hoogte, `${pad} is te lang op 400 px`).toBeLessThan(5500);
      await geenHorizontaleScroll(page);
    }
  });

  test('exporteert CSV en herstelt invoer uit de deellink', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    await page.getByLabel('Restafval', { exact: true }).fill('12345');
    await page.getByLabel('Heffingsjaar').selectOption('2031');
    await page.getByRole('radio', { name: /Voorstel BP 2027/ }).check();

    const { tekst } = await leesDownload(page, 'CSV downloaden');
    expect(tekst).toContain('Restafval (ton per jaar);12345;aanname gebruiker');
    expect(tekst).toContain('Heffingsjaar;2031');
    expect(tekst).toContain('rijksfinancien.nl');

    const link = await page.getByLabel('Deellink met uw invoer').first().inputValue();
    const tweede = await page.context().newPage();
    await tweede.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(tweede.getByLabel('Restafval', { exact: true })).toHaveValue('12345');
    await expect(tweede.getByLabel('Heffingsjaar')).toHaveValue('2031');
    await expect(tweede.getByRole('radio', { name: /Voorstel BP 2027/ })).toBeChecked();
    await tweede.close();
  });

  test('toont bandbreedte en onzekerheid bij de uitkomst', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    const onzeker = page.getByRole('note', { name: 'Onzekerheid' });
    await expect(onzeker).toContainText('Onder- en bovengrens 2027');
    await expect(onzeker).toContainText('nog niet aangenomen');
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText('coalitieakkoord noemt afschaffing');
    await expect(page.getByRole('region', { name: 'In het kort' })).not.toContainText('kabinet wil');
    await page.getByLabel('Heffingsjaar').selectOption('2026');
    await expect(onzeker).toContainText('tarief ligt vast in de wet');
  });

  test('accepteert een uitstoot ver onder het historisch niveau en labelt de benadering', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    await page.getByLabel('Uitstoot van de AVI ten opzichte van het historisch niveau').fill('70');
    await expect(page.getByText('Vul een getal in.')).toBeHidden();
    await expect(page.getByText(/Meer dan 15 % afwijking/)).toBeVisible();
    await expect(page).toHaveURL(/verh=70/);
  });

  test('labelt het tarief met inflatieaanname in tegel en CSV, en verbergt bedragen bij ongeldige invoer', async ({ page }) => {
    await page.goto('/tools/co2-heffingenscan');
    await expect(page.locator('.tegel').nth(2)).toContainText('inflatie per jaar (aanname)');
    const { tekst } = await leesDownload(page, 'CSV downloaden');
    expect(tekst).toContain('Tarief 2027 volgens wet, zonder inflatiecorrectie (euro per ton CO2);153,32');
    expect(tekst).toMatch(/Tarief 2027 incl\. inflatieaanname 2,6 % per jaar \(euro per ton CO2\);157,3/);
    expect(tekst).toContain('Bandbreedte ondergrens');
    await page.getByLabel('Restafval', { exact: true }).fill('');
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText('Uitkomst niet bijgewerkt');
    await expect(page.locator('.tegel.hero .tegel-waarde').first()).toHaveText('–');
  });

  test('Pro-deel zit achter de betaalmuur', async ({ page }) => {
    test.skip(!!EMAIL, 'met inlog getest in de Pro-test');
    await page.goto('/tools/co2-heffingenscan');
    await expect(page.locator('.slotkaart').getByRole('heading', { name: /CO2-heffingenscan Pro/ })).toBeVisible();
    await expect(page.locator('.vergrendeld-preview')).toHaveAttribute('inert', '');
  });
});

test.describe('Navigatie en printweergave', () => {
  for (const [pad, titel, anker] of [
    ['/tools/indexcalculator', 'Indexcalculator', 'Bronnen en peildatum'],
    ['/tools/co2-heffingenscan', 'CO2-heffingenscan', 'Tarieven per jaar'],
  ] as const) {
    test(`${titel}: inhoudsopgave en rapportkop bij printen`, async ({ page }) => {
      await page.goto(pad);
      const nav = page.getByRole('navigation', { name: 'Op deze pagina' });
      await nav.getByRole('link', { name: anker }).click();
      await expect(page).toHaveURL(/#/);
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('.rapportkop')).toBeVisible();
      await expect(page.locator('.rapportkop')).toContainText(`Rapport ${titel}`);
      await expect(nav).toBeHidden();
      await expect(page.getByRole('button', { name: 'CSV downloaden' }).first()).toBeHidden();
      // Ingeklapte delen komen in het rapport mee.
      await expect(page.locator('.formule').first()).toBeVisible();
      await expect(page.locator('details#bronnen .bronregels')).toBeVisible();
    });
  }
});

test.describe('Pro voor leden', () => {
  test.skip(!EMAIL || !WACHTWOORD, 'Zet E2E_EMAIL en E2E_WACHTWOORD om het Pro-deel te testen.');

  async function logIn(page: Page, terug: string) {
    await page.goto(`/inloggen?terug=${encodeURIComponent(terug)}`);
    await page.getByLabel('E-mailadres').fill(EMAIL!);
    await page.getByLabel('Wachtwoord', { exact: true }).fill(WACHTWOORD!);
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click();
    await page.waitForURL(`**${terug}**`);
  }

  test('Indexcalculator Pro: weging, contractjaren en CSV', async ({ page }) => {
    await logIn(page, '/tools/indexcalculator');
    await expect(page.getByRole('heading', { name: 'Tarief per contractjaar' })).toBeVisible();
    await expect(page.getByText(/Samen 100\s%/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tabel tarief per contractjaar' }).getByRole('row')).not.toHaveCount(1);
    const { tekst } = await leesDownload(page, 'CSV downloaden'); // eerste knop = gratis deel
    expect(tekst).toContain('Indexcalculator');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV downloaden' }).nth(1).click()]);
    const pro = readFileSync((await download.path())!, 'utf8');
    expect(pro).toContain('Indexcijfer CPI peilperiode (CBS 86141NED)');
    expect(pro).toContain('Getoond contractjaar;');
    expect(pro).toContain('Afronding;');
    await expect(page.getByRole('button', { name: 'Rapport maken' })).toBeVisible();
  });

  test('Pro-invoer blijft staan na het laden van de ledentoegang', async ({ page }) => {
    await logIn(page, '/tools/indexcalculator');
    await page.goto('/tools/indexcalculator');
    // Zolang de toegang wordt gecontroleerd, is er geen Pro-invoer die later vervangen wordt.
    const veld = page.getByLabel('Vast deel, niet geïndexeerd');
    await veld.fill('15');
    await page.waitForTimeout(2500);
    await expect(veld).toHaveValue('15');
    await expect(page).toHaveURL(/vast=15/);
  });

  test('CO2-heffingenscan Pro: scenario’s en vergelijking', async ({ page }) => {
    await logIn(page, '/tools/co2-heffingenscan');
    const tabel = page.getByRole('region', { name: 'Tabel heffing per jaar per scenario' });
    // Op 400 px staan de bedragen per jaar ingeklapt; breed staan ze open.
    if ((page.viewportSize()?.width ?? 1280) <= 520) {
      await expect(tabel).toBeHidden();
      await page.getByText('Bedragen per jaar').click();
    }
    await expect(tabel).toBeVisible();
    await expect(tabel.locator('tbody tr')).toHaveCount(10);
    await expect(page.getByText(/Huidig scenario, totaal/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText(/Pro: totaal 2026–2035/);
    await geenHorizontaleScroll(page);
  });

  test('Indexcalculator Pro: kern noemt het tarief van het contractjaar', async ({ page }) => {
    await logIn(page, '/tools/indexcalculator');
    const hero = page.locator('.ta-pro .tegel.hero');
    await expect(hero.locator('.tegel-label')).toHaveText(/Tarief contractjaar \d{4}/i);
    const waarde = (await hero.locator('.tegel-waarde').textContent())!.trim();
    await expect(page.getByRole('region', { name: 'In het kort' })).toContainText(`Met uw weging (Pro): ${waarde}`);
    await geenHorizontaleScroll(page);
  });
});
