import { Link } from 'react-router-dom';
import { btwPercentage, prijzenVastgesteld, staffels, voorwaarden } from '../../data/lidmaatschap';
import { platform } from '../../data/site';
import { euro } from '../../lib/format';
import { prijsVoorStaffel } from '../../lib/prijs';
import { aanbieder } from './gegevens';
import { BronRegel, ContactBlok, JuridischDocument, Leden, Toetspunt, type Sectie } from './JuridischDocument';

// Algemene voorwaarden voor het gebruik van het platform en het lidmaatschap (jaarabonnement per organisatie).
// Termijnen en prijzen komen uit src/data/lidmaatschap.ts, zodat deze tekst gelijk blijft aan de aanmeldflow.

const v = voorwaarden;
const maanden = (n: number) => (n === 1 ? '1 maand' : `${n} maanden`);

const secties: Sectie[] = [
  {
    id: 'begrippen',
    titel: '1. Begrippen',
    inhoud: (
      <>
        <p>In deze voorwaarden betekenen de volgende woorden:</p>
        <dl className="jd-gegevens">
          <dt>KplusV</dt>
          <dd>
            {aanbieder.naam}, gevestigd in {aanbieder.plaats}, KVK-nummer {aanbieder.kvk}. KplusV biedt het platform aan.
          </dd>
          <dt>Platform</dt>
          <dd>De website {platform.korteNaam}, met de Restafvalkaart, kennisbank, nieuws, rekentools en het aanbestedingsarchief.</dd>
          <dt>Organisatie</dt>
          <dd>Het samenwerkingsverband, de gemeente, de afvalverwerker of een andere organisatie die een lidmaatschap afneemt.</dd>
          <dt>Gebruiker</dt>
          <dd>Iedereen die het platform bezoekt of gebruikt, met of zonder account.</dd>
          <dt>Lidmaatschap</dt>
          <dd>Het jaarabonnement van een organisatie op de onderdelen die alleen voor leden zijn.</dd>
          <dt>Orderbevestiging</dt>
          <dd>De e-mail van KplusV waarmee een aanmelding wordt aanvaard, met staffel, prijs, startdatum en einddatum.</dd>
          <dt>Contractjaar</dt>
          <dd>Een periode van twaalf maanden vanaf de startdatum van het lidmaatschap, of vanaf een verlenging.</dd>
          <dt>Uitkomst</dt>
          <dd>Een berekening, grafiek of rapport dat een rekentool maakt op basis van invoer en standaardwaarden.</dd>
        </dl>
      </>
    ),
  },
  {
    id: 'toepassing',
    titel: '2. Wanneer gelden deze voorwaarden',
    inhoud: (
      <>
        <Leden artikel={2}>
          {[
            'Deze voorwaarden gelden voor elk gebruik van het platform en voor elk lidmaatschap. Voor de gratis onderdelen gelden alleen de artikelen 1, 2, 8 tot en met 12, 15 en 16.',
            <>
              Waar deze voorwaarden niets regelen, gelden aanvullend de algemene voorwaarden van {aanbieder.handelsnaam},
              gedeponeerd bij de griffie van de rechtbank Gelderland onder nummer A/05/26/4. Spreken die twee elkaar tegen, dan gaan deze voorwaarden voor. Afspraken in de orderbevestiging gaan voor allebei.
            </>,
            'Verwijst uw organisatie naar eigen inkoopvoorwaarden, dan gelden die alleen voor zover KplusV ze schriftelijk heeft aanvaard.',
            'Is een bepaling in deze voorwaarden ongeldig, dan blijven de andere bepalingen gelden. KplusV vervangt de ongeldige bepaling dan door een bepaling die het doel zoveel mogelijk benadert.',
          ]}
        </Leden>
        <BronRegel sleutel="avKplusV" voorvoegsel="Algemene voorwaarden KplusV" />
        <Toetspunt>
          Veel gemeenten en samenwerkingsverbanden kopen in onder eigen inkoopvoorwaarden (vaak een model van de VNG, of de
          GIBIT bij ICT-diensten). Beoordeel of artikel 2.3 houdbaar is en of een rangorde met die
          voorwaarden nodig is.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'aanmelding',
    titel: '3. Aanmelden en totstandkoming',
    inhoud: (
      <Leden artikel={3}>
        {[
          <>
            Een organisatie meldt zich aan via het <Link to="/lidmaatschap/aanmelden">aanmeldformulier</Link> of vraagt per
            e-mail een offerte aan. Een offerte is {v.offerteGeldigDagen} dagen geldig, tenzij er een andere termijn in staat.
          </>,
          'Wie zich aanmeldt, verklaart dat hij bevoegd is om de organisatie te vertegenwoordigen of daarvoor toestemming heeft van iemand die dat wel is.',
          `KplusV controleert de aanmelding en stuurt binnen ${v.bevestigingWerkdagen} werkdagen een orderbevestiging per e-mail. Het lidmaatschap komt tot stand op het moment dat KplusV de orderbevestiging verstuurt.`,
          'KplusV mag een aanmelding weigeren, bijvoorbeeld als de organisatie niet tot de doelgroep hoort of als de opgegeven e-maildomeinen niet van de organisatie zijn. KplusV laat dat dan per e-mail weten, met de reden.',
          `De startdatum staat in de orderbevestiging. Een startdatum ligt hooguit ${maanden(v.maxStartVooruitMaanden)} na de aanmelding.`,
        ]}
      </Leden>
    ),
  },
  {
    id: 'proeftoegang',
    titel: '4. Proeftoegang',
    inhoud: (
      <Leden artikel={4}>
        {[
          `Een organisatie kan per e-mail proeftoegang aanvragen. De proeftoegang duurt ${v.proefDagen} dagen en is kosteloos.`,
          'De proeftoegang eindigt vanzelf. De organisatie hoeft niet op te zeggen en krijgt geen factuur.',
          'Tijdens de proeftoegang gelden deze voorwaarden, behalve de artikelen over prijs, betaling en opzegging.',
        ]}
      </Leden>
    ),
  },
  {
    id: 'looptijd',
    titel: '5. Looptijd, verlenging en opzegging',
    inhoud: (
      <>
        <Leden artikel={5}>
          {[
            `Een lidmaatschap loopt ${maanden(v.looptijdMaanden)} vanaf de startdatum.`,
            `Daarna wordt het lidmaatschap steeds stilzwijgend verlengd met ${maanden(v.verlengingMaanden)}, tenzij de organisatie of KplusV opzegt.`,
            `Opzeggen kan per e-mail aan KplusV, tot uiterlijk ${maanden(v.opzegtermijnMaanden)} voor de einddatum. KplusV bevestigt de opzegging per e-mail. Het lidmaatschap loopt dan tot de einddatum door.`,
            `KplusV kan opzeggen met dezelfde termijn van ${maanden(v.opzegtermijnMaanden)}, bijvoorbeeld als KplusV het platform stopt. Stopt het platform tijdens een contractjaar, dan betaalt KplusV het deel van de jaarprijs terug dat hoort bij de resterende maanden.`,
            'Tussentijds opzeggen kan niet, behalve in de gevallen in de artikelen 10.3, 14.2 en 15.2.',
          ]}
        </Leden>
        <Toetspunt>
          Een opzegtermijn van {maanden(v.opzegtermijnMaanden)} is kort ten opzichte van wat gebruikelijk is. Dat is bewust
          gekozen omdat het om een abonnement gaat; bevestig dat deze termijn ook voor KplusV werkbaar is.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'prijs-en-betaling',
    titel: '6. Prijs en betaling',
    inhoud: (
      <>
        <Leden artikel={6}>
          {[
            `De prijs is een vast bedrag per organisatie per contractjaar, afhankelijk van de staffel. Alle prijzen zijn exclusief ${btwPercentage} % btw.`,
            'KplusV factureert op de startdatum en daarna aan het begin van elk contractjaar. De factuur gaat als pdf naar het e-mailadres van de crediteurenadministratie, of als e-factuur als dat is afgesproken. Een inkoopordernummer van de organisatie komt op de factuur.',
            `De organisatie betaalt binnen ${v.betaaltermijnDagen} dagen na ontvangst van de factuur.`,
            'Betaalt de organisatie niet op tijd, dan stuurt KplusV eerst een herinnering met een nieuwe termijn van 14 dagen. Daarna is de wettelijke handelsrente verschuldigd.',
            'Is ook de termijn uit de herinnering verstreken, dan mag KplusV de toegang tot de ledenonderdelen opschorten tot er betaald is. KplusV meldt dat vooraf per e-mail.',
            `Een prijswijziging voor een volgend contractjaar meldt KplusV uiterlijk ${maanden(v.prijswijzigingAankondigingMaanden)} voor de verlenging. Gaat de organisatie niet akkoord, dan kan zij opzeggen tegen de einddatum, ook als de opzegtermijn uit artikel 5.3 dan al voorbij is.`,
            'Binnen een contractjaar verandert de prijs niet, behalve als het btw-tarief wettelijk verandert.',
          ]}
        </Leden>
        <h3>Prijzen per staffel{prijzenVastgesteld ? '' : ' (concept, nog niet vastgesteld)'}</h3>
        <div className="tabel-container" role="region" aria-label="Jaarprijs per staffel" tabIndex={0}>
          <table>
            <caption className="visueel-verborgen">Jaarprijs per staffel</caption>
            <thead>
              <tr>
                <th scope="col">Staffel</th>
                <th scope="col" className="num">
                  Per jaar excl. btw
                </th>
                <th scope="col" className="num">
                  Incl. {btwPercentage} % btw
                </th>
              </tr>
            </thead>
            <tbody>
              {staffels.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.naam}</th>
                  <td className="num">{euro(s.prijsExclBtw)}</td>
                  <td className="num">{euro(prijsVoorStaffel(s.id).inclBtw, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="jd-bron">
          Dezelfde bedragen staan op <Link to="/lidmaatschap">Lidmaatschap</Link>. De orderbevestiging vermeldt de prijs die
          voor uw organisatie geldt.
        </p>
        <Toetspunt>
          Artikel 6.4: voor een overheidsinstantie als schuldenaar geldt een eigen regeling voor de wettelijke handelsrente
          (artikel 6:119b BW). Beoordeel of de verwijzing zo volstaat en of incassokosten moeten worden opgenomen.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'toegang',
    titel: '7. Toegang en accounts',
    inhoud: (
      <Leden artikel={7}>
        {[
          'Toegang tot de ledenonderdelen loopt via het e-maildomein van de organisatie, bijvoorbeeld @gemeente-voorbeeld.nl. Iedere medewerker met een bevestigd e-mailadres op een opgegeven domein kan een account aanmaken. Het aantal gebruikers is niet beperkt.',
          'Openbare maildomeinen, zoals gmail.com of outlook.com, geven nooit toegang.',
          'De organisatie geeft alleen domeinen op die van haarzelf zijn en meldt een wijziging, bijvoorbeeld na een fusie of een nieuw domein, per e-mail aan KplusV.',
          'Een account is persoonlijk. Een gebruiker deelt zijn wachtwoord of inloglink niet met anderen.',
          'Gebruiken mensen die niet voor de organisatie werken een adres op haar domein, dan zorgt de organisatie dat zij het platform alleen voor de organisatie gebruiken.',
          'Vermoedt de organisatie misbruik van een account, dan meldt zij dat direct aan KplusV. Bij misbruik mag KplusV een account blokkeren. KplusV laat dat de organisatie weten.',
        ]}
      </Leden>
    ),
  },
  {
    id: 'gebruik-inhoud',
    titel: '8. Gebruik van de inhoud',
    inhoud: (
      <>
        <Leden artikel={8}>
          {[
            'De rechten op het platform, de teksten, de rekentools en de opbouw van de gegevens liggen bij KplusV of bij de partijen van wie KplusV ze mag gebruiken.',
            'Een organisatie met een lidmaatschap mag de inhoud en de uitkomsten gebruiken voor haar eigen werk, ook in eigen stukken zoals een raadsvoorstel, een nota of aanbestedingsstukken. Zij vermeldt daarbij het platform als bron.',
            'Het is niet toegestaan om ledeninhoud door te verkopen, openbaar te maken buiten de organisatie, systematisch te downloaden of met software automatisch uit te lezen.',
            'Gegevens uit open bronnen, zoals CBS en TenderNed, blijven onder de licentie van die bron vallen. Het platform vermeldt bij die gegevens de bron.',
            'Gratis onderdelen mag iedereen gebruiken voor eigen werk, met bronvermelding.',
          ]}
        </Leden>
        <p>
          Welke open bronnen het platform gebruikt en onder welke licentie: zie <Link to="/disclaimer#open-data">Disclaimer, open data</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'rekentools',
    titel: '9. Rekentools en uitkomsten',
    inhoud: (
      <Leden artikel={9}>
        {[
          'De rekentools geven indicatieve uitkomsten. Een uitkomst hangt af van de invoer, de standaardwaarden en de formule. De formule staat bij elke tool.',
          'Een uitkomst is geen advies. De organisatie beoordeelt zelf of een uitkomst past bij haar situatie en controleert belangrijke uitkomsten voordat zij er een besluit op baseert.',
          'KplusV actualiseert de standaardwaarden en reeksen in de rekentools ten minste eenmaal per jaar en vermeldt bij elke waarde de bron en de peildatum. Waarden zonder officiële bron staan als aanname aangegeven.',
          'Voor advies op maat kan de organisatie een aparte opdracht aan KplusV geven. Daarvoor gelden de algemene voorwaarden van KplusV.',
        ]}
      </Leden>
    ),
  },
  {
    id: 'beschikbaarheid',
    titel: '10. Beschikbaarheid en wijzigingen van het platform',
    inhoud: (
      <Leden artikel={10}>
        {[
          'KplusV spant zich in om het platform goed bereikbaar te houden, maar garandeert geen ononderbroken beschikbaarheid. Gepland onderhoud kondigt KplusV zo mogelijk vooraf aan op het platform.',
          'Het platform gebruikt diensten van anderen, zoals hosting, een database en kaarttegels van OpenStreetMap. Een storing bij die diensten kan het platform tijdelijk beperken.',
          'KplusV mag het platform verbeteren en onderdelen veranderen. Vervalt een ledenonderdeel waardoor het lidmaatschap wezenlijk minder waard wordt, dan kan de organisatie tussentijds opzeggen. KplusV betaalt dan het deel van de jaarprijs terug dat hoort bij de resterende maanden.',
        ]}
      </Leden>
    ),
  },
  {
    id: 'aansprakelijkheid',
    titel: '11. Aansprakelijkheid',
    inhoud: (
      <>
        <Leden artikel={11}>
          {[
            'KplusV is alleen aansprakelijk voor directe schade die het gevolg is van een tekortkoming die aan KplusV is toe te rekenen.',
            'De aansprakelijkheid is per contractjaar beperkt tot het bedrag dat de organisatie voor dat contractjaar heeft betaald.',
            'KplusV is niet aansprakelijk voor indirecte schade, zoals gevolgschade, gederfde winst of schade door een besluit dat mede op een uitkomst van een rekentool is gebaseerd.',
            'KplusV is niet aansprakelijk voor fouten in gegevens van derden, zoals open data van CBS of TenderNed, of voor storingen van diensten van derden.',
            'Voor de gratis onderdelen is KplusV niet aansprakelijk.',
            'De beperkingen in dit artikel gelden niet bij opzet of bewuste roekeloosheid van KplusV of van haar leidinggevenden.',
            'Een vordering tot schadevergoeding vervalt één jaar nadat de organisatie de schade heeft ontdekt of had kunnen ontdekken.',
          ]}
        </Leden>
        <Toetspunt>
          De algemene voorwaarden van KplusV beperken de aansprakelijkheid tot de uitkering van de verzekering, of anders tot
          het honorarium. Hier is gekozen voor het betaalde jaarbedrag, omdat een abonnement geen honorarium kent. Controleer of
          dit aansluit op de beroepsaansprakelijkheidsverzekering van KplusV.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'persoonsgegevens',
    titel: '12. Persoonsgegevens',
    inhoud: (
      <>
        <Leden artikel={12}>
          {[
            <>
              KplusV verwerkt persoonsgegevens van gebruikers en contactpersonen als verwerkingsverantwoordelijke, zoals
              beschreven in de <Link to="/privacy">privacyverklaring</Link>.
            </>,
            'Wat een gebruiker invult in de rekentools, blijft in zijn browser. Die invoer gaat niet naar KplusV.',
            'Het platform is niet bedoeld om persoonsgegevens van burgers in te voeren. De organisatie zorgt dat haar medewerkers dat niet doen.',
          ]}
        </Leden>
        <Toetspunt>
          KplusV verwerkt geen persoonsgegevens in opdracht van de organisatie. Een verwerkersovereenkomst lijkt daarom niet
          nodig. Bevestig dat, ook voor het geval een organisatie er bij de inkoop om vraagt.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'onafhankelijkheid',
    titel: '13. Onafhankelijkheid en vertrouwelijkheid',
    inhoud: (
      <>
        <Leden artikel={13}>
          {[
            'Zowel opdrachtgevers als afvalverwerkers kunnen lid zijn. Een lidmaatschap geeft geen voorrang, geen invloed op de inhoud van het platform en geen inzage in gegevens van andere leden.',
            'KplusV gebruikt gegevens uit een aanmelding alleen voor het lidmaatschap en de facturering, en maakt niet openbaar welke organisaties lid zijn zonder hun toestemming.',
          ]}
        </Leden>
        <Toetspunt>
          KplusV adviseert ook gemeenten en samenwerkingsverbanden bij aanbestedingen waarin verwerkers inschrijven. Beoordeel
          of artikel 13 genoeg zegt over hoe KplusV omgaat met mogelijke belangenverstrengeling.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'beeindiging',
    titel: '14. Einde van het lidmaatschap',
    inhoud: (
      <Leden artikel={14}>
        {[
          'Na de einddatum vervalt de toegang tot de ledenonderdelen. De accounts van gebruikers blijven bestaan, zodat de toegang na een verlenging direct terug is. Een gebruiker kan zijn account laten verwijderen, zie de privacyverklaring.',
          'De organisatie en KplusV kunnen het lidmaatschap met onmiddellijke ingang beëindigen als de ander ernstig tekortschiet en dat na een schriftelijke ingebrekestelling met een redelijke termijn niet herstelt.',
          'Rapporten en uitkomsten die de organisatie tijdens het lidmaatschap heeft gemaakt, mag zij na het einde blijven gebruiken volgens artikel 8.2.',
        ]}
      </Leden>
    ),
  },
  {
    id: 'wijziging-voorwaarden',
    titel: '15. Wijziging van deze voorwaarden',
    inhoud: (
      <Leden artikel={15}>
        {[
          'KplusV kan deze voorwaarden wijzigen. Een wijziging meldt KplusV ten minste 30 dagen vooraf per e-mail aan de contactpersoon van de organisatie en op deze pagina, met een nieuw versienummer.',
          'Is een wijziging nadelig voor de organisatie, dan kan zij het lidmaatschap opzeggen tegen de datum waarop de wijziging ingaat.',
        ]}
      </Leden>
    ),
  },
  {
    id: 'recht-en-geschillen',
    titel: '16. Toepasselijk recht en geschillen',
    inhoud: (
      <Leden artikel={16}>
        {[
          'Op het gebruik van het platform en op elk lidmaatschap is Nederlands recht van toepassing.',
          'Bij een klacht of geschil zoeken de organisatie en KplusV eerst samen een oplossing.',
          `Lukt dat niet, dan legt een partij het geschil voor aan de ${aanbieder.rechtbank}.`,
        ]}
      </Leden>
    ),
  },
  {
    id: 'contact',
    titel: 'Contact',
    inhoud: (
      <>
        <p>Vragen over deze voorwaarden of over uw lidmaatschap:</p>
        <ContactBlok onderwerp="Vraag over de algemene voorwaarden" />
      </>
    ),
  },
];

export function AlgemeneVoorwaarden() {
  return (
    <JuridischDocument
      id="algemene-voorwaarden"
      intro={
        <>
          Deze voorwaarden gelden voor het gebruik van het {platform.korteNaam} en voor het lidmaatschap: een jaarabonnement
          per organisatie, op factuur. De belangrijkste afspraken in het kort staan op{' '}
          <Link to="/lidmaatschap">Lidmaatschap</Link>.
        </>
      }
      secties={secties}
    />
  );
}
