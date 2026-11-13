import { Tegel } from '../ui';
import { datum, getal } from '../../lib/format';
import type { Stroom } from '../../data/stromen';
import { landelijk, punten, spreiding, statusVanJaar, trimNullen, verandering, type GemeentenBestand } from '../../lib/stromen';
import { kgTekst } from './opmaak';

/** Eén zin over het landelijke cijfer, voor bovenaan de pagina en voor het overzicht. */
export function landelijkeFeiten(stroomId: Stroom['id']) {
  const reeks = trimNullen(punten(landelijk.jaren, landelijk.reeksen[stroomId].kg));
  const kton = punten(landelijk.jaren, landelijk.reeksen[stroomId].kton);
  const laatste = reeks[reeks.length - 1];
  const laatsteKton = kton.find((p) => p.jaar === laatste?.jaar)?.waarde ?? null;
  return {
    reeks,
    laatste,
    kton: laatsteKton,
    verandering: verandering(reeks, 10),
    status: laatste ? statusVanJaar(landelijk.bron.status, laatste.jaar) : null,
  };
}

/** De drie tot vier kerncijfers van een stroom, met bron en peiljaar. */
export function Kerncijfers({ stroom, gemeenten }: { stroom: Stroom; gemeenten: GemeentenBestand | null | 'fout' }) {
  const f = landelijkeFeiten(stroom.id);
  const sp = gemeenten && gemeenten !== 'fout' ? spreiding(gemeenten.gemeenten, stroom.id) : null;
  const peiljaar = gemeenten && gemeenten !== 'fout' ? gemeenten.kop.peiljaar : null;
  if (!f.laatste) return <p className="muted">Voor deze stroom heeft CBS geen landelijk cijfer.</p>;
  const v = f.verandering;
  return (
    <>
      <div className="tegels">
        <Tegel
          hero
          label={`Landelijk ${f.laatste.jaar}`}
          waarde={`${kgTekst(f.laatste.waarde)} kg`}
          toelichting={`per inwoner${f.status && f.status !== 'definitief' ? `, ${f.status}` : ''}`}
        />
        <Tegel
          label={`Hoeveelheid ${f.laatste.jaar}`}
          waarde={f.kton === null ? '–' : `${getal(f.kton, f.kton < 10 ? 1 : 0)} kton`}
          toelichting="alle gemeenten samen, in 1.000 ton"
        />
        <Tegel
          label={v ? `Verandering ${v.van.jaar}–${v.naar.jaar}` : 'Verandering'}
          waarde={v ? `${v.verschil > 0 ? '+' : v.verschil < 0 ? '−' : ''}${kgTekst(Math.abs(v.verschil))} kg` : '–'}
          trend={v?.pct ?? null}
          toelichting={
            v ? `van ${kgTekst(v.van.waarde)} naar ${kgTekst(v.naar.waarde)} kg per inwoner${v.pct === null ? '' : `, ${v.pct > 0 ? '+' : v.pct < 0 ? '−' : ''}${getal(Math.abs(v.pct), 0)} %`}` : 'te weinig jaren'
          }
        />
        <Tegel
          label={peiljaar ? `Spreiding gemeenten ${peiljaar}` : 'Spreiding gemeenten'}
          waarde={sp ? `${kgTekst(sp.p10)} tot ${kgTekst(sp.p90)} kg` : gemeenten === 'fout' ? 'niet geladen' : 'laden…'}
          toelichting={
            sp
              ? `10e tot 90e percentiel van ${sp.n} gemeenten; laagste ${sp.min.naam} (${kgTekst(sp.min.waarde)}), hoogste ${sp.max.naam} (${kgTekst(sp.max.waarde)})`
              : 'per inwoner, verschil tussen gemeenten'
          }
        />
      </div>
      <p className="bronregel klein">
        Bron: CBS,{' '}
        <a href={landelijk.bron.url} target="_blank" rel="noopener noreferrer">
          tabel {landelijk.bron.tabelId}
          <span className="visueel-verborgen"> (opent CBS StatLine in nieuw tabblad)</span>
        </a>{' '}
        voor het landelijke cijfer{peiljaar && gemeenten && gemeenten !== 'fout' ? (
          <>
            , en{' '}
            <a href={gemeenten.kop.bron.url} target="_blank" rel="noopener noreferrer">
              tabel {gemeenten.kop.bron.tabelId}
              <span className="visueel-verborgen"> (opent CBS StatLine in nieuw tabblad)</span>
            </a>{' '}
            voor de gemeenten ({peiljaar})
          </>
        ) : null}
        . Opgehaald op {datum(landelijk.opgehaald)}. De landelijke cijfers lopen een jaar voor op de gemeentecijfers.
      </p>
      <p className="klein muted">{stroom.cijferUitleg}</p>
    </>
  );
}
