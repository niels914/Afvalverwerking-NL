import type { ReactNode } from 'react';
import { FeedbackFormulier } from '../components/FeedbackFormulier';
import { MeerWeten } from '../components/contact/MeerWeten';
import { GratisBetaald } from '../components/GratisBetaald';
import { Badge, PaginaKop } from '../components/ui';
import { Link } from 'react-router-dom';
import { btwPercentage, prijzenVastgesteld, staffels } from '../data/lidmaatschap';
import { euro } from '../lib/format';

// Pagina voor collega's en relaties die het idee voor het eerst zien.
// Bewust GEEN lijst met organisaties die we willen benaderen: lezers zijn elkaars concurrent of afnemer.

// Rekenvoorbeeld verdienmodel: het aantal leden is een aanname, het gemiddelde volgt uit de conceptprijzen.
const voorbeeldAantal = 10;
const voorbeeldGemiddeld = Math.round(staffels.reduce((som, s) => som + s.prijsExclBtw, 0) / staffels.length);

function Sectie({ nr, titel, id, children, badge }: { nr: number; titel: string; id?: string; children: ReactNode; badge?: ReactNode }) {
  return (
    <section className="kaart genummerd sectie" id={id} aria-labelledby={`over-${nr}`}>
      <div className="kaart-kop">
        <h2 id={`over-${nr}`} className="balk">
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
          Het platform voor de verwerking van huishoudelijke afvalstromen: restafval, gft, papier, PMD, textiel, glas en grof afval.
          De voordeur is de <Link to="/heffingenscan">Heffingenscan</Link>: elke gemeente ziet gratis wat de afvalstoffenbelasting en de
          CO2-heffing op restafval tot 2035 kosten. Daarachter ligt de diepte: een pagina per <Link to="/stromen">afvalstroom</Link> met
          cijfers, geld en regels, de <Link to="/restafvalkaart">Restafvalkaart</Link>, rekentools, het{' '}
          <Link to="/aanbestedingsarchief">aanbestedingsarchief</Link> en de bibliotheek met documenten uit andere aanbestedingen.
        </p>
      </Sectie>

      <Sectie nr={2} titel="Voor wie">
        <p>
          Beleidsmedewerkers en contractmanagers van gemeenten, gemeentelijke samenwerkingsverbanden en afvalverwerkers. De Heffingenscan
          is bedoeld voor gemeenten; de rekentools en het archief zijn ook bruikbaar voor verwerkers en samenwerkingsverbanden.
        </p>
      </Sectie>

      <Sectie nr={3} titel="Wat het oplost">
        <p>
          Wie de kosten van restafval wil begrijpen of een afvalcontract wil voorbereiden, zoekt nu op losse plekken en rekent in eigen
          Excelsheets. Het platform brengt de cijfers per stroom, de heffingen, de rekenmodellen (met zichtbare formules) en de
          aanbestedingen samen, met bron en peildatum erbij.
        </p>
        <p>
          Voor een gemeente die het scherper wil weten, maakt KplusV een rapport met de eigen tonnage en het eigen verwerkingscontract.
          Dat bestelt u los; het hoort niet bij het lidmaatschap.
        </p>
      </Sectie>

      <Sectie nr={4} titel="Gratis en betaald">
        <GratisBetaald kopNiveau={3} />
      </Sectie>

      <Sectie nr={5} titel="Verdienmodel" badge={prijzenVastgesteld ? undefined : <Badge soort="voorbeeld">Concept</Badge>}>
        <p>
          De Heffingenscan, de afvalstromen en de Restafvalkaart zijn gratis; het rapport bij de scan bestelt u los. Het lidmaatschap is een
          jaarabonnement per organisatie, niet per gebruiker, met een staffel naar soort en omvang. Betaling op factuur.
          {prijzenVastgesteld ? ' De prijzen' : ' De conceptprijzen'} per jaar, exclusief {btwPercentage} % btw:
        </p>
        <ul className="opsomming">
          {staffels.map((s) => (
            <li key={s.id}>
              {s.naam}: <strong>{euro(s.prijsExclBtw)}</strong> <span className="muted">({s.voorWie.toLowerCase()})</span>
              {s.aanname && !prijzenVastgesteld && (
                <>
                  {' '}
                  <Badge soort="voorbeeld">Aanname</Badge> <span className="klein muted">nog zonder eerdere richtprijs</span>
                </>
              )}
            </li>
          ))}
        </ul>
        <p>
          Daarnaast zijn maatwerk en advies mogelijk. Alle prijzen, voorwaarden en het aanmeldformulier staan op{' '}
          <Link to="/lidmaatschap">Lidmaatschap en prijzen</Link>.
        </p>
        <p className="klein muted">
          Rekenvoorbeeld met een aanname, geen prognose: bij {voorbeeldAantal} leden met gemiddeld {euro(voorbeeldGemiddeld)}{' '}
          per jaar is de omzet {euro(voorbeeldAantal * voorbeeldGemiddeld)} per jaar. Het aantal leden is niet bekend; het
          gemiddelde is het ongewogen gemiddelde van de {staffels.length} {prijzenVastgesteld ? 'staffelprijzen' : 'conceptprijzen'}.
        </p>
      </Sectie>

      <Sectie nr={6} titel="Waarde voor KplusV">
        <ul className="opsomming">
          <li>Zichtbaarheid van onze expertise bij samenwerkingsverbanden en verwerkers.</li>
          <li>Adviesvragen die voortkomen uit het gebruik van de scan en de tools, en rapportaanvragen van gemeenten.</li>
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
          Het platform is in bèta. Cijfers komen uit openbare bronnen (CBS, Rijkswaterstaat, TenderNed, wet- en regelgeving)
          met bron en peildatum; prijzen en voorwaarden zijn nog concept. De Heffingenscan rekent indicatief, op prijspeil 2026 en met
          het wetsvoorstel Belastingplan 2027. De volgende stap is een aantal gesprekken met gemeenten, samenwerkingsverbanden en
          verwerkers over gebruik en betaalbereidheid.
        </p>
      </Sectie>

      <Sectie nr={9} titel="Feedback" id="feedback">
        <p className="muted" style={{ marginBottom: 14 }}>
          Wat vindt u van het idee? Het invullen duurt ongeveer vijf minuten. Alleen uw rol is verplicht.
        </p>
        <FeedbackFormulier />
      </Sectie>

      <MeerWeten id="over-10" kop="10. Contact">
        <p>Vragen over het idee, of liever in gesprek dan een formulier invullen? Neem gerust contact op.</p>
      </MeerWeten>
    </>
  );
}
