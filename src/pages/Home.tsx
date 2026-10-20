import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Kaart, Tegel, ToegangBadge } from '../components/ui';
import { nieuws } from '../data/nieuws';
import { publicaties } from '../data/kennisbank';
import { tools } from '../data/tools';
import { prijsklassen } from '../data/lidmaatschap';
import { afvalBron } from '../data/afvalbron';
import { KLEUREN } from '../lib/kaartdata';
import { datum, euro, getal, procent } from '../lib/format';

// Leaflet pas laden als de pagina in beeld is.
const RestafvalKaart = lazy(() => import('../components/kaart/RestafvalKaart').then((m) => ({ default: m.RestafvalKaart })));

const controle = afvalBron.controle;
const { aantalGemeenten, restafvalOnder100 } = afvalBron.samenvatting;

export function Home() {
  const laatsteNieuws = nieuws.slice(0, 4);
  const recentePublicaties = [...publicaties]
    .filter((p) => p.datum)
    .sort((a, b) => b.datum!.localeCompare(a.datum!))
    .slice(0, 3);
  const uitgelicht = tools.filter((t) => ['aanbesteding', 'index', 'pmd'].includes(t.id));
  const laagste = Math.min(...prijsklassen.map((p) => p.van));

  return (
    <>
      <section className="hero-blok">
        <div className="stapel">
          <h1>Cijfers, kennis en rekentools voor afvalverwerking</h1>
          <p className="lead">
            Voor contractmanagers en beleidsmedewerkers van gemeenten, samenwerkingsverbanden en afvalverwerkers. De
            Restafvalkaart toont per gemeente hoeveel restafval er wordt ingezameld, met officiële CBS-cijfers. Leden krijgen
            daarnaast rekentools voor indexering, heffingen en bodemas, en een archief van aanbestedingen.
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
        <figure className="stapel" style={{ margin: 0 }}>
          <div className="leaflet-vak mini" role="img" aria-label={`Kaart van Nederland met restafval per inwoner per gemeente in ${afvalBron.peiljaar}. De cijfers staan in de tabel op de kaartpagina.`}>
            <Suspense fallback={null}>
              <RestafvalKaart indicator="restafval" mini />
            </Suspense>
          </div>
          <figcaption className="klein muted">
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 6 }}>
              {KLEUREN.map((k) => (
                <span key={k} style={{ background: k, width: 14, height: 10, display: 'inline-block' }} />
              ))}
            </span>
            Restafval per inwoner per gemeente, {afvalBron.peiljaar}: lichter is minder, donkerder is meer. Bron: CBS.
          </figcaption>
        </figure>
      </section>

      <Kaart
        titel={`Huishoudelijk afval in Nederland, ${afvalBron.peiljaar}`}
        className="sectie"
        sub={
          <>
            Bron: CBS, tabellen {afvalBron.bron.tabelId} en {controle?.tabelId ?? '83558NED'} (cijfers {afvalBron.status.label}). Opgehaald op{' '}
            {datum(afvalBron.opgehaald)}.
          </>
        }
        actie={
          <Link className="link-pijl klein" to="/restafvalkaart">
            Cijfers per gemeente
          </Link>
        }
      >
        <div className="tegels">
          {controle && (
            <>
              <Tegel label="Restafval per inwoner" waarde={`${getal(controle.landelijkRestafvalKgPerInw)} kg`} toelichting="fijn en grof restafval, landelijk" hero />
              <Tegel label="Gescheiden ingezameld" waarde={procent(controle.landelijkScheidingsPctCbs, 0)} toelichting="van al het huishoudelijk afval" />
              <Tegel label="Totaal huishoudelijk afval" waarde={`${getal(controle.landelijkTotaalKgPerInw)} kg`} toelichting="per inwoner" />
            </>
          )}
          <Tegel label="Minder dan 100 kg restafval" waarde={`${restafvalOnder100} van ${aantalGemeenten}`} toelichting="gemeenten" />
        </div>
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

        <Kaart titel="Lidmaatschap">
          <p>
            Een jaarabonnement per organisatie, niet per gebruiker. Leden krijgen de volledige rekentools en het
            aanbestedingsarchief.
          </p>
          <p className="klein">
            Vanaf <strong>{euro(laagste)}</strong> per jaar, exclusief btw.
          </p>
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
