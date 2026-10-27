import { platform } from '../../data/site';
import { datum, getal } from '../../lib/format';
import { Link } from 'react-router-dom';
import { aanbieder, bronnen } from './gegevens';
import { BronRegel, ContactBlok, JuridischDocument, Toetspunt, type Sectie } from './JuridischDocument';
import { bekendeProblemen, meting, status, statusSchaal } from './toegankelijkheid';

// Toegankelijkheidsverklaring volgens de opbouw van het model van de Rijksoverheid: status, onderzoek,
// bekende problemen, maatregelen en contact. De meetgegevens staan in toegankelijkheid.ts.

const secties: Sectie[] = [
  {
    id: 'inzet',
    titel: 'Onze inzet',
    inhoud: (
      <>
        <p>
          KplusV wil dat iedereen het {platform.korteNaam} kan gebruiken, ook mensen die slecht zien, kleuren anders zien, alleen
          een toetsenbord gebruiken of een schermlezer of vergroting gebruiken.
        </p>
        <p>
          Het platform streeft naar WCAG 2.1 niveau AA, de norm die ook voor overheidswebsites geldt. Als bedrijf is KplusV niet
          verplicht een toegankelijkheidsverklaring te publiceren. Omdat veel gebruikers bij een overheid werken, volgen wij
          toch de opbouw van het model van de Rijksoverheid.
        </p>
        <BronRegel sleutel="wcag" voorvoegsel="Norm" />
        <BronRegel sleutel="bdto" voorvoegsel="Wettelijke plicht voor overheden" />
      </>
    ),
  },
  {
    id: 'status',
    titel: 'Status',
    inhoud: (
      <>
        <p className="jd-status">
          <span className="jd-status-letter" aria-hidden="true">
            {status.letter}
          </span>
          Status {status.letter}: {status.label}
        </p>
        <ol className="jd-schaal" aria-label="Statussen A tot en met E">
          {statusSchaal.map((s) => (
            <li key={s.letter} aria-current={s.letter === status.letter ? 'true' : undefined}>
              <span className="jd-schaal-letter" aria-hidden="true">
                {s.letter}
              </span>
              <span>
                <span className="visueel-verborgen">Status {s.letter}: </span>
                {s.betekenis}
                {s.letter === status.letter && <strong> (status van dit platform)</strong>}
              </span>
            </li>
          ))}
        </ol>
        <p>{status.toelichting}</p>
        <p>
          De status volgt de indeling A tot en met E van de Rijksoverheid. Het platform staat niet in het register van Logius;
          dit is onze eigen beoordeling.
        </p>
        <BronRegel sleutel="statussen" />
        <Toetspunt>
          Besluit of KplusV een volledig onderzoek laat doen door een onafhankelijke deskundige (bijvoorbeeld een bureau met
          een WCAG-EM-werkwijze). Met een gepland onderzoek binnen zes maanden wordt de status C.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'onderzoek',
    titel: 'Hoe wij hebben gemeten',
    inhoud: (
      <>
        <p>
          Laatste meting: {datum(meting.datum)}. {meting.omgeving}
        </p>
        <h3>Automatische controle met axe</h3>
        <p>
          Met axe-core {meting.axe.versie} zijn alle {getal(meting.axe.aantalPaginas)} pagina’s gecontroleerd op{' '}
          {meting.axe.regels}, op een schermbreedte van {meting.axe.breedtes.map((b) => `${b} pixels`).join(' en ')}.{' '}
          {meting.axe.paginasZonderBevindingen === meting.axe.aantalPaginas
            ? 'Op geen enkele pagina vond axe een probleem.'
            : `Op ${getal(meting.axe.paginasZonderBevindingen)} van de ${getal(meting.axe.aantalPaginas)} pagina’s vond axe geen probleem. De gevonden problemen staan hieronder bij Bekende problemen.`}
        </p>
        {meting.lighthouse.uitkomsten.length > 0 && (
          <>
            <h3>Lighthouse</h3>
            <p>
              Met Lighthouse {meting.lighthouse.versie} ({meting.lighthouse.instelling}) op tien veelgebruikte pagina’s. Een score loopt van 0 tot 100. Prestaties gaat over laadsnelheid, niet over toegankelijkheid.
            </p>
            <div className="tabel-container" role="region" aria-label="Lighthouse-scores per pagina" tabIndex={0}>
              <table>
                <caption className="visueel-verborgen">Lighthouse-scores per pagina</caption>
                <thead>
                  <tr>
                    <th scope="col">Pagina</th>
                    <th scope="col" className="num">
                      Toegankelijkheid
                    </th>
                    <th scope="col" className="num">
                      Prestaties
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {meting.lighthouse.uitkomsten.map((u) => (
                    <tr key={u.pagina}>
                      <th scope="row">
                        <Link to={u.pad}>{u.pagina}</Link>
                      </th>
                      <td className="num">{getal(u.toegankelijkheid)}</td>
                      <td className="num">{getal(u.prestaties)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <h3>Handmatige controles</h3>
        <ul>
          {meting.handmatig.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <h3>Niet gemeten</h3>
        <ul>
          {meting.nietGemeten.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p>
          Automatische hulpmiddelen vinden maar een deel van de problemen. Een volledig onderzoek door een deskundige is nog niet
          gedaan; zie <a href="#status">Status</a>.
        </p>
      </>
    ),
  },
  {
    id: 'bekende-problemen',
    titel: 'Bekende problemen',
    inhoud:
      bekendeProblemen.length === 0 ? (
        <p>Bij de laatste meting zijn geen problemen gevonden. Merkt u toch iets, meld het ons dan.</p>
      ) : (
        <>
          <p>
            Bij de meting van {datum(meting.datum)} voldeed {bekendeProblemen.length === 1 ? 'dit onderdeel' : 'deze onderdelen'}{' '}
            nog niet. axe controleert de rand van invoervelden niet; dit probleem is met de hand gemeten. Per probleem staat
            waar het zit, wat het voor u betekent en wat wij eraan doen.
          </p>
          <p>
            Sinds de meting van 20 oktober 2026 zijn opgelost: het contrast van blauwe links, van grijze hulptekst op
            lichtpaarse vlakken en van de tekst in de paarse kerncijfertegel, en de te kleine links naar nieuwsbronnen.
          </p>
          <div className="jd-blokken">
            {bekendeProblemen.map((p) => (
              <section key={p.id} className="jd-blok" id={`probleem-${p.id}`} aria-labelledby={`probleem-${p.id}-kop`}>
                <h3 id={`probleem-${p.id}-kop`}>{p.onderdeel}</h3>
                <dl className="jd-gegevens">
                  <dt>Waar</dt>
                  <dd>{p.paginas.join(', ')}</dd>
                  <dt>Probleem</dt>
                  <dd>{p.probleem}</dd>
                  <dt>WCAG</dt>
                  <dd>{p.criterium}</dd>
                  <dt>Wat merkt u</dt>
                  <dd>{p.gevolg}</dd>
                  <dt>Aanpak</dt>
                  <dd>{p.aanpak}</dd>
                </dl>
              </section>
            ))}
          </div>
        </>
      ),
  },
  {
    id: 'inhoud-van-anderen',
    titel: 'Inhoud van anderen',
    inhoud: (
      <p>
        Het platform linkt naar documenten en websites van anderen, zoals onderzoeken, nieuwsberichten en aankondigingen op
        TenderNed. KplusV kan die niet aanpassen en kan niet garanderen dat ze toegankelijk zijn. De gegevens op de kaart
        staan ook in tekst en in een tabel op dezelfde pagina.
      </p>
    ),
  },
  {
    id: 'maatregelen',
    titel: 'Wat wij doen',
    inhoud: (
      <ul>
        <li>Toegankelijkheid is een eis bij het ontwerpen en bouwen van elke pagina en elke rekentool.</li>
        <li>Automatische tests controleren onder meer de weergave op 400 pixels breed en de opbouw van de juridische pagina’s. Wij draaien die voor elke nieuwe versie.</li>
        <li>Na grotere wijzigingen meten wij opnieuw met axe en Lighthouse en werken wij deze verklaring bij.</li>
        <li>Kleuren komen uit één set huisstijlkleuren, zodat een contrastprobleem op één plek op te lossen is.</li>
        <li>Betekenis hangt nooit alleen van kleur af: er staat altijd tekst of een teken bij.</li>
      </ul>
    ),
  },
  {
    id: 'melden',
    titel: 'Probleem melden',
    inhoud: (
      <>
        <p>
          Loopt u tegen een probleem aan, of hebt u informatie in een andere vorm nodig? Laat het ons weten. Noem de pagina en
          wat er misgaat. U krijgt binnen vijf werkdagen een reactie; waar mogelijk lossen wij het probleem op of zoeken wij een
          andere manier om u de informatie te geven.
        </p>
        <ContactBlok onderwerp="Toegankelijkheid: probleem melden" />
        <p>
          Bent u niet tevreden over hoe wij met uw melding omgaan? Neem dan contact op met {aanbieder.handelsnaam} via <a href={`mailto:${aanbieder.emailAlgemeen}`}>{aanbieder.emailAlgemeen}</a>.
        </p>
      </>
    ),
  },
  {
    id: 'model',
    titel: 'Over deze verklaring',
    inhoud: (
      <>
        <p>
          Deze verklaring volgt de opbouw van het model van de Rijksoverheid. Wij herzien haar na elke nieuwe meting en ten
          minste eenmaal per jaar.
        </p>
        <p>
          Meer over het model: <a href={bronnen.modelverklaring.url}>{bronnen.modelverklaring.titel}</a>.
        </p>
      </>
    ),
  },
];

const kern = [
  `Status ${status.letter}: ${status.label}.`,
  `Laatste eigen meting op ${datum(meting.datum)}: axe vond op ${getal(meting.axe.paginasZonderBevindingen)} van de ${getal(meting.axe.aantalPaginas)} pagina’s geen probleem.`,
  bekendeProblemen.length === 0
    ? 'Er zijn geen bekende problemen.'
    : `${bekendeProblemen.length === 1 ? 'Eén bekend probleem' : `${getal(bekendeProblemen.length)} bekende problemen`}: ${bekendeProblemen.map((p) => p.onderdeel.toLowerCase()).join('; ')}.`,
  <>
    Loopt u ergens tegenaan? <a href="#melden">Meld het</a>; u krijgt binnen vijf werkdagen een reactie.
  </>,
];

export function Toegankelijkheid() {
  return (
    <JuridischDocument
      id="toegankelijkheid"
      kern={kern}
      intro="Hoe toegankelijk dit platform is, hoe wij dat hebben gemeten, welke problemen bekend zijn en waar u een probleem kunt melden."
      secties={secties}
    />
  );
}
