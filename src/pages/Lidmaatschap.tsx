import { Link } from 'react-router-dom';
import { PaginaKop } from '../components/ui';
import {
  Bron,
  Bronnenlijst,
  ConceptBadge,
  Inbegrepen,
  mailNaarKplusV,
  PrijzenTabel,
  Staffelkaarten,
  Stappenplan,
  Uitklap,
  VeelgesteldeVragen,
  Vergelijkingstabel,
  VoorwaardenKort,
} from '../components/lidmaatschap/onderdelen';
import { bronnen, grensGrootSamenwerkingsverband, prijzenVastgesteld, vergelijking, voorwaarden } from '../data/lidmaatschap';
import { tools } from '../data/tools';
import { contact } from '../data/site';

const inhoud = [
  { id: 'prijzen', label: 'Prijzen' },
  { id: 'aanmelden', label: 'Zo meldt u aan' },
  { id: 'inbegrepen', label: 'Wat is inbegrepen' },
  { id: 'voorwaarden', label: 'Looptijd en opzeggen' },
  { id: 'vergelijking', label: 'Gratis of lid' },
  { id: 'vragen', label: 'Veelgestelde vragen' },
  { id: 'bronnen', label: 'Bronnen' },
];

/** "a, b en c" */
function opsomming(woorden: string[]): string {
  if (woorden.length <= 1) return woorden.join('');
  return `${woorden.slice(0, -1).join(', ')} en ${woorden[woorden.length - 1]}`;
}

// Kernzin boven de vergelijkingstabel, afgeleid uit src/data/tools.ts zodat hij gelijk blijft aan de tools.
const helemaalGratis = tools.filter((t) => t.toegang === 'gratis').map((t) => t.titel);
const basisGratis = tools.filter((t) => t.toegang === 'gratis+pro').map((t) => t.titel);
const alleenLeden = tools.filter((t) => t.toegang === 'leden').map((t) => t.titel);

export function Lidmaatschap() {
  return (
    <>
      <PaginaKop titel="Lidmaatschap en prijzen" badges={<ConceptBadge />}>
        Eén vast bedrag per jaar per organisatie, niet per gebruiker. Uw hele organisatie krijgt de volledige rekentools en het
        aanbestedingsarchief. U betaalt op factuur.
      </PaginaKop>

      <nav className="lm-inhoud" id="lm-inhoud" tabIndex={-1} aria-labelledby="lm-inhoud-kop">
        <h2 id="lm-inhoud-kop">Op deze pagina</h2>
        <ul>
          {inhoud.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`}>{i.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="lm-sectie" id="prijzen" aria-labelledby="prijzen-kop">
        <h2 id="prijzen-kop">Prijzen per organisatie per jaar</h2>
        {!prijzenVastgesteld && (
          <p className="notitie" role="note">
            <strong>Concept.</strong> KplusV heeft de prijzen en voorwaarden nog niet vastgesteld. U kunt zich al aanmelden: u
            krijgt eerst een orderbevestiging met de definitieve prijs, pas daarna een factuur.
          </p>
        )}
        <Staffelkaarten />
        <PrijzenTabel />
        <p className="klein muted">
          Een samenwerkingsverband met {grensGrootSamenwerkingsverband} of meer deelnemende gemeenten valt in de staffel groot.
          Valt uw organisatie buiten deze staffels, bijvoorbeeld een provincie of adviesbureau?{' '}
          <a href={mailNaarKplusV('Lidmaatschap op maat')}>Vraag per e-mail een voorstel op maat</a>.
        </p>
        <Bron sleutel="btw" />
      </section>

      <section className="lm-sectie" id="aanmelden" aria-labelledby="aanmelden-kop">
        <h2 id="aanmelden-kop">Zo meldt u aan</h2>
        <Stappenplan />
        <div className="knoppen">
          <Link className="knop primair" to="/lidmaatschap/aanmelden">
            Naar het aanmeldformulier
          </Link>
          <Link className="knop" to="/lidmaatschap/aanmelden?soort=offerte">
            Eerst een offerte aanvragen
          </Link>
        </div>
        <p className="klein">
          Werkt uw organisatie met een offerte en een inkoopordernummer? Vraag dan eerst een offerte aan. U vult dezelfde
          gegevens in en krijgt binnen {voorwaarden.bevestigingWerkdagen} werkdagen een offerte als pdf,{' '}
          {voorwaarden.offerteGeldigDagen} dagen geldig. Houd bij de hand: KVK-nummer, factuuradres en het e-mailadres van uw
          crediteurenadministratie.
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
        <p>
          Gratis voor iedereen: de Restafvalkaart, het nieuws, de kennisbank
          {helemaalGratis.length > 0 && `, de ${opsomming(helemaalGratis)}`}
          {basisGratis.length > 0 && ` en een basisversie van de ${opsomming(basisGratis)}`}. Leden krijgen die rekentools
          volledig{alleenLeden.length > 0 && `, plus het ${opsomming(alleenLeden)}`} en het aanbestedingsarchief.
        </p>
        <Uitklap samenvatting={`Vergelijking per onderdeel (${vergelijking.length} rijen)`}>
          <Vergelijkingstabel />
        </Uitklap>
      </section>

      <section className="lm-sectie" id="vragen" aria-labelledby="vragen-kop">
        <h2 id="vragen-kop">Veelgestelde vragen</h2>
        <VeelgesteldeVragen />
        <p className="klein muted">
          Staat uw vraag er niet bij? Mail <a href={`mailto:${contact.email}`}>{contact.email}</a> of bel {contact.telefoon}.
        </p>
      </section>

      <section className="lm-sectie" id="bronnen" aria-labelledby="bronnen-kop">
        <h2 id="bronnen-kop">Bronnen</h2>
        <Uitklap samenvatting={`${Object.keys(bronnen).length} bronnen met de datum van controle`}>
          <p className="klein muted">Gegevens op deze pagina die niet van KplusV zelf komen.</p>
          <Bronnenlijst />
        </Uitklap>
      </section>

      <p className="lm-naar-boven">
        <a href="#lm-inhoud">
          Naar boven, naar de inhoud van deze pagina <span aria-hidden="true">↑</span>
        </a>
      </p>
    </>
  );
}
