import { Link } from 'react-router-dom';
import { PaginaKop } from '../components/ui';
import {
  Bron,
  Bronnenlijst,
  ConceptBadge,
  Inbegrepen,
  PrijzenTabel,
  Staffelkaarten,
  Stappenplan,
  VeelgesteldeVragen,
  Vergelijkingstabel,
  VoorwaardenKort,
} from '../components/lidmaatschap/onderdelen';
import { grensGrootSamenwerkingsverband, prijzenVastgesteld } from '../data/lidmaatschap';
import { contact } from '../data/site';

const inhoud = [
  { id: 'prijzen', label: 'Prijzen' },
  { id: 'inbegrepen', label: 'Wat is inbegrepen' },
  { id: 'voorwaarden', label: 'Looptijd en opzeggen' },
  { id: 'vergelijking', label: 'Gratis of lid' },
  { id: 'aanmelden', label: 'Zo meldt u aan' },
  { id: 'vragen', label: 'Veelgestelde vragen' },
  { id: 'bronnen', label: 'Bronnen' },
];

export function Lidmaatschap() {
  return (
    <>
      <PaginaKop titel="Lidmaatschap en prijzen" badges={<ConceptBadge />}>
        Een groot deel van het platform is gratis. Met een lidmaatschap krijgt uw hele organisatie de volledige rekentools
        en de aanbestedingsinformatie. U betaalt één vast bedrag per jaar per organisatie, niet per gebruiker, en u betaalt op
        factuur.
      </PaginaKop>

      <nav className="lm-inhoud" aria-labelledby="lm-inhoud-kop">
        <h2 id="lm-inhoud-kop">Op deze pagina</h2>
        <ul>
          {inhoud.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`}>{i.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      {!prijzenVastgesteld && (
        <p className="notitie sectie" role="note">
          <strong>Concept.</strong> De prijzen en voorwaarden op deze pagina zijn nog niet vastgesteld door KplusV. U kunt
          zich wel al aanmelden; u ontvangt dan eerst een bevestiging met de definitieve prijs voordat er een factuur komt.
        </p>
      )}

      <section className="lm-sectie" id="prijzen" aria-labelledby="prijzen-kop">
        <h2 id="prijzen-kop">Prijzen per organisatie per jaar</h2>
        <p>
          De prijs hangt af van het soort organisatie. Een samenwerkingsverband met {grensGrootSamenwerkingsverband} of meer
          deelnemende gemeenten valt in de staffel groot. Alle collega’s van uw organisatie kunnen het platform gebruiken.
        </p>
        <Staffelkaarten />
        <PrijzenTabel />
        <Bron sleutel="btw" />
        <p className="klein muted">
          Valt uw organisatie buiten deze staffels, bijvoorbeeld een provincie of adviesbureau? Mail{' '}
          <a href={`mailto:${contact.email}?subject=Lidmaatschap%20op%20maat`}>{contact.email}</a> voor een voorstel.
        </p>
      </section>

      <section className="lm-sectie" id="inbegrepen" aria-labelledby="inbegrepen-kop">
        <h2 id="inbegrepen-kop">Wat is inbegrepen</h2>
        <p>Elk lidmaatschap geeft hetzelfde, ongeacht de staffel:</p>
        <Inbegrepen />
      </section>

      <section className="lm-sectie" id="voorwaarden" aria-labelledby="voorwaarden-kop">
        <h2 id="voorwaarden-kop">Looptijd, verlenging en opzeggen</h2>
        <VoorwaardenKort />
        <Bron sleutel="betaaltermijn" />
        <p className="klein">
          Dit is een samenvatting. De volledige afspraken staan in de <Link to="/algemene-voorwaarden">algemene voorwaarden</Link>.
        </p>
      </section>

      <section className="lm-sectie" id="vergelijking" aria-labelledby="vergelijking-kop">
        <h2 id="vergelijking-kop">Gratis of lid: wat is het verschil</h2>
        <Vergelijkingstabel />
      </section>

      <section className="lm-sectie" id="aanmelden" aria-labelledby="aanmelden-kop">
        <h2 id="aanmelden-kop">Zo meldt u aan</h2>
        <Stappenplan />
        <div className="knoppen">
          <Link className="knop primair" to="/lidmaatschap/aanmelden">
            Naar het aanmeldformulier
          </Link>
          <a className="knop" href={`mailto:${contact.email}?subject=Offerte%20lidmaatschap%20Ledenplatform%20Restafvalkaart`}>
            Offerte aanvragen per e-mail
          </a>
        </div>
        <p className="klein muted">
          Houd bij de hand: KVK-nummer, factuuradres, het e-mailadres van uw crediteurenadministratie en, als u dat gebruikt, uw
          inkoopordernummer.
        </p>
      </section>

      <section className="lm-sectie" id="vragen" aria-labelledby="vragen-kop">
        <h2 id="vragen-kop">Veelgestelde vragen</h2>
        <VeelgesteldeVragen />
        <Bron sleutel="drempel" />
      </section>

      <section className="lm-sectie" id="bronnen" aria-labelledby="bronnen-kop">
        <h2 id="bronnen-kop">Bronnen</h2>
        <p className="klein muted">
          Gegevens op deze pagina die niet van KplusV zelf komen, met de datum waarop we ze hebben gecontroleerd.
        </p>
        <Bronnenlijst />
      </section>
    </>
  );
}
