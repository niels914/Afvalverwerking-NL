import '../components/kaart/inhoud.css';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Kaart, Tegel, ToegangBadge } from '../components/ui';
import { nieuws } from '../data/nieuws';
import { publicaties } from '../data/kennisbank';
import { tools } from '../data/tools';
import { prijzenVastgesteld, staffels } from '../data/lidmaatschap';
import { afvalBron } from '../data/afvalbron';
import { KLEUREN } from '../lib/kaartdata';
import { datum, euro, getal, procent } from '../lib/format';

// De kaart en de 342 gemeenterijen laden pas na de eerste weergave, in een apart bestand.
const RestafvalKaart = lazy(() => import('../components/kaart/RestafvalKaart').then((m) => ({ default: m.RestafvalKaart })));

const land = afvalBron.landelijkActueel;
const { aantalGemeenten, restafvalOnder100, laagste, hoogste } = afvalBron.samenvatting;
const peiljaar = afvalBron.peiljaar;

export function Home() {
  const laatsteNieuws = nieuws.slice(0, 4);
  const recentePublicaties = [...publicaties]
    .filter((p) => p.datum)
    .sort((a, b) => b.datum!.localeCompare(a.datum!))
    .slice(0, 3);
  const uitgelicht = tools.filter((t) => ['aanbesteding', 'index', 'pmd'].includes(t.id));

  return (
    <>
      <section className="hero-blok">
        <div className="stapel">
          <h1>Cijfers, kennis en rekentools voor afvalverwerking</h1>
          <p className="lead">
            Voor contractmanagers en beleidsmedewerkers van gemeenten, samenwerkingsverbanden en afvalverwerkers. De Restafvalkaart toont per
            gemeente hoeveel restafval er wordt ingezameld, met officiële CBS-cijfers. Leden krijgen daarnaast rekentools voor indexering,
            heffingen en bodemas, en een archief van aanbestedingen.
          </p>
          <div className="knoppen">
            <Link className="knop primair" to="/restafvalkaart">
              Open de Restafvalkaart
            </Link>
            <Link className="knop" to="/kennisbank">
              Naar de kennisbank
            </Link>
          </div>
        </div>
        <figure className="stapel home-kaart">
          <div className="kaart-vak mini">
            <Suspense fallback={null}>
              <RestafvalKaart
                indicator="restafval"
                mini
                titel={`Kaart van Nederland met restafval per inwoner per gemeente in ${peiljaar}. Van ${getal(laagste.restafval)} kg in ${laagste.naam} tot ${getal(hoogste.restafval)} kg in ${hoogste.naam}.`}
              />
            </Suspense>
          </div>
          <figcaption className="klein muted">
            <span aria-hidden="true" className="mini-legenda">
              {KLEUREN.map((k) => (
                <span key={k} style={{ background: k }} />
              ))}
            </span>
            Restafval per inwoner per gemeente, {peiljaar}: lichter is minder, donkerder is meer. Van {getal(laagste.restafval)} kg (
            {laagste.naam}) tot {getal(hoogste.restafval)} kg ({hoogste.naam}). Bron: CBS.{' '}
            <Link to="/restafvalkaart#tabel">Alle gemeenten in een tabel</Link>
          </figcaption>
        </figure>
      </section>

      <Kaart
        titel={land ? `Huishoudelijk afval in Nederland, ${land.jaar}` : `Huishoudelijk afval in Nederland, ${peiljaar}`}
        className="sectie"
        sub={
          land ? (
            <>
              Landelijk: CBS, tabel{' '}
              <a href={land.url} target="_blank" rel="noopener noreferrer">
                {land.tabelId}
              </a>{' '}
              ({land.jaar}, {land.status.label}). Per gemeente: tabel {afvalBron.bron.tabelId} ({peiljaar}, het nieuwste jaar met
              gemeentecijfers). Opgehaald op {datum(afvalBron.opgehaald)}.
            </>
          ) : (
            <>
              Bron: CBS, tabel {afvalBron.bron.tabelId} ({afvalBron.status.label}). Opgehaald op {datum(afvalBron.opgehaald)}.
            </>
          )
        }
      >
        <div className="tegels">
          {land && (
            <>
              <Tegel
                label="Restafval per inwoner"
                waarde={`${getal(land.restafvalKgPerInw)} kg`}
                toelichting={
                  <>
                    fijn + grof, landelijk {land.jaar} · <Link to="/restafvalkaart?toon=restafval#tabel">per gemeente</Link>
                  </>
                }
                hero
              />
              <Tegel
                label="Gescheiden ingezameld"
                waarde={procent(land.scheidingsPct, 0)}
                toelichting={
                  <>
                    van al het huishoudelijk afval · <Link to="/restafvalkaart?toon=scheidingsPct#tabel">per gemeente</Link>
                  </>
                }
              />
              <Tegel
                label="Totaal huishoudelijk afval"
                waarde={`${getal(land.totaalKgPerInw)} kg`}
                toelichting={
                  <>
                    per inwoner · <Link to="/restafvalkaart?toon=totaal#tabel">per gemeente</Link>
                  </>
                }
              />
            </>
          )}
          <Tegel
            label="Minder dan 100 kg restafval"
            waarde={`${restafvalOnder100} van ${aantalGemeenten}`}
            toelichting={
              <>
                gemeenten in {peiljaar} · <Link to="/restafvalkaart?toon=restafval#tabel">bekijk ze</Link>
              </>
            }
          />
        </div>
        {land && (
          <p className="klein muted definitie">
            Restafval is hier fijn plus grof huishoudelijk restafval, net als op de kaart. CBS telt in nieuwsberichten ook verbouwingsrestafval
            mee ({getal(land.verbouwingsrestafvalKgPerInw)} kg) en komt dan op {getal(land.restafvalKgPerInw + land.verbouwingsrestafvalKgPerInw)}{' '}
            kg. Gescheiden ingezameld volgt de CBS-definitie: nascheiding telt niet mee.
          </p>
        )}
      </Kaart>

      <div className="raster raster-2 sectie">
        <Kaart titel="Laatste nieuws" actie={<Link className="link-pijl klein" to="/nieuws">Alle berichten</Link>}>
          <ul className="berichten">
            {laatsteNieuws.map((n) => (
              <li key={n.id} className="bericht">
                <h3>
                  <a href={n.link} target="_blank" rel="noopener noreferrer">
                    {n.titel}
                    <span className="visueel-verborgen"> (opent website van {n.bron})</span>
                  </a>
                </h3>
                <div className="meta">
                  <time dateTime={n.datum}>{datum(n.datum)}</time>
                  <span>Bron: {n.bron}</span>
                </div>
              </li>
            ))}
          </ul>
        </Kaart>

        <Kaart titel="Nieuw in de kennisbank" actie={<Link className="link-pijl klein" to="/kennisbank">Alle publicaties</Link>}>
          <ul className="berichten">
            {recentePublicaties.map((p) => (
              <li key={p.id} className="bericht">
                <h3>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    {p.titel}
                    <span className="visueel-verborgen"> (opent in nieuw tabblad)</span>
                  </a>
                </h3>
                <div className="meta">
                  <span>{p.uitgever}</span>
                  <Badge>{p.type}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Kaart>
      </div>

      <div className="raster raster-2 sectie">
        <Kaart titel="Uitgelichte tools" actie={<Link className="link-pijl klein" to="/tools">Alle tools</Link>}>
          <ul className="berichten">
            {uitgelicht.map((t) => (
              <li key={t.id} className="bericht">
                <h3>
                  <Link to={t.pad}>{t.titel}</Link>
                </h3>
                <p className="klein muted">{t.omschrijving}</p>
                <div className="badges">
                  <ToegangBadge toegang={t.toegang} />
                </div>
              </li>
            ))}
          </ul>
        </Kaart>

        <Kaart titel="Lidmaatschap" actie={!prijzenVastgesteld ? <Badge>Concept</Badge> : undefined}>
          <p>
            Een jaarabonnement per organisatie, niet per gebruiker. Leden krijgen de volledige rekentools en het aanbestedingsarchief. Betalen
            gaat op factuur.
          </p>
          <table className="home-staffels">
            <caption className="visueel-verborgen">Jaarprijs per soort organisatie, exclusief btw</caption>
            <thead>
              <tr>
                <th scope="col">Organisatie</th>
                <th scope="col" className="num">
                  Per jaar, excl. btw
                </th>
              </tr>
            </thead>
            <tbody>
              {staffels.map((s) => (
                <tr key={s.id}>
                  <th scope="row">
                    {s.korteNaam}
                    <span className="tabel-sub-blok">{s.voorWie}</span>
                  </th>
                  <td className="num">{euro(s.prijsExclBtw)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!prijzenVastgesteld && <p className="klein muted">De prijzen zijn een concept en kunnen nog veranderen.</p>}
          <div className="knoppen">
            <Link className="knop primair" to="/lidmaatschap">
              Bekijk lidmaatschap
            </Link>
          </div>
        </Kaart>
      </div>
    </>
  );
}
