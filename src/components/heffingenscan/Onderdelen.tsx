import type { ReactNode } from 'react';
import { Tegel } from '../ui';
import { datum, euro, getal, procent } from '../../lib/format';
import { heffingOntwikkelingen, wetsstatus } from '../../data/heffingen-tarieven';
import type { JaarUitkomst } from '../../lib/calc/heffingen';

/** Let-op-blok (Violet) met de status van het wetsvoorstel Belastingplan 2027 op de peildatum. */
export function WetsstatusBlok({ klein }: { klein?: boolean }) {
  return (
    <div className="notitie hs-wetsstatus" role="note" aria-label="Status van het wetsvoorstel">
      <p>
        <strong>Status van het wetsvoorstel, {datum(wetsstatus.peildatum)}:</strong> {wetsstatus.kort} Tot het wet is, geldt het hogere tariefpad uit het Belastingplan 2026.
      </p>
      {!klein && (
        <details className="hs-details">
          <summary>Wat er is gebeurd en wat er nog kan veranderen</summary>
          <p>{wetsstatus.tekst}</p>
          <ul className="opsomming">
            {wetsstatus.stappen.map((s) => (
              <li key={s.datum}>
                {datum(s.datum)}: {s.tekst}
              </li>
            ))}
          </ul>
          <p>{wetsstatus.notasVanWijziging}</p>
          <p>
            Amendementen over afval of de CO2-heffing zijn verworpen: nr. {wetsstatus.amendementen.map((a) => a.nummer).join(', nr. ')}. De tarieven in deze scan zijn dus niet gewijzigd.
          </p>
          <ul className="opsomming">
            {heffingOntwikkelingen.map((o) => (
              <li key={o.titel}>
                <strong>{o.titel}.</strong> {o.tekst}
              </li>
            ))}
          </ul>
          <p className="klein">
            Bronnen:{' '}
            {wetsstatus.bronnen.map((b, i) => (
              <span key={b.url}>
                {i > 0 && '; '}
                <a href={b.url} target="_blank" rel="noopener noreferrer">
                  {b.titel}
                </a>
              </span>
            ))}
            . Peildatum {datum(wetsstatus.peildatum)}.
          </p>
        </details>
      )}
    </div>
  );
}

/** Drie tegels: 2026, 2030 en 2035 (2035 als hero), met het bedrag per huishouden. */
export function DrieTegels({ rijen, label = '' }: { rijen: JaarUitkomst[]; label?: string }) {
  const kies = (jaar: number) => rijen.find((r) => r.jaar === jaar)!;
  return (
    <div className="tegels hs-tegels" role="group" aria-label={`Heffingen op restafval in 2026, 2030 en 2035${label}`}>
      {[2026, 2030, 2035].map((jaar) => {
        const r = kies(jaar);
        return <Tegel key={jaar} label={`In ${jaar}`} waarde={euro(r.totaal)} toelichting={`${euro(r.perHuishouden)} per huishouden per jaar`} hero={jaar === 2035} />;
      })}
    </div>
  );
}

/** Tabel met de uitkomst per jaar. */
export function JaarTabel({ rijen, caption }: { rijen: JaarUitkomst[]; caption: ReactNode }) {
  return (
    <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel heffingen per jaar, horizontaal scrollbaar">
      <table className="hs-jaartabel">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Jaar</th>
            <th scope="col" className="num">Ton restafval</th>
            <th scope="col" className="num">Afvalstoffen&shy;belasting</th>
            <th scope="col" className="num">CO2-heffing</th>
            <th scope="col" className="num">Totaal</th>
            <th scope="col" className="num">Per huishouden</th>
            <th scope="col" className="num">Per ton</th>
            <th scope="col" className="num">Aandeel CO2-heffing</th>
          </tr>
        </thead>
        <tbody>
          {rijen.map((r) => (
            <tr key={r.jaar}>
              <th scope="row">{r.jaar}</th>
              <td className="num">{getal(r.ton)}</td>
              <td className="num">{euro(r.asb)}</td>
              <td className="num">{euro(r.co2)}</td>
              <td className="num">
                <strong>{euro(r.totaal)}</strong>
              </td>
              <td className="num">{euro(r.perHuishouden, 2)}</td>
              <td className="num">{euro(r.perTon, 2)}</td>
              <td className="num">{procent(r.aandeelCo2 * 100, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Euro's in miljoenen: "€ 3,55 mln". */
export const mln = (n: number) => `${euro(n / 1e6, 2)} mln`;
/** Compact bedrag voor boven een staaf: "€ 545k" of "€ 3,5 mln". */
export const euroKort = (n: number) => (Math.abs(n) >= 1e6 ? `€ ${getal(n / 1e6, n >= 1e7 ? 0 : 1)} mln` : `€ ${getal(n / 1e3, 0)}k`);
