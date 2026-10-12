import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Kaart, ToegangBadge, VoorbeeldBadge } from '../components/ui';
import { nieuws } from '../data/nieuws';
import { tools } from '../data/tools';
import { prijsklassen } from '../data/lidmaatschap';
import { samenwerkingsverbanden } from '../data/samenwerkingsverbanden';
import { gemeenten } from '../data/gemeenten';
import { verbandenMetCijfers } from '../lib/kaartdata';
import { datum, euro } from '../lib/format';

// Leaflet pas laden als de pagina in beeld is.
const RestafvalKaart = lazy(() => import('../components/kaart/RestafvalKaart').then((m) => ({ default: m.RestafvalKaart })));

export function Home() {
  const verbanden = useMemo(() => verbandenMetCijfers(samenwerkingsverbanden, gemeenten), []);
  const laatsteNieuws = [...nieuws].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 3);
  const uitgelicht = tools.filter((t) => ['aanbesteding', 'index', 'pmd'].includes(t.id));
  const laagste = Math.min(...prijsklassen.map((p) => p.van));

  return (
    <>
      <section className="hero-blok">
        <div className="stapel">
          <h1>Kennis, rekentools en aanbestedingsinformatie over afvalverwerking</h1>
          <p className="lead">
            Een platform rond de Restafvalkaart van Nederland voor samenwerkingsverbanden en afvalverwerkers. Iedereen kan
            de kaart, het nieuws en de kennisbank gebruiken. Leden krijgen daarnaast rekenmodellen voor indexering,
            heffingen en bodemas, en een archief van aanbestedingen.
          </p>
          <div className="knoppen">
            <Link className="knop primair" to="/restafvalkaart">
              Open de Restafvalkaart
            </Link>
            <Link className="knop" to="/over-het-platform">
              Over het platform
            </Link>
          </div>
        </div>
        <div className="leaflet-vak mini" role="region" aria-label="Kleine kaart van Nederland met fictieve samenwerkingsverbanden">
          <Suspense fallback={null}>
            <RestafvalKaart verbanden={verbanden} mini />
          </Suspense>
        </div>
      </section>

      <div className="raster raster-3 sectie">
        <Kaart titel="Laatste nieuws" actie={<Link className="link-pijl klein" to="/nieuws">Alle berichten</Link>}>
          <ul className="berichten">
            {laatsteNieuws.map((n) => (
              <li key={n.id} className="bericht">
                <h3>{n.titel}</h3>
                <div className="meta">
                  <time dateTime={n.datum}>{datum(n.datum)}</time>
                  <VoorbeeldBadge tekst="Voorbeeldbericht" />
                </div>
              </li>
            ))}
          </ul>
        </Kaart>

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
            Een jaarabonnement per organisatie, niet per gebruiker. Leden krijgen de volledige rekentools, aanbestedingen
            per samenwerkingsverband en het aanbestedingsarchief.
          </p>
          <p className="klein">
            Richtprijs vanaf <strong>{euro(laagste)}</strong> per jaar <Badge soort="voorbeeld">Concept, indicatief</Badge>
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
