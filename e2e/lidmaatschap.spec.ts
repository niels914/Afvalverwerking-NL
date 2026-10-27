import { test, expect, type Page } from '@playwright/test';

// Lidmaatschap: prijzenpagina en de hele aanmeldflow tot en met de orderbevestiging.
// Draaien tegen een eigen server: PW_BASE=http://localhost:5101 npx playwright test e2e/lidmaatschap.spec.ts

async function geenHorizontaleScroll(page: Page) {
  const breedte = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, venster: window.innerWidth }));
  expect(breedte.scroll, 'pagina scrollt horizontaal').toBeLessThanOrEqual(breedte.venster);
}

/** Klapt een inklapbaar blok open als het nog dicht is (op smal standaard dicht, op breed open). */
async function openUitklap(page: Page, selector: string) {
  const details = page.locator(`${selector} details`).first();
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
}

/** De prijs zoals de gebruiker hem ziet: breed in het prijsblok naast het formulier, smal direct onder de typekeuze. */
function zichtbarePrijs(page: Page) {
  return page.locator('[data-prijs]:visible');
}

async function vulGegevensIn(page: Page) {
  await page.getByLabel('Naam organisatie').fill('Afvalsamenwerking Testregio');
  await page.getByLabel(/Samenwerkingsverband van gemeenten/).check();
  await page.getByLabel('Aantal deelnemende gemeenten').fill('3');
  await page.getByLabel('KVK-nummer').fill('1234 5678');
  await page.getByLabel(/^Factuuradres/).fill('Postbus 100');
  await page.getByLabel(/^Postcode/).fill('1234ab');
  await page.getByLabel(/^Plaats/).fill('Teststad');
  await page.getByLabel('E-mailadres crediteurenadministratie').fill('facturen@testregio.nl');
  await page.getByLabel(/^Inkoopordernummer/).fill('IO-2026-0042');
  await page.getByLabel('Naam contactpersoon').fill('Jan de Vries');
  await page.getByLabel('E-mailadres contactpersoon').fill('j.devries@testregio.nl');
  await page.getByRole('button', { name: '@testregio.nl toevoegen' }).click();
  await expect(page.getByLabel('E-maildomeinen die toegang krijgen')).toHaveValue('testregio.nl');
}

