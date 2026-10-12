import { Link } from 'react-router-dom';
import { GratisBetaald } from '../components/GratisBetaald';
import { Kaart, PaginaKop, VoorbeeldBadge } from '../components/ui';
import { prijsklassen } from '../data/lidmaatschap';
import { euro } from '../lib/format';

export function Lidmaatschap() {
  return (
    <>
      <PaginaKop titel="Lidmaatschap">
        Een groot deel van het platform is gratis. Leden krijgen de volledige rekentools en aanbestedingsinformatie. U
        betaalt per organisatie, niet per gebruiker: iedereen in uw organisatie kan het platform gebruiken.
      </PaginaKop>

      <GratisBetaald />

      <section className="sectie" aria-labelledby="prijzen-kop">
        <div className="kaart-kop" style={{ marginTop: 28 }}>
          <h2 id="prijzen-kop" style={{ borderLeft: '4px solid var(--paars)', paddingLeft: 12 }}>
            Richtprijzen per jaar
          </h2>
          <VoorbeeldBadge tekst="Concept, indicatief" />
        </div>
        <div className="prijzen">
          {prijsklassen.map((p) => (
            <Kaart key={p.doelgroep} titel={p.doelgroep} kopNiveau={3} className="prijs">
              <p className="muted klein">{p.toelichting}</p>
              <p className="bedrag">
                {euro(p.van)} – {euro(p.tot)}
              </p>
              <p className="klein muted">per organisatie per jaar, excl. btw</p>
            </Kaart>
          ))}
        </div>
        <p className="notitie sectie">
          Concept: de prijzen zijn een eerste indicatie om betaalbereidheid te toetsen. Er is nog geen aanbod en u kunt
          geen lid worden. Maatwerk en jaarlijks onderhoud van indexcijfers zijn mogelijke aanvullingen.
        </p>
      </section>

      <Kaart className="sectie vlak" titel="Interesse?">
        <p>Laat via het feedbackformulier weten of uw organisatie lid zou worden en welk bedrag u redelijk vindt.</p>
        <div className="knoppen">
          <Link className="knop primair" to="/over-het-platform#feedback">
            Interesse tonen
          </Link>
        </div>
      </Kaart>
    </>
  );
}
