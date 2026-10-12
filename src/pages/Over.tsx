import type { ReactNode } from 'react';
import { FeedbackFormulier } from '../components/FeedbackFormulier';
import { GratisBetaald } from '../components/GratisBetaald';
import { Badge, PaginaKop } from '../components/ui';
import { contact } from '../data/site';
import { euro } from '../lib/format';

// Pagina voor collega's en relaties die het idee voor het eerst zien.
// Bewust GEEN lijst met organisaties die we willen benaderen: lezers zijn elkaars concurrent of afnemer.

const voorbeeldAantal = 10;
const voorbeeldGemiddeld = 5000;

function Sectie({ nr, titel, id, children, badge }: { nr: number; titel: string; id?: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <section className="kaart genummerd sectie" id={id} aria-labelledby={`over-${nr}`}>
      <div className="kaart-kop">
        <h2 id={`over-${nr}`}>
          <span className="nr">{nr}.</span> {titel}
        </h2>
        {badge}
      </div>
      <div className="lees">{children}</div>
    </section>
  );
}

export function Over() {
  return (
    <>
      <PaginaKop titel="Over het platform">
        Voor collega’s en relaties die dit idee voor het eerst zien. Wat is het, voor wie, en wat willen we van u weten?
      </PaginaKop>

      <Sectie nr={1} titel="Het idee in één alinea">
        <p>
          Een ledenplatform rond de Restafvalkaart van Nederland. Een open laag met kaart, nieuws en kennis zorgt voor bereik
          en maakt het platform bekend. Een betaalde laag biedt rekenmodellen voor indexering, heffingen en bodemas, en
          informatie over lopende en afgeronde aanbestedingen.
        </p>
      </Sectie>

      <Sectie nr={2} titel="Voor wie">
        <p>
          Gemeentelijke samenwerkingsverbanden en afvalverwerkers. Het platform is ook bruikbaar voor gemeenten die zelf
          inzameling en verwerking regelen.
        </p>
      </Sectie>

      <Sectie nr={3} titel="Wat het oplost">
        <p>
          Contractmanagers en beleidsmedewerkers zoeken informatie over aanbestedingen, indexering en heffingen nu op losse
          plekken op en rekenen in eigen Excelsheets. Het platform brengt die informatie samen en biedt rekenmodellen waarvan
          de formules zichtbaar zijn.
        </p>
      </Sectie>

      <Sectie nr={4} titel="Gratis en betaald">
        <GratisBetaald kopNiveau={3} />
      </Sectie>

      <Sectie nr={5} titel="Verdienmodel" badge={<Badge soort="voorbeeld">Concept</Badge>}>
        <p>
          Een jaarabonnement per organisatie met een staffel naar omvang. Daarnaast maatwerk en jaarlijks onderhoud van
          indexcijfers.
        </p>
        <p>
          Rekenvoorbeeld: bij {voorbeeldAantal} organisaties à gemiddeld {euro(voorbeeldGemiddeld)} is dat{' '}
          <strong>{euro(voorbeeldAantal * voorbeeldGemiddeld)} per jaar</strong>.
        </p>
      </Sectie>

      <Sectie nr={6} titel="Waarde voor KplusV">
        <ul className="opsomming">
          <li>Zichtbaarheid van onze expertise bij samenwerkingsverbanden en verwerkers.</li>
          <li>Adviesvragen die voortkomen uit het gebruik van de tools.</li>
          <li>Terugkerende omzet.</li>
        </ul>
      </Sectie>

      <Sectie nr={7} titel="Waar we nog over nadenken">
        <ul className="opsomming">
          <li>
            <strong>Onafhankelijkheid.</strong> Verwerkers en samenwerkingsverbanden kunnen allebei lid zijn. Hoe blijft het
            platform voor beide partijen betrouwbaar?
          </li>
          <li>
            <strong>Betrouwbaarheid van de berekeningen.</strong> Rekenmodellen moeten kloppen en navolgbaar zijn. Daar hoort
            een vaste werkwijze voor controle en versiebeheer bij.
          </li>
          <li>
            <strong>Onderhoud van de data.</strong> Wie houdt indexreeksen, tarieven en aanbestedingen actueel, en hoe vaak?
          </li>
          <li>
            <strong>Gebruiksvoorwaarden van TenderNed en Mercell.</strong> Wat mag wel en niet met informatie van deze
            platforms?
          </li>
        </ul>
      </Sectie>

      <Sectie nr={8} titel="Status en vervolg">
        <p>
          Dit is een prototype. Alle content en berekeningen zijn fictief. De volgende stap is een aantal gesprekken met
          samenwerkingsverbanden en verwerkers over gebruik en betaalbereidheid.
        </p>
      </Sectie>

      <Sectie nr={9} titel="Feedback" id="feedback">
        <p className="muted" style={{ marginBottom: 14 }}>
          Wat vindt u van het idee? Het invullen duurt ongeveer vijf minuten. Alleen uw rol is verplicht.
        </p>
        <FeedbackFormulier />
      </Sectie>

      <section className="cta" aria-labelledby="over-10">
        <img src={contact.foto} alt={contact.naam} width={96} height={96} />
        <div className="cta-tekst">
          <h2 id="over-10">10. Contact</h2>
          <p>Vragen over het idee, of liever in gesprek dan een formulier invullen? Neem gerust contact op.</p>
          <div className="cta-persoon">
            <b>{contact.naam}</b> · {contact.functie}
          </div>
          <div className="cta-links">
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
            <span>{contact.telefoon}</span>
          </div>
        </div>
      </section>
    </>
  );
}
