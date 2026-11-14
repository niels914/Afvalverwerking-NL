import './Home.css';
import { Link } from 'react-router-dom';
import { GemeenteZoeker } from '../components/heffingenscan/GemeenteZoeker';
import { landelijkeFeiten } from '../components/stromen/Kerncijfers';
import { kgTekst } from '../components/stromen/opmaak';
import { Badge, Kaart, Tegel } from '../components/ui';
import { AANVRAAG_PAD, aanbodPrijzen } from '../data/heffingen-aanbod';
import { publicaties } from '../data/kennisbank';
import { nieuws } from '../data/nieuws';
import { stroomPad, stromen, type StroomId } from '../data/stromen';
import { datum, euro, getal } from '../lib/format';
import { HEFFINGENSCAN_PAD, heffingenVoorbeeld, heffingenscanPad } from '../lib/heffingenVoorbeeld';

// De zeven hoofdstromen als ingang; alle stromen (ook luiers en klein chemisch afval) staan op /stromen.
const HOOFDSTROMEN: StroomId[] = ['restafval', 'gft', 'papier', 'pmd', 'textiel', 'glas', 'grof'];

const { voorbeeld: v, landelijk: land, pad, wetsstatus } = heffingenVoorbeeld;
const jaarVan = (jaar: number) => v.jaren.find((j) => j.jaar === jaar)!;
const landJaar = (jaar: number) => land.jaren.find((j) => j.jaar === jaar)!;

