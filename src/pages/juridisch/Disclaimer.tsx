import { Link } from 'react-router-dom';
import { platform } from '../../data/site';
import { aanbieder, bronnen } from './gegevens';
import { BronRegel, ContactBlok, JuridischDocument, type Sectie } from './JuridischDocument';

// Disclaimer en colofon. Anker #voorbeelddata hoort bij de bètamelding in Banner.tsx, #colofon bij de voettekst.

const secties: Sectie[] = [
  {
    id: 'verantwoordelijkheid',
    titel: 'Verantwoordelijkheid voor de inhoud',
    inhoud: (
      <>
        <p>
          {aanbieder.naam} is verantwoordelijk voor de inhoud van het {platform.korteNaam}. Wij doen ons best om alles juist,
          actueel en volledig te houden en vermelden bij cijfers de bron en de peildatum.
        </p>
        <p>
          Toch kan informatie onjuist, onvolledig of verouderd zijn. Aan de inhoud kunt u geen rechten ontlenen. Gebruikt u
          informatie voor een besluit, controleer die dan bij de oorspronkelijke bron.
        </p>
      </>
    ),
  },
  {
    id: 'voorbeelddata',
    titel: 'Bèta: voorbeelddata op het platform',
    inhoud: (
      <>
        <p>
          Het platform is in opbouw. Een deel van de inhoud is echt en heeft een bron, een ander deel is nog voorbeeld. Wat
          voorbeeld is, heeft het label <strong>Voorbeeld</strong> of staat zo omschreven in de tekst.
        </p>
        <h3>Nu nog voorbeeld</h3>
        <ul>
          <li>Het aanbestedingsarchief: alle aanbestedingen daarin zijn verzonnen.</li>
          <li>
            Invoervelden in de rekentools met het label &lsquo;Voorbeeld, vul eigen waarde in&rsquo;. Die waarden hebben geen
            officiële bron; vul uw eigen gegevens in.
          </li>
          <li>
            Criteria in de aanbestedingstool met het label &lsquo;Voorbeeld KplusV&rsquo;. Dat zijn voorbeelden uit de praktijk,
            geen officiële MVI-criteria.
          </li>
        </ul>
        <h3>Echt, met bron</h3>
        <ul>
          <li>Cijfers op de Restafvalkaart, met bron en peildatum op de kaartpagina.</li>
          <li>Standaardwaarden in de rekentools die een bron en een peildatum hebben.</li>
          <li>Nieuwsberichten en publicaties in de kennisbank, met een link naar de uitgever.</li>
        </ul>
        <p>
          Gebruik voorbeelddata nooit als bron voor een besluit, een nota of een aanbesteding. Staat er bij een cijfer geen bron,
          dan is het geen officieel cijfer. Zodra er geen voorbeelddata meer is, verdwijnt de bètamelding bovenaan de pagina’s.
        </p>
      </>
    ),
  },
  {
    id: 'rekentools',
    titel: 'Rekentools',
    inhoud: (
      <>
        <p>
          De rekentools geven een indicatie. De uitkomst hangt af van wat u invult, van de standaardwaarden en van de formule.
          Bij elke tool staan de formule en de herkomst van de standaardwaarden. Waarden zonder officiële bron zijn aangegeven
          als aanname; die vult u het best met uw eigen gegevens.
        </p>
        <p>
          Een uitkomst is geen advies. KplusV is niet aansprakelijk voor schade door een besluit dat mede op een uitkomst is
          gebaseerd. Voor leden staat de precieze regeling in artikel 9 en 11 van de{' '}
          <Link to="/algemene-voorwaarden#rekentools">algemene voorwaarden</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'open-data',
    titel: 'Open data en bronvermelding',
    inhoud: (
      <>
        <p>
          Het platform gebruikt open data van overheden. Bij elk gegeven staan de bron en de peildatum, bij de rekentools in het
          onderdeel &lsquo;Bronnen en peildatum&rsquo;. De belangrijkste bronnen:
        </p>
        <ul>
          <li>
            <strong>CBS</strong>: afvalcijfers per gemeente, inwonertallen en prijsindexen. De inhoud van het CBS valt onder
            Creative Commons Naamsvermelding 4.0 (CC BY 4.0): hergebruik mag, met het CBS als bron.
          </li>
          <li>
            <strong>CBS en Kadaster via PDOK</strong>: de gemeentegrenzen op de kaart, onder CC BY 4.0. Het platform heeft de
            grenzen vereenvoudigd om de kaart sneller te laden.
          </li>
          <li>
            <strong>Wet- en regelgeving en Rijksoverheid</strong>: tarieven en regels uit wetten, besluiten en officiële
            bekendmakingen. Op wetten en besluiten rust geen auteursrecht.
          </li>
          <li>
            <strong>TenderNed</strong>: gegevens over aanbestedingen. De officiële tekst van een aankondiging staat altijd op
            TenderNed. Het aanbestedingsarchief bevat nu nog voorbeelddata.
          </li>
          <li>
            <strong>Andere bronnen</strong>, zoals Rijkswaterstaat, de Nederlandse Emissieautoriteit, PIANOo (MVI-criteria) en
            branchepartijen: bij elk gegeven staat welke bron het is.
          </li>
        </ul>
        <p>
          Wij nemen gegevens over zoals de bron ze publiceert. Een fout in de bron kan daardoor ook op het platform staan. Ziet u
          zo’n fout, meld die dan bij de bron en bij ons.
        </p>
        <BronRegel sleutel="cbsLicentie" />
        <BronRegel sleutel="pdokLicentie" />
        <BronRegel sleutel="auteurswet" />
        <BronRegel sleutel="tenderned" />
      </>
    ),
  },
  {
    id: 'links',
    titel: 'Links en nieuwsberichten',
    inhoud: (
      <>
        <p>
          Het platform linkt naar websites van anderen, zoals overheden, kennisinstellingen en brancheorganisaties. Wij zijn
          niet verantwoordelijk voor de inhoud daarvan.
        </p>
        <p>
          Het nieuwsoverzicht toont de titel, de datum en de korte inleiding uit openbare nieuwsfeeds (RSS) van de uitgevers,
          met een link naar het oorspronkelijke bericht. De volledige tekst en de rechten liggen bij de uitgever. Wil een
          uitgever niet in het overzicht staan, dan halen wij de feed weg.
        </p>
      </>
    ),
  },
  {
    id: 'auteursrecht',
    titel: 'Auteursrecht',
    inhoud: (
      <p>
        Teksten, rekentools en opbouw van het platform zijn van KplusV, tenzij anders vermeld. U mag de gratis onderdelen
        gebruiken voor uw eigen werk, met bronvermelding: &lsquo;{platform.korteNaam}, KplusV&rsquo;, met de datum van
        raadplegen. Voor ledenonderdelen geldt artikel 8 van de{' '}
        <Link to="/algemene-voorwaarden#gebruik-inhoud">algemene voorwaarden</Link>.
      </p>
    ),
  },
  {
    id: 'fout-melden',
    titel: 'Fout gezien?',
    inhoud: (
      <>
        <p>
          Klopt er iets niet, of mist u informatie? Laat het ons weten. Noem de pagina en wat er volgens u anders moet. Wij
          reageren binnen vijf werkdagen.
        </p>
        <ContactBlok onderwerp="Fout of opmerking over het platform" />
      </>
    ),
  },
  {
    id: 'colofon',
    titel: 'Colofon',
    inhoud: (
      <>
        <dl className="jd-gegevens">
          <dt>Uitgever</dt>
          <dd>
            {aanbieder.naam}, {aanbieder.straat}, {aanbieder.postcode} {aanbieder.plaats}
          </dd>
          <dt>KVK-nummer</dt>
          <dd>{aanbieder.kvk}</dd>
          <dt>Telefoon</dt>
          <dd>{aanbieder.telefoonAlgemeen}</dd>
          <dt>Website</dt>
          <dd>
            <a href={aanbieder.website}>{aanbieder.website.replace('https://', '')}</a>
          </dd>
          <dt>Contact platform</dt>
          <dd>
            {aanbieder.contact.naam}, <a href={`mailto:${aanbieder.contact.email}`}>{aanbieder.contact.email}</a>
          </dd>
          <dt>Hosting</dt>
          <dd>Netlify</dd>
          <dt>Inloggen en database</dt>
          <dd>Supabase, database in Frankfurt (EU)</dd>
          <dt>Kaart</dt>
          <dd>
            Gemeentegrenzen: CBS en Kadaster via <a href={bronnen.pdokLicentie.url}>PDOK</a> (CC BY 4.0). Cijfers: CBS. Geen
            kaarttegels van andere partijen.
          </dd>
          <dt>Lettertype</dt>
          <dd>Poppins, SIL Open Font License 1.1, op de eigen server</dd>
          <dt>Ontwerp en bouw</dt>
          <dd>KplusV, in de huisstijl van KplusV</dd>
        </dl>
        <BronRegel sleutel="kvk" voorvoegsel="KVK-nummer" />
        <BronRegel sleutel="adres" voorvoegsel="Adres" />
        <BronRegel sleutel="poppins" voorvoegsel="Lettertype" />
      </>
    ),
  },
];

export function Disclaimer() {
  return (
    <JuridischDocument
      id="disclaimer"
      intro="Wat u wel en niet van de informatie op dit platform kunt verwachten, hoe wij met bronnen omgaan en wie het platform maakt."
      secties={secties}
    />
  );
}
