import { LijnGrafiek } from '../grafiek/Grafieken';
import { datum, getal } from '../../lib/format';
import type { Stroom } from '../../data/stromen';
import { landelijk, punten, statusVanJaar } from '../../lib/stromen';
import { landelijkeFeiten } from './Kerncijfers';
import { kgTekst } from './opmaak';

/** Lijngrafiek van de landelijke tijdreeks, met tabel als tekstalternatief en de samenstelling per CBS-afvalsoort. */
export function Ontwikkeling({ stroom }: { stroom: Stroom }) {
  const f = landelijkeFeiten(stroom.id);
  if (!f.laatste || f.reeks.length < 2) return <p className="muted">Voor deze stroom heeft CBS te weinig jaren voor een tijdreeks.</p>;
  const kton = punten(landelijk.jaren, landelijk.reeksen[stroom.id].kton);
  const eerste = f.reeks[0];
  const v = f.verandering;
  const alt =
    `Lijngrafiek van ${stroom.naam.toLowerCase()} in kilo per inwoner, ${eerste.jaar} tot en met ${f.laatste.jaar}: ` +
    `van ${kgTekst(eerste.waarde)} naar ${kgTekst(f.laatste.waarde)} kilo` +
    (v ? `; over tien jaar (${v.van.jaar} tot ${v.naar.jaar}) van ${kgTekst(v.van.waarde)} naar ${kgTekst(v.naar.waarde)} kilo.` : '.');
  const laatsteIndex = landelijk.jaren.indexOf(f.laatste.jaar);

  return (
    <>
      <p>
        {stroom.naam} ging landelijk van {kgTekst(eerste.waarde)} kg per inwoner in {eerste.jaar} naar {kgTekst(f.laatste.waarde)} kg in {f.laatste.jaar}
        {v ? `; over de laatste tien jaar (${v.van.jaar} tot ${v.naar.jaar}) van ${kgTekst(v.van.waarde)} naar ${kgTekst(v.naar.waarde)} kg` : ''}.
      </p>
      <LijnGrafiek
        titel={alt}
        labels={f.reeks.map((p) => p.jaar)}
        reeksen={[{ naam: `${stroom.naam}, kg per inwoner`, waarden: f.reeks.map((p) => p.waarde) }]}
        formatY={(n) => `${getal(n, n !== Math.round(n) ? 1 : 0)}`}
      />
      <p className="klein muted">
        Landelijk, alle gemeenten samen. {f.laatste.jaar}: {statusVanJaar(landelijk.bron.status, f.laatste.jaar)}. Bron: CBS, tabel{' '}
        {landelijk.bron.tabelId}, opgehaald op {datum(landelijk.opgehaald)}. CBS wijzigt de cijfers van de laatste jaren soms nog.
      </p>

      <details className="inklap-tekst">
        <summary>Cijfers per jaar als tabel</summary>
        <div className="kaarttabel">
          <table>
            <caption className="visueel-verborgen">{`${stroom.naam}, landelijk per jaar`}</caption>
            <thead>
              <tr>
                <th scope="col">Jaar</th>
                <th scope="col" className="num">
                  Kg per inwoner
                </th>
                <th scope="col" className="num">
                  Kton
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...f.reeks].reverse().map((p) => (
                <tr key={p.jaar}>
                  <th scope="row">{p.jaar}</th>
                  <td className="num">{kgTekst(p.waarde)}</td>
                  <td className="num">{(() => {
                    const k = kton.find((x) => x.jaar === p.jaar)?.waarde;
                    return k === undefined ? '–' : getal(k, k < 10 && k !== Math.round(k) ? 1 : 0);
                  })()}</td>
                  <td>{statusVanJaar(landelijk.bron.status, p.jaar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {stroom.fractieSleutels.length > 1 && (
        <details className="inklap-tekst">
          <summary>
            Waaruit de stroom bestaat ({f.laatste.jaar}, landelijk)
          </summary>
          <div className="kaarttabel">
            <table>
              <caption className="visueel-verborgen">{`Samenstelling van ${stroom.naam.toLowerCase()} volgens CBS-afvalsoort`}</caption>
              <thead>
                <tr>
                  <th scope="col">CBS-afvalsoort</th>
                  <th scope="col" className="num">
                    Kg per inwoner
                  </th>
                  <th scope="col" className="num">
                    Kton
                  </th>
                </tr>
              </thead>
              <tbody>
                {stroom.fractieSleutels.map((k) => {
                  const fr = landelijk.fracties[k];
                  const kg = fr.kg[laatsteIndex];
                  const kt = fr.kton[laatsteIndex];
                  return (
                    <tr key={k}>
                      <th scope="row">{fr.titel}</th>
                      <td className="num">{typeof kg === 'number' ? getal(kg, kg < 10 && kg !== Math.round(kg) ? 1 : 0) : '–'}</td>
                      <td className="num">{typeof kt === 'number' ? getal(kt, kt < 10 && kt !== Math.round(kt) ? 1 : 0) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="klein muted">
            CBS rondt af op hele kilo's en kton; kleine fracties tellen daardoor niet precies op tot het totaal van de stroom.
            {stroom.id === 'pmd' ? ' Kunststof, drankenkartons en blik staan vanaf 2024 niet meer apart; alles zit in de PMD-fractie.' : ''}
          </p>
        </details>
      )}
    </>
  );
}