export function Home() {
  const laatsteNieuws = nieuws.slice(0, 3);
  const recentePublicaties = [...publicaties]
    .filter((p) => p.datum)
    .sort((a, b) => b.datum!.localeCompare(a.datum!))
    .slice(0, 3);
  const l35 = landJaar(2035);

  return (
    <>
      <section className="home-hero" aria-labelledby="home-titel">
        <h1 className="balk inkt" id="home-titel">
          Wat kosten de heffingen op restafval uw gemeente?
        </h1>
        <p className="lead">
          De afvalstoffenbelasting en de CO2-heffing op afvalverbranding lopen op tot 2035. Zoek uw gemeente en zie direct wat dat in totaal en per
          huishouden kost, op basis van CBS-cijfers over restafval. Zonder account.
        </p>
        <GemeenteZoeker id="home" />
      </section>

      <Kaart
        titel={`Voorbeeld: ${v.naam}`}
        className="sectie"
        sub={
          <>
            Heffingen op restafval per jaar, prijspeil {heffingenVoorbeeld.prijspeil}, volgens het {pad.naam} ({pad.status}).{' '}
            {wetsstatus}
          </>
        }
      >
        <div className="tegels">
          <Tegel label="In 2026" waarde={euro(jaarVan(2026).totaal)} toelichting={`${euro(jaarVan(2026).perHuishouden)} per huishouden`} />
          <Tegel label="In 2030" waarde={euro(jaarVan(2030).totaal)} toelichting={`${euro(jaarVan(2030).perHuishouden)} per huishouden`} />
          <Tegel label="In 2035" waarde={euro(jaarVan(2035).totaal)} toelichting={`${euro(jaarVan(2035).perHuishouden)} per huishouden`} hero />
        </div>
        <p className="home-landelijk">
          Alle {getal(land.aantalGemeenten)} gemeenten samen: {euro(l35.totaal / 1e6)} miljoen in 2035, gemiddeld {euro(l35.perHuishouden)} per
          huishouden.
        </p>
        <div className="knoppen">
          <Link className="knop cta" to={heffingenscanPad(v.slug)}>
            Bekijk het voorbeeld
          </Link>
          <Link className="knop" to={AANVRAAG_PAD}>
            Rapport voor uw gemeente aanvragen ({euro(aanbodPrijzen.rapport)} {aanbodPrijzen.btwTekst})
          </Link>
        </div>
      </Kaart>

      <section className="sectie" aria-labelledby="home-stromen">
        <h2 className="balk" id="home-stromen">
          Het platform voor huishoudelijke afvalstromen
        </h2>
        <p className="home-belofte">
          Achter de heffingen zit het hele verhaal van uw afval: cijfers per stroom, geld en regels, tools, aanbestedingen en de documenten die
          daarbij horen. Kies een stroom.
        </p>
        <ul className="home-stromen">
          {HOOFDSTROMEN.map((id) => {
            const s = stromen.find((x) => x.id === id)!;
            const f = landelijkeFeiten(id);
            return (
              <li key={id}>
                <Link to={stroomPad(id)} className="home-stroom">
                  <span className="home-stroom-naam">{s.naam}</span>
                  {f.laatste ? (
                    <>
                      <span className="home-stroom-cijfer">{kgTekst(f.laatste.waarde)} kg</span>
                      <span className="home-stroom-uitleg">per inwoner in {f.laatste.jaar}</span>
                    </>
                  ) : (
                    <span className="home-stroom-uitleg">geen landelijk cijfer</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="klein">
          <Link className="link-pijl" to="/stromen">
            Alle afvalstromen
          </Link>{' '}
          <span className="muted">(ook luiers en klein chemisch afval). Landelijke cijfers: CBS.</span>
        </p>
      </section>

      <section className="sectie" aria-labelledby="home-lagen">
        <h2 className="balk" id="home-lagen">
          Vijf lagen, van overzicht tot contract
        </h2>
        <ol className="home-lagen">
          <li>
            <h3>Cijfers en kaart</h3>
            <p>Hoeveel afval elke stroom oplevert, landelijk en per gemeente, op de kaart en in tabellen.</p>
            <p className="home-laag-link">
              <Link to="/stromen">Afvalstromen</Link> · <Link to="/restafvalkaart">Restafvalkaart</Link>
            </p>
            <Badge>Gratis</Badge>
          </li>
          <li>
            <h3>Geld en regels</h3>
            <p>Wat heffingen en regels een gemeente kosten, tot 2035. Het rapport met uw eigen tonnage bestelt u los.</p>
            <p className="home-laag-link">
              <Link to={HEFFINGENSCAN_PAD}>Heffingenscan</Link>
            </p>
            <Badge>Scan gratis</Badge>
          </li>
          <li>
            <h3>Tools</h3>
            <p>Rekenhulpen voor indexering, CO2-heffing per installatie, bodemas, PMD en aanbestedingscriteria.</p>
            <p className="home-laag-link">
              <Link to="/tools">Tools</Link>
            </p>
            <Badge>Deels gratis, deels voor leden</Badge>
          </li>
          <li>
            <h3>Aanbestedingen</h3>
            <p>Aanbestedingen over afval uit TenderNed. Open aanbestedingen zoekt u gratis; het hele archief is voor leden.</p>
            <p className="home-laag-link">
              <Link to="/aanbestedingsarchief">Aanbestedingsarchief</Link>
            </p>
            <Badge>Open gratis, archief voor leden</Badge>
          </li>
          <li>
            <h3>Documenten en contracten</h3>
            <p>
              Leidraden, eisen, gunningscriteria en conceptovereenkomsten uit andere aanbestedingen, met de link naar TenderNed. En een
              kalender van contracten die aflopen.
            </p>
            <p className="home-laag-link">
              <Link to="/aanbestedingsarchief/documenten">Documentenbibliotheek</Link>
              <br />
              <Link to="/aanbestedingsarchief/contracten">Contractenkalender</Link>
            </p>
            <Badge soort="leden">Voor leden</Badge>
          </li>
        </ol>
        <p className="klein">
          Het lidmaatschap is per organisatie en nu nog een concept.{' '}
          <Link className="link-pijl" to="/lidmaatschap">
            Lidmaatschap en prijzen
          </Link>
        </p>
      </section>

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
    </>
  );
}