test.describe('Lidmaatschap en prijzen', () => {
  test('toont staffels met prijs excl. en incl. btw, voorwaarden, vergelijking, vragen en bronnen', async ({ page }) => {
    await page.goto('/lidmaatschap');
    await expect(page.getByRole('heading', { level: 1, name: 'Lidmaatschap en prijzen' })).toBeVisible();
    await expect(page.getByText('Concept: prijzen nog niet vastgesteld').first()).toBeVisible();

    for (const naam of ['Samenwerkingsverband, klein', 'Samenwerkingsverband, groot', 'Gemeente', 'Verwerker']) {
      await expect(page.getByRole('heading', { level: 3, name: naam })).toBeVisible();
    }
    // Klein: € 2.500 excl., € 3.025,00 incl. 21 % btw
    const kaartKlein = page.getByRole('region', { name: 'Samenwerkingsverband, klein' });
    await expect(kaartKlein).toContainText('2.500');
    await expect(kaartKlein).toContainText('3.025,00 incl. 21 % btw');
    // De gemeenteprijs is zichtbaar gelabeld als aanname.
    await expect(page.getByRole('region', { name: 'Gemeente' })).toContainText(/Aanname.*nog geen richtprijs/);

    await expect(page.getByText(/Stilzwijgend, steeds met 12 maanden/)).toBeVisible();
    await expect(page.locator('#voorwaarden').getByText(/uiterlijk 1 maand voor de einddatum/)).toBeVisible();
    await expect(page.locator('#voorwaarden')).toContainText('behalve als het btw-tarief wettelijk verandert');
    await expect(page.locator('#voorwaarden').getByRole('link', { name: 'n.ahsmann@kplusv.nl' })).toHaveAttribute('href', /^mailto:.*Opzegging/);

    await openUitklap(page, '#vergelijking');
    await expect(page.locator('#vergelijking').getByRole('row', { name: /Rekenmodel bron- en nascheiding PMD/ })).toContainText('Nee');

    const vraag = page.getByText('Hoeveel gebruikers mogen er inloggen?');
    await vraag.click();
    await expect(page.getByText(/U betaalt per organisatie/)).toBeVisible();

    await openUitklap(page, '#bronnen');
    const bronnen = page.locator('#bronnen');
    await expect(bronnen.getByRole('link', { name: /Belastingdienst/ })).toHaveAttribute('href', /belastingdienst\.nl/);
    await expect(bronnen).toContainText(/geraadpleegd op \d+ oktober 2026/);
    await geenHorizontaleScroll(page);
  });

  test('veelgestelde vragen: inkoop, mandaat, verwerkersovereenkomst, btw en e-mail per actie', async ({ page }) => {
    await page.goto('/lidmaatschap');
    const vragen = page.locator('#vragen');
    await vragen.getByText('Wij werken met een offerte en een inkoopordernummer. Kan dat?').click();
    await expect(vragen.getByRole('link', { name: /PIANOo/ })).toBeVisible();
    await vragen.getByText('Wij hebben eigen inkoopvoorwaarden. Gelden die?').click();
    await expect(vragen.getByRole('link', { name: 'Artikel 2 van de algemene voorwaarden' })).toHaveAttribute('href', '/algemene-voorwaarden#toepassing');
    await vragen.getByText('Wie mag de aanmelding doen?').click();
    await expect(vragen.getByText(/mandaat- en volmachtenbesluit/)).toBeVisible();
    await vragen.getByText('Is een verwerkersovereenkomst nodig?').click();
    await expect(vragen.getByText(/als verwerkingsverantwoordelijke/)).toBeVisible();
    await vragen.getByText('Kan de prijs veranderen?').click();
    await expect(vragen.getByText(/wettelijke wijziging van het btw-tarief/)).toBeVisible();
    await vragen.getByText('Is er een proefperiode?').click();
    await expect(vragen.getByRole('link', { name: 'Proeftoegang aanvragen per e-mail' })).toHaveAttribute('href', /^mailto:n\.ahsmann@kplusv\.nl\?subject=Proeftoegang/);
    await vragen.getByText('Hoe lang loopt het lidmaatschap en hoe zeg ik op?').click();
    await expect(vragen.getByRole('link', { name: 'Opzeggen per e-mail' })).toHaveAttribute('href', /subject=Opzegging%20lidmaatschap&body=Organisatie/);
    await geenHorizontaleScroll(page);
  });

  test('prijzen en vergelijking passen zonder horizontaal scrollen; vergelijking volgt de tools', async ({ page }) => {
    await page.goto('/lidmaatschap');
    const smal = (page.viewportSize()?.width ?? 1280) <= 600;
    const tabel = page.locator('#prijzen table');
    if (smal) {
      // Op de telefoon staan de bedragen in compacte kaarten; de tabel met dezelfde bedragen is verborgen.
      await expect(tabel).toBeHidden();
      await expect(page.getByRole('region', { name: 'Verwerker' })).toContainText('6.655,00 incl. 21 % btw');
    } else {
      const rijKlein = tabel.getByRole('row', { name: /Samenwerkingsverband klein/ });
      await expect(rijKlein).toContainText(/2\.500,00/);
      await expect(rijKlein).toContainText(/525,00/);
      await expect(rijKlein).toContainText(/3\.025,00/);
      await expect(tabel.getByRole('row', { name: /Gemeente \(aanname\)/ })).toBeVisible();
      await expect(tabel.locator('tbody tr', { hasText: 'Verwerker' }).locator('td').last()).toContainText('6.655,00');
    }
    // Op smal is de vergelijking ingeklapt, op breed open.
    const uitklap = page.locator('#vergelijking details');
    if (smal) {
      await expect(uitklap).not.toHaveAttribute('open', '');
      await uitklap.locator('summary').click();
    } else {
      await expect(uitklap).toHaveAttribute('open', '');
    }
    const pastErin = await page.locator('#vergelijking .tabel-container').evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(pastErin, 'vergelijkingstabel scrolt horizontaal').toBe(true);
    await expect(page.locator('#vergelijking')).toContainText('Gratis voor iedereen: de Restafvalkaart');
    // Rijen per rekentool komen uit src/data/tools.ts.
    const index = page.locator('#vergelijking tbody tr', { hasText: 'Indexcalculator' });
    await expect(index).toContainText('Eén CBS-reeks');
    await expect(index).toContainText('zes CBS-reeksen');
    await expect(page.locator('#vergelijking tbody tr', { hasText: 'Aanbestedingstool' })).toContainText('Ja');
    // Besluit Niels (27-10-2026): open aanbestedingen zoeken is gratis; filters, details, historie en export zijn voor leden.
    const open = page.locator('#vergelijking tbody tr', { hasText: 'open aanbestedingen zoeken' });
    await expect(open.locator('td').first()).toContainText('Ja');
    const archief = page.locator('#vergelijking tbody tr', { hasText: 'Aanbestedingsarchief: filters' });
    await expect(archief.locator('td').first()).toContainText('Nee');
    await expect(archief.locator('td').last()).toContainText('Ja');
    await geenHorizontaleScroll(page);
  });

  test('aanmeldknop bij een staffel kiest het juiste type', async ({ page }) => {
    await page.goto('/lidmaatschap');
    await page.getByRole('link', { name: 'Aanmelden: Verwerker' }).click();
    await expect(page).toHaveURL(/\/lidmaatschap\/aanmelden\?staffel=verwerker/);
    await expect(page.getByLabel('Afvalverwerker of sorteerder')).toBeChecked();
    await expect(zichtbarePrijs(page)).toContainText(/5\.500/);
  });

  test('kruimelpad en naar boven', async ({ page }) => {
    await page.goto('/lidmaatschap/aanmelden');
    const kruimel = page.getByRole('navigation', { name: 'Kruimelpad' });
    await expect(kruimel.getByRole('link', { name: 'Lidmaatschap en prijzen' })).toHaveAttribute('href', '/lidmaatschap');
    await page.goto('/lidmaatschap');
    await expect(page.getByRole('link', { name: /Naar boven/ })).toHaveAttribute('href', '#lm-inhoud');
  });
});

