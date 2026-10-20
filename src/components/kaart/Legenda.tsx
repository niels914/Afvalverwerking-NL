import type { GemeenteAfval } from '../../data/gemeenten';
import { indicatoren, klassen, KLEUR_GEEN, waardeVan, type IndicatorId } from '../../lib/kaartdata';
import { getal } from '../../lib/format';

/** Legenda bij de choropleet: kleur, klassegrenzen in tekst en aantal gemeenten per klasse. */
export function Legenda({ gemeenten, indicator }: { gemeenten: GemeenteAfval[]; indicator: IndicatorId }) {
  const ind = indicatoren[indicator];
  const lijst = klassen(gemeenten, indicator);
  const zonder = gemeenten.filter((g) => waardeVan(g, indicator) === null).length;
  const e = ind.eenheid === '%' ? ' %' : ` ${ind.eenheid}`;
  const label = (van: number | null, tot: number | null) =>
    van === null ? `minder dan ${getal(tot!)}${e}` : tot === null ? `${getal(van)}${e} of meer` : `${getal(van)} tot ${getal(tot)}${e}`;

  return (
    <figure className="legenda" aria-labelledby="legenda-titel">
      <figcaption id="legenda-titel">
        <strong>{ind.label}</strong>
        <span className="muted"> per gemeente{ind.eenheid === 'kg' ? ', kilo per inwoner per jaar' : ''}</span>
      </figcaption>
      <ul>
        {lijst.map((k) => (
          <li key={k.index}>
            <span className="vlak" style={{ background: k.kleur }} aria-hidden="true" />
            <span>{label(k.van, k.tot)}</span>
            <span className="aantal">{k.aantal} gem.</span>
          </li>
        ))}
        {zonder > 0 && (
          <li>
            <span className="vlak geen" style={{ background: KLEUR_GEEN }} aria-hidden="true" />
            <span>geen cijfer bij CBS</span>
            <span className="aantal">{zonder} gem.</span>
          </li>
        )}
      </ul>
      <p className="klein muted">
        Donkerder is {ind.lagerIsBeter ? 'meer' : 'een hoger percentage'}. {ind.uitleg}
      </p>
    </figure>
  );
}
