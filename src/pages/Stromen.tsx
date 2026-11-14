import '../components/stromen/stromen.css';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Kaart, PaginaKop, Trend } from '../components/ui';
import { Sparkline } from '../components/stromen/Sparkline';
import { landelijkeFeiten } from '../components/stromen/Kerncijfers';
import { kgTekst } from '../components/stromen/opmaak';
import { archiefPad, documentenPad, stroomPad, stromen } from '../data/stromen';
import { publicatiesVoorStroom } from '../data/kennisbank';
import { afvalBron } from '../data/afvalbron';
import { datum, getal } from '../lib/format';
import { landelijk } from '../lib/stromen';

export function Stromen() {
  useEffect(() => {
    document.title = 'Afvalstromen · Afvalverwerking.nl';
  }, []);
  return (
    <>
      <PaginaKop
        titel="Afvalstromen"
        badges={
          <>
            <Badge soort="thema">CBS-cijfers tot {landelijk.jaren[landelijk.jaren.length - 1]}</Badge>
            <Badge>{stromen.length} stromen</Badge>
          </>
        }
      >
        Per huishoudelijke afvalstroom het landelijke cijfer en de ontwikkeling, de verdeling over gemeenten, hoe de stroom wordt verwerkt, welke regels gelden en welke
        tools, aanbestedingen en publicaties erbij horen.
      </PaginaKop>
      <p className="bronregel klein">
        Bron: CBS, tabel{' '}
        <a href={landelijk.bron.url} target="_blank" rel="noopener noreferrer">
          {landelijk.bron.tabelId}
          <span className="visueel-verborgen"> (opent CBS StatLine in nieuw tabblad)</span>
        </a>
        , opgehaald op {datum(landelijk.opgehaald)}. Cijfers per gemeente: CBS, tabel 83452NED. Teksten over verwerking en regels zijn nagelezen bij de bronnen op de
        stroompagina's. <a href="#matrix">Wat het platform per stroom heeft</a>
      </p>

      <ul className="stroomraster sectie" style={{ listStyle: 'none', padding: 0 }}>
        {stromen.map((s) => {
          const f = landelijkeFeiten(s.id);
          const v = f.verandering;
          return (
            <li key={s.id} style={{ display: 'contents' }}>
              <article className="stroomkaart" aria-labelledby={`stroom-${s.id}`}>
                <h2 className="balk" id={`stroom-${s.id}`}>
                  <Link to={stroomPad(s.id)}>{s.naam}</Link>
                </h2>
                <p>{s.kort}</p>
                {f.laatste ? (
                  <>
                    <p className="kerncijfer">
                      <strong>{kgTekst(f.laatste.waarde)} kg</strong>
                      <span className="klein muted">
                        per inwoner in {f.laatste.jaar}
                        {f.status && f.status !== 'definitief' ? `, ${f.status}` : ''}
                        {f.kton !== null ? ` · ${getal(f.kton, f.kton < 10 ? 1 : 0)} kton` : ''}
                      </span>
                    </p>
                    <Sparkline reeks={f.reeks.filter((p) => !v || p.jaar >= v.van.jaar)} />
                    <p className="klein">
                      {v ? (
                        <>
                          <Trend pct={v.pct ?? v.verschil} />{' '}
                          <span>
                            sinds {v.van.jaar}: van {kgTekst(v.van.waarde)} naar {kgTekst(v.naar.waarde)} kg
                            {v.pct === null ? '' : ` (${v.pct > 0 ? '+' : v.pct < 0 ? '−' : ''}${getal(Math.abs(v.pct), 0)} %)`}
                          </span>
                        </>
                      ) : (
                        <span className="muted">Te weinig jaren voor een trend.</span>
                      )}
                    </p>
                  </>
                ) : (
                  <p className="muted">Geen landelijk cijfer bij CBS.</p>
                )}
                <p className="klein">
                  <Link className="link-pijl" to={stroomPad(s.id)}>
                    Bekijk de stroom
                  </Link>
                </p>
              </article>
            </li>
          );
        })}
      </ul>

      <Kaart titel="Wat het platform per stroom heeft" className="sectie" id="matrix" sub="Elke link gaat naar het onderdeel op de stroompagina of naar het archief, gefilterd op de stroom.">
        <table className="stromen-matrix">
          <caption className="visueel-verborgen">Per afvalstroom: cijfers, kaart, tools, aanbestedingen, documenten en publicaties</caption>
          <thead>
            <tr>
              <th scope="col">Stroom</th>
              <th scope="col">Cijfers</th>
              <th scope="col">Kaart en tabel</th>
              <th scope="col">Tools</th>
              <th scope="col">Aanbestedingen</th>
              <th scope="col">Documenten</th>
              <th scope="col">Publicaties</th>
            </tr>
          </thead>
          <tbody>
            {stromen.map((s) => {
              const p = publicatiesVoorStroom(s.id);
              return (
                <tr key={s.id}>
                  <th scope="row">
                    <Link to={stroomPad(s.id)}>{s.naam}</Link>
                  </th>
                  <td data-label="Cijfers">
                    <Link to={`${stroomPad(s.id)}#ontwikkeling`}>Tijdreeks</Link>
                  </td>
                  <td data-label="Kaart en tabel">
                    <Link to={`${stroomPad(s.id)}#per-gemeente`}>{afvalBron.samenvatting.aantalGemeenten} gemeenten</Link>
                  </td>
                  <td data-label="Tools">
                    <Link to={`${stroomPad(s.id)}#tools`}>{s.tools.length} {s.tools.length === 1 ? 'tool' : 'tools'}</Link>
                  </td>
                  <td data-label="Aanbestedingen">
                    <Link to={archiefPad(s)}>Archief</Link>
                  </td>
                  <td data-label="Documenten">
                    <Link to={documentenPad(s)}>Bibliotheek</Link>
                  </td>
                  <td data-label="Publicaties">
                    <Link to={`${stroomPad(s.id)}#publicaties`}>
                      {p.specifiek.length} {p.specifiek.length === 1 ? 'publicatie' : 'publicaties'}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="klein muted">
          Het aanbestedingsarchief is voor leden; de documentenbibliotheek is een onderdeel ervan. Het aantal publicaties telt alleen wat bij de stroom zelf hoort; publicaties over alle stromen staan
          op de stroompagina onder Publicaties en in de <Link to="/kennisbank">kennisbank</Link>.
        </p>
      </Kaart>
    </>
  );
}