test.describe('Aanmelden', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lidmaatschap/aanmelden');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.removeItem('afvalplatform-aanmelding');
    });
    await page.reload();
  });

  test('meldt ontbrekende velden in een foutsamenvatting', async ({ page }) => {
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    const samenvatting = page.getByRole('alert');
    await expect(samenvatting).toBeVisible();
    await expect(samenvatting).toContainText('Naam organisatie');
    await expect(samenvatting).toContainText('KVK-nummer');
    await expect(samenvatting).toContainText('E-maildomeinen voor toegang');
    await samenvatting.getByRole('link', { name: /Naam organisatie/ }).click();
    await expect(page.getByLabel('Naam organisatie')).toBeFocused();
    await expect(page.getByLabel('Naam organisatie')).toHaveAttribute('aria-invalid', 'true');
    await geenHorizontaleScroll(page);
  });

  test('verwerker moet een btw-nummer opgeven, gmail.com geeft geen toegang', async ({ page }) => {
    await vulGegevensIn(page);
    await page.getByLabel('Afvalverwerker of sorteerder').check();
    await page.getByLabel('E-maildomeinen die toegang krijgen').fill('gmail.com');
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    const samenvatting = page.getByRole('alert');
    await expect(samenvatting).toContainText('Alleen overheden mogen dit leeg laten');
    await expect(samenvatting).toContainText('gmail.com');
  });

  test('volledige aanmelding: prijs, controle, akkoord en orderbevestiging', async ({ page }) => {
    let verstuurd = '';
    await page.route('**/', async (route) => {
      if (route.request().method() === 'POST') {
        verstuurd = route.request().postData() ?? '';
        await route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
      } else {
        await route.continue();
      }
    });

    await vulGegevensIn(page);
    const prijs = zichtbarePrijs(page);
    await expect(prijs).toHaveCount(1);
    await expect(prijs).toContainText('Samenwerkingsverband, klein');
    await expect(prijs).toContainText(/3\.025,00/);
    await expect(prijs).toContainText(/2\.500/);
    if ((page.viewportSize()?.width ?? 1280) <= 900) {
      // Smal: de prijs staat direct onder het aantal gemeenten, dus bij de keuze, en niet los bovenaan.
      const veld = await page.getByLabel('Aantal deelnemende gemeenten').boundingBox();
      const blok = await prijs.boundingBox();
      expect(blok!.y).toBeGreaterThan(veld!.y);
      expect(blok!.y - (veld!.y + veld!.height)).toBeLessThan(160);
    } else {
      // Breed: het prijsblok scrolt mee naast het formulier.
      await page.getByLabel('Gewenste startdatum').scrollIntoViewIfNeeded();
      await expect(prijs).toBeInViewport();
    }
    await geenHorizontaleScroll(page);

    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Controleer uw aanmelding' })).toBeVisible();
    await expect(page.getByText('IO-2026-0042')).toBeVisible();
    await expect(page.getByText('1234 AB Teststad')).toBeVisible();
    await expect(page.getByText(/Totaal per jaar incl\. btw/)).toBeVisible();
    await geenHorizontaleScroll(page);

    // Zonder akkoord niet verzenden
    await page.getByRole('button', { name: 'Aanmelding verzenden' }).click();
    await expect(page.getByRole('alert')).toContainText('Algemene voorwaarden');
    expect(verstuurd).toBe('');

    await expect(page.getByRole('link', { name: /^algemene voorwaarden/ })).toHaveAttribute('href', '/algemene-voorwaarden');
    await expect(page.getByRole('link', { name: /^privacyverklaring/ })).toHaveAttribute('href', '/privacy');
    await page.getByLabel(/ga akkoord met de/).check();
    await page.getByLabel(/Ik heb de privacyverklaring/).check();
    await page.getByRole('button', { name: 'Aanmelding verzenden' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Aanmelding ontvangen' })).toBeVisible();
    await expect(page.locator('.lm-ordernummer')).toHaveText(/^LID-\d{8}-[A-Z2-9]{5}$/);
    await expect(page.getByText('Wat er nu gebeurt')).toBeVisible();
    await expect(page.getByText(/met inkoopordernummer IO-2026-0042/)).toBeVisible();
    await geenHorizontaleScroll(page);

    const body = new URLSearchParams(verstuurd);
    expect(body.get('form-name')).toBe('aanmelding');
    expect(body.get('bot-field')).toBe('');
    expect(body.get('staffel')).toBe('samenwerkingsverband-klein');
    expect(body.get('kvk')).toBe('12345678');
    expect(body.get('prijs_excl_btw')).toBe('2500.00');
    expect(body.get('prijs_incl_btw')).toBe('3025.00');
    expect(body.get('toegang')).toBe('testregio.nl');
    expect(body.get('akkoord_voorwaarden')).toBe('ja');
    expect(body.get('ordernummer')).toMatch(/^LID-/);
    expect(body.get('soort')).toBe('aanmelding');
  });

  test('offerte aanvragen: zonder toegangsdomeinen en zonder akkoord voorwaarden, daarna door naar aanmelden', async ({ page }) => {
    let verstuurd = '';
    await page.route('**/', async (route) => {
      if (route.request().method() === 'POST') {
        verstuurd = route.request().postData() ?? '';
        await route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' });
      } else {
        await route.continue();
      }
    });
    await page.goto('/lidmaatschap');
    await page.getByRole('link', { name: 'Eerst een offerte aanvragen' }).click();
    await expect(page).toHaveURL(/soort=offerte/);
    await expect(page.getByRole('heading', { level: 1, name: 'Offerte aanvragen' })).toBeVisible();
    await expect(page.getByLabel(/Eerst een offerte ontvangen/)).toBeChecked();

    await vulGegevensIn(page);
    await page.getByLabel('E-maildomeinen die toegang krijgen').fill('');
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Controleer uw offerteaanvraag' })).toBeVisible();
    await expect(page.getByLabel(/ga akkoord met de/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Offerteaanvraag verzenden' }).click();
    await expect(page.getByRole('alert')).toContainText('Privacyverklaring');
    expect(verstuurd).toBe('');
    await page.getByLabel(/Ik heb de privacyverklaring/).check();
    await page.getByRole('button', { name: 'Offerteaanvraag verzenden' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Offerteaanvraag ontvangen' })).toBeVisible();
    await expect(page.locator('.lm-ordernummer')).toHaveText(/^OFF-\d{8}-[A-Z2-9]{5}$/);
    await expect(page.getByText(/offerte als pdf/)).toBeVisible();
    await geenHorizontaleScroll(page);
    const body = new URLSearchParams(verstuurd);
    expect(body.get('soort')).toBe('offerte');
    expect(body.get('akkoord_voorwaarden')).toBe('nvt (offerte)');
    expect(body.get('akkoord_privacy')).toBe('ja');
    expect(body.get('toegang')).toBe('');

    // Akkoord met de offerte: gegevens staan klaar in het aanmeldformulier.
    await page.getByRole('link', { name: 'aanmeldformulier' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Aanmelden voor een lidmaatschap' })).toBeVisible();
    await expect(page.getByLabel('Naam organisatie')).toHaveValue('Afvalsamenwerking Testregio');
    await expect(page.getByLabel(/^Lid worden/)).toBeChecked();
  });

  test('prijs verschijnt direct bij het type; ongeldig aantal gemeenten geeft een melding over het aantal', async ({ page }) => {
    const prijs = zichtbarePrijs(page);
    if ((page.viewportSize()?.width ?? 1280) > 900) await expect(prijs).toContainText('Kies het type organisatie');
    else await expect(prijs).toHaveCount(0);
    // De prijs staat al bij de keuze zelf.
    await expect(page.getByLabel(/^Gemeente/)).toBeVisible();
    await expect(page.locator('label', { hasText: /^Gemeente/ })).toContainText('1.500');
    await page.getByLabel(/Samenwerkingsverband van gemeenten/).check();
    // Beide prijzen staan bij de keuze zelf; breed ook in het prijsblok, smal vraagt het blok onder de keuze om het aantal.
    const keuzeSv = page.locator('label', { hasText: /^Samenwerkingsverband van gemeenten/ });
    await expect(keuzeSv).toContainText('2.500');
    await expect(keuzeSv).toContainText('8.500');
    if ((page.viewportSize()?.width ?? 1280) > 900) await expect(prijs).toContainText('8.500');
    else await expect(prijs).toContainText('Vul het aantal deelnemende gemeenten in');
    for (const aantal of ['2.5', '1', 'abc', '343']) {
      await page.getByLabel('Aantal deelnemende gemeenten').fill(aantal);
      await expect(prijs).toContainText('heel getal van 2 tot en met 342');
      await expect(prijs).not.toContainText('startdatum');
    }
    await page.getByLabel('Aantal deelnemende gemeenten').fill('4');
    await expect(prijs).toContainText('Samenwerkingsverband, groot');
    await expect(prijs).toContainText('10.285,00');
    // De bovengrens (342 gemeenten) staat met bron bij het veld.
    await expect(page.getByRole('link', { name: 'CBS, 1 januari 2026' })).toHaveAttribute('href', /cbs\.nl/);
    // Een ongeldige startdatum verbergt de prijs niet.
    await page.getByLabel('Gewenste startdatum').selectOption('anders');
    await page.getByLabel('Andere startdatum').fill('');
    await expect(prijs).toContainText('8.500');
    if ((page.viewportSize()?.width ?? 1280) > 900) await expect(prijs).toBeInViewport();
  });

  test('optionele gegevens zijn ingeklapt en klappen open bij een fout', async ({ page }) => {
    const aanvullend = page.locator('details.lm-aanvullend');
    await expect(aanvullend).not.toHaveAttribute('open', '');
    await expect(page.getByLabel(/^OIN/)).toBeHidden();
    await vulGegevensIn(page);
    await aanvullend.locator('summary').click();
    await page.getByLabel(/^OIN/).fill('123');
    await aanvullend.locator('summary').click();
    await expect(page.getByLabel(/^OIN/)).toBeHidden();
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    const samenvatting = page.getByRole('alert');
    await expect(samenvatting).toContainText('20 cijfers');
    await expect(aanvullend).toHaveAttribute('open', '');
    await samenvatting.getByRole('link', { name: /OIN/ }).click();
    await expect(page.getByLabel(/^OIN/)).toBeFocused();
  });

  test('als verzenden mislukt: duidelijke melding, lokaal bewaard en e-mail als alternatief', async ({ page }) => {
    await page.route('**/', async (route) => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 500, body: 'fout' });
      else await route.continue();
    });
    await vulGegevensIn(page);
    await page.locator('details.lm-aanvullend summary').click();
    await page.getByLabel(/^Opmerkingen/).fill('Graag factureren volgens onze inkoopvoorwaarden, artikel 4. '.repeat(30));
    await page.getByRole('button', { name: 'Verder naar controleren' }).click();
    await page.getByLabel(/ga akkoord met de/).check();
    await page.getByLabel(/Ik heb de privacyverklaring/).check();
    await page.getByRole('button', { name: 'Aanmelding verzenden' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Aanmelding nog niet verzonden' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('niet verzonden');
    const mail = page.getByRole('link', { name: 'Aanmelding per e-mail sturen' });
    await expect(mail).toHaveAttribute('href', /^mailto:.*Testregio/);
    // Lange opmerkingen: de link blijft onder de grens van mailprogramma's en de pagina zegt dat er is ingekort.
    expect(((await mail.getAttribute('href')) ?? '').length).toBeLessThanOrEqual(1900);
    await expect(page.getByText(/Uw opmerkingen zijn te lang voor een e-mail/)).toBeVisible();
    const bewaard = await page.evaluate(() => JSON.parse(localStorage.getItem('afvalplatform-aanmelding') ?? '[]'));
    expect(bewaard).toHaveLength(1);
    expect(bewaard[0].organisatie).toBe('Afvalsamenwerking Testregio');
    await page.getByRole('button', { name: 'Opnieuw proberen' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Controleer uw aanmelding' })).toBeVisible();
  });

  test('verplichte velden gemarkeerd, voorbeeld bij domein, voorwaarden bij de knop', async ({ page }) => {
    const form = page.getByRole('form', { name: 'Gegevens voor de aanmelding' });
    const legenda = form.locator('.lm-legenda');
    await expect(legenda).toBeVisible();
    await expect(legenda).toContainText(/^Velden met \*/);
    await expect(legenda).toContainText('zijn verplicht');
    // Zichtbaar sterretje bij een verplicht veld, "(optioneel)" bij een optioneel veld; schermlezers horen "(verplicht)".
    await expect(form.locator('label[for="am-organisatie"]')).toHaveText(/Naam organisatie\s*\*/);
    await expect(form.locator('label[for="am-inkoopordernummer"]')).toContainText('(optioneel)');
    await expect(page.getByRole('textbox', { name: 'Naam organisatie (verplicht)' })).toBeVisible();
    // Voorbeeld bij het e-maildomein, in het veld en in de hint.
    const domein = page.getByLabel('E-maildomeinen die toegang krijgen');
    await expect(domein).toHaveAttribute('placeholder', /gemeente-voorbeeld\.nl/);
    await expect(form).toContainText('Voorbeeld: gemeente-voorbeeld.nl');
    // Voorwaarden in het kort, met links, direct boven de knop.
    const kort = form.getByRole('region', { name: 'Voorwaarden in het kort' });
    await expect(kort).toContainText('Jaarabonnement van 12 maanden');
    await expect(kort).toContainText('uiterlijk 1 maand voor de einddatum');
    await expect(kort.getByRole('link', { name: /Algemene voorwaarden/ })).toHaveAttribute('href', '/algemene-voorwaarden');
    await expect(kort.getByRole('link', { name: /Privacyverklaring/ })).toHaveAttribute('href', '/privacy');
    const knop = await page.getByRole('button', { name: 'Verder naar controleren' }).boundingBox();
    const blok = await kort.boundingBox();
    expect(knop!.y - (blok!.y + blok!.height)).toBeLessThan(60);
    await geenHorizontaleScroll(page);
  });

  test('concept wordt zichtbaar automatisch bewaard, teruggezet en kan worden leeggemaakt', async ({ page }) => {
    await expect(page.getByText(/Concept automatisch bewaard/)).toHaveCount(0);
    await page.getByLabel('Naam organisatie').fill('Gemeente Proefdorp');
    await expect(page.getByText(/Concept automatisch bewaard in dit tabblad/)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Naam organisatie')).toHaveValue('Gemeente Proefdorp');
    await expect(page.getByText('We hebben de gegevens teruggezet die u eerder in dit tabblad invulde.')).toBeVisible();
    await page.getByRole('button', { name: 'Formulier leegmaken' }).first().click();
    await expect(page.getByLabel('Naam organisatie')).toHaveValue('');
    await page.reload();
    await expect(page.getByLabel('Naam organisatie')).toHaveValue('');
  });
});

// Schermafbeeldingen van de jury draaien in een Engelstalige browser. De startdatum moet dan toch als
// "1 november 2026" leesbaar zijn, niet als 11/01/2026.
test.describe('Aanmelden in een Engelstalige browser', () => {
  test.use({ locale: 'en-US' });

  test('startdatum staat uitgeschreven in het Nederlands, ook bij een andere datum', async ({ page }) => {
    await page.goto('/lidmaatschap/aanmelden');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    const nl = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    const nu = new Date();
    const eerste = new Date(nu.getFullYear(), nu.getMonth() + 1, 1, 12);
    const keuze = page.getByLabel('Gewenste startdatum');
    await expect(keuze.locator('option:checked')).toHaveText(nl.format(eerste));
    await expect(page.getByText(new RegExp(`Eerste contractjaar: ${nl.format(eerste)} tot en met`))).toBeVisible();

    await keuze.selectOption('anders');
    const anders = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate() + 10, 12);
    const iso = `${anders.getFullYear()}-${String(anders.getMonth() + 1).padStart(2, '0')}-${String(anders.getDate()).padStart(2, '0')}`;
    await page.getByLabel('Andere startdatum').fill(iso);
    await expect(page.getByText(`U kiest: ${nl.format(anders)}`)).toBeVisible();
    await geenHorizontaleScroll(page);
  });
});
