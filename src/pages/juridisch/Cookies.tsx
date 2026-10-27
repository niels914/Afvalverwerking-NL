import { Link } from 'react-router-dom';
import { datum } from '../../lib/format';
import { externeVerbindingen, opslag, opslagGemetenOp } from './gegevens';
import { BronRegel, ContactBlok, JuridischDocument, Toetspunt, type Sectie } from './JuridischDocument';

// Cookieverklaring. De lijst met opslag komt uit gegevens.ts. opslag.test.ts controleert dat elke sleutel in de code
// in die lijst staat; e2e/juridisch.spec.ts controleert met een echte browser dat er geen cookies worden gezet.

const soortLabel = {
  localStorage: 'Lokale opslag (localStorage)',
  sessionStorage: 'Sessieopslag (sessionStorage)',
  cookie: 'Cookie',
} as const;

const secties: Sectie[] = [
  {
    id: 'wat-zijn-cookies',
    titel: 'Wat zijn cookies en browseropslag',
    inhoud: (
      <>
        <p>
          Een cookie is een klein tekstbestand dat een website via uw browser op uw apparaat zet. Browseropslag (localStorage en
          sessionStorage) werkt vergelijkbaar: de website bewaart gegevens in uw browser en leest ze later terug.
        </p>
        <p>
          Voor de wet maakt dat geen verschil. Voor cookies en voor browseropslag gelden dezelfde regels. Daarom beschrijft
          deze verklaring beide.
        </p>
      </>
    ),
  },
  {
    id: 'overzicht',
    titel: 'Wat de site in uw browser bewaart',
    inhoud: (
      <>
        <p>
          Dit is de volledige lijst, vastgesteld op {datum(opslagGemetenOp)}. Daarvoor is de code nagelopen op elke plek waar de
          site iets in de browser opslaat, en heeft een browser alle pagina’s geopend, inclusief de kaart en de formulieren.
        </p>
        <p>
          Ook inloggen met een echt account is gemeten (oktober 2026). Na het inloggen stond alleen de sessiesleutel van
          Supabase in de lokale opslag. Er stond niets in de sessieopslag en er waren geen cookies.
        </p>
        <div className="jd-blokken">
          {opslag.map((o) => (
            <section key={o.sleutel} className="jd-blok" aria-labelledby={`opslag-${o.sleutel}`}>
              <h3 id={`opslag-${o.sleutel}`}>
                <code>{o.sleutel}</code>
              </h3>
              <dl className="jd-gegevens">
                <dt>Soort</dt>
                <dd>{soortLabel[o.soort]}</dd>
                <dt>Van</dt>
                <dd>{o.partij}</dd>
                <dt>Waarvoor</dt>
                <dd>{o.doel}</dd>
                <dt>Inhoud</dt>
                <dd>{o.inhoud}</dd>
                <dt>Wanneer</dt>
                <dd>{o.wanneer}</dd>
                <dt>Hoe lang</dt>
                <dd>{o.bewaarduur}</dd>
              </dl>
            </section>
          ))}
        </div>
        <h3>Uw invoer in het webadres</h3>
        <p>
          Wat u in de rekentools invult, slaat de site niet op in de browseropslag. De rekentools zetten uw invoer wel
          automatisch in het webadres (na het vraagteken). Op de Restafvalkaart en in het aanbestedingsarchief staan zo de
          gekozen gemeente en de zoekfilters in het adres. Dat is geen cookie, maar het heeft wel gevolgen:
        </p>
        <ul>
          <li>het adres met uw invoer komt in de geschiedenis van uw browser;</li>
          <li>een bladwijzer of een link die u deelt, bevat dezelfde invoer;</li>
          <li>
            laadt u of een ander dat adres (vernieuwen, bladwijzer, gedeelde link), dan legt de server van Netlify het adres
            vast in het serverlogboek; zie de <Link to="/privacy#verwerking-bezoek">privacyverklaring</Link>.
          </li>
        </ul>
        <p>
          Zo kunt u een berekening bewaren of delen zonder account. Vul geen persoonsgegevens in. Wilt u de invoer kwijt, wis
          dan de browsergeschiedenis van deze site.
        </p>
      </>
    ),
  },
  {
    id: 'derden',
    titel: 'Andere partijen',
    inhoud: (
      <>
        <p>
          Uw browser maakt alleen verbinding met de server van het platform zelf (bij Netlify) en, als u inlogt, met de
          database bij Supabase:
        </p>
        <ul>
          {externeVerbindingen.map((v) => (
            <li key={v.host}>
              <strong>{v.partij}</strong> (<code>{v.host}</code>): {v.wanneer.charAt(0).toLowerCase() + v.wanneer.slice(1)}
            </li>
          ))}
        </ul>
        <p>
          Supabase bewaart de inlogsessie in de browseropslag die hierboven staat, niet in een cookie. De kaart haalt geen
          kaarttegels op bij een andere partij; de gemeentegrenzen staan als bestand op de eigen server. Meer over Netlify en
          Supabase staat in de <Link to="/privacy#ontvangers">privacyverklaring</Link>.
        </p>
        <p>
          <strong>Netlify.</strong> Netlify host de site en ontvangt de formulieren. Het platform gebruikt geen diensten
          van Netlify die cookies zetten, zoals Netlify Identity of split testing.
        </p>
        <p>
          <strong>Hoe gemeten.</strong> De meting zonder inloggen is gedaan op een kopie van de site op een testserver. Na de
          eerste publicatie op Netlify herhalen wij de meting op de echte site en passen wij deze verklaring aan als dat nodig
          is.
        </p>
        <p>
          <strong>Geen verbinding met Google.</strong> Het lettertype Poppins staat op de eigen server van het platform. Er zijn
          geen ingesloten video’s, geen knoppen van sociale media en geen analysediensten.
        </p>
      </>
    ),
  },
  {
    id: 'geen-toestemming',
    titel: 'Waarom u geen cookiemelding ziet',
    inhoud: (
      <>
        <p>
          Volgens de Telecommunicatiewet mag een website alleen gegevens in uw browser opslaan of uitlezen als u daarvoor
          toestemming geeft. Dat geldt niet als de opslag strikt noodzakelijk is voor de dienst waar u zelf om vraagt.
        </p>
        <p>Alle opslag hierboven valt onder die uitzondering:</p>
        <ul>
          <li>de inlogsessie is nodig om u na het inloggen toegang te geven;</li>
          <li>de sessieopslag van het aanmeldformulier bewaart wat u invult, zodat het niet verloren gaat als u tussendoor een andere pagina opent;</li>
          <li>
            de reservekopieën van aanmelding en feedback ontstaan alleen als het versturen van een formulier dat u zelf verstuurt
            mislukt.
          </li>
        </ul>
        <p>Daarom is er geen toestemmingsbanner. Komt er ooit opslag bij die niet noodzakelijk is, dan vragen wij eerst toestemming.</p>
        <BronRegel sleutel="telecomwet" />
        <BronRegel sleutel="acmCookies" voorvoegsel="Uitleg van de toezichthouder" />
        <Toetspunt>
          De reservekopieën in localStorage blijven staan tot de gebruiker de browsergegevens wist en bevatten
          contactgegevens. Beoordeel of dat nog binnen &lsquo;strikt noodzakelijk&rsquo; valt, of dat de kopie na het versturen per
          e-mail automatisch moet verdwijnen.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'verwijderen',
    titel: 'Zelf verwijderen',
    inhoud: (
      <>
        <p>U kunt de opslag van deze site op elk moment zelf verwijderen:</p>
        <ul>
          <li>Uitloggen via Mijn account verwijdert de inlogsessie.</li>
          <li>Het tabblad sluiten verwijdert de sessieopslag van het aanmeldformulier.</li>
          <li>Invoer in het webadres wist u door de browsergeschiedenis van deze site te wissen.</li>
          <li>
            Alles verwijderen kan in de instellingen van uw browser, bij de gegevens van websites. Zoek naar het adres van dit
            platform en kies Verwijderen. Daarna moet u opnieuw inloggen.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'bijhouden',
    titel: 'Hoe wij deze lijst bijhouden',
    inhoud: (
      <p>
        Een automatische test controleert of elke sleutel die de code in de browser opslaat, op deze pagina staat. Een tweede
        test opent de site in een echte browser en controleert dat er geen cookies worden gezet, dat alleen de beschreven
        sleutels in de browseropslag staan en dat de browser geen verbinding maakt met andere servers dan hierboven genoemd. Wij draaien beide tests voor
        elke nieuwe versie van de site.
        Verandert er iets, dan passen wij deze verklaring aan en verhogen wij het versienummer.
      </p>
    ),
  },
  {
    id: 'contact',
    titel: 'Contact',
    inhoud: <ContactBlok onderwerp="Vraag over cookies" />,
  },
];

const kern = [
  'Dit platform plaatst geen cookies. Er zijn geen cookies of scripts voor statistieken, advertenties of social media.',
  'De site bewaart wel een paar gegevens in de opslag van uw browser: om u ingelogd te houden en om formulieren niet kwijt te raken.',
  'Omdat die opslag noodzakelijk is, vraagt de site niet om toestemming en ziet u geen cookiemelding.',
  'De rekentools zetten uw invoer in het webadres. Die invoer staat daardoor in uw browsergeschiedenis en in links die u deelt.',
];

export function Cookies() {
  return (
    <JuridischDocument
      id="cookies"
      kern={kern}
      intro="Welke gegevens dit platform in uw browser bewaart, waarom, hoe lang, en waarom u geen cookiemelding ziet."
      secties={secties}
    />
  );
}
