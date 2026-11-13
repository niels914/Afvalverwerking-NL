import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RestafvalKaart } from '../kaart/RestafvalKaart';
import { KeuzeVeld, Tegel } from '../ui';
import { KLEUREN, KLEUR_GEEN } from '../../lib/kaartdata';
import { datum, getal } from '../../lib/format';
import type { Stroom } from '../../data/stromen';
import {
  gewogenGemiddelde,
  klasseGrenzen,
  klasseVan,
  landelijk,
  laadGemeenten,
  naarCsv,
  plaatsVanHoogNaarLaag,
  sorteerRijen,
  waarde,
  zoekRijen,
  type GemeentenBestand,
  type Sorteer,
  type StroomRij,
} from '../../lib/stromen';
import { kgTekst } from './opmaak';

const EERSTE_RIJEN = 25;

/** Het gemeentecijfers-bestand laden en de status teruggeven; gedeeld door kern en kaartblok. */
export function useGemeenten(): GemeentenBestand | null | 'fout' {
  const [data, setData] = useState<GemeentenBestand | null | 'fout'>(null);
  useEffect(() => {
    let actief = true;
    laadGemeenten()
      .then((d) => actief && setData(d))
      .catch(() => actief && setData('fout'));
    return () => {
      actief = false;
    };
  }, []);
  return data;
}

/** Link naar de Heffingenscan van de gemeente: de slug komt uit het bestand van de Heffingenscan, dat pas bij gebruik laadt. */
function useHeffingenPad(code: string | null, naam: string | undefined, actief: boolean): string | null {
  const [pad, setPad] = useState<string | null>(null);
  useEffect(() => {
    setPad(null);
    if (!actief || !code || !naam) return;
    let nog = true;
    Promise.all([import('../../data/heffingen-gemeenten'), import('../../lib/heffingenVoorbeeld')])
      .then(([data, lib]) => {
        if (!nog) return;
        const g = data.heffingGemeenten.find((x) => x.code === code);
        setPad(g ? lib.heffingenscanPad(g.slug) : `${lib.HEFFINGENSCAN_PAD}?zoek=${encodeURIComponent(naam)}`);
      })
      .catch(() => nog && setPad(`/heffingenscan?zoek=${encodeURIComponent(naam)}`));
    return () => {
      nog = false;
    };
  }, [code, naam, actief]);
  return pad;
}

export function PerGemeente({ stroom, gemeenten }: { stroom: Stroom; gemeenten: GemeentenBestand | null | 'fout' }) {
  const [params, setParams] = useSearchParams();
  const koptRef = useRef<HTMLHeadingElement>(null);
  const [zoomVerzoek, setZoomVerzoek] = useState(0);
  const gekozenCode = params.get('gemeente');

  if (gemeenten === null) return <p role="status">Gemeentecijfers laden…</p>;
  if (gemeenten === 'fout')
    return (
      <p role="alert" className="notitie">
        De gemeentecijfers konden niet worden geladen. Ververs de pagina of probeer het later opnieuw.
      </p>
    );
  const rijen = gemeenten.gemeenten;
  const gekozen = gekozenCode ? rijen.find((r) => r.code === gekozenCode) ?? null : null;
  const kies = (code: string, opties: { zoom?: boolean; focus?: boolean } = {}) => {
    const nieuw = new URLSearchParams(params);
    nieuw.set('gemeente', code);
    setParams(nieuw, { replace: true, preventScrollReset: true });
    if (opties.zoom) setZoomVerzoek((n) => n + 1);
    if (opties.focus) requestAnimationFrame(() => koptRef.current?.focus());
  };

  return (
    <KaartEnTabel
      stroom={stroom}
      bestand={gemeenten}
      rijen={rijen}
      gekozen={gekozen}
      onKies={kies}
      zoomVerzoek={zoomVerzoek}
      koptRef={koptRef}
    />
  );
}

function KaartEnTabel({
  stroom,
  bestand,
  rijen,
  gekozen,
  onKies,
  zoomVerzoek,
  koptRef,
}: {
  stroom: Stroom;
  bestand: GemeentenBestand;
  rijen: StroomRij[];
  gekozen: StroomRij | null;
  onKies: (code: string, opties?: { zoom?: boolean; focus?: boolean }) => void;
  zoomVerzoek: number;
  koptRef: React.RefObject<HTMLHeadingElement>;
}) {
  const id = stroom.id;
  const peiljaar = bestand.kop.peiljaar;
  const waarden = useMemo(() => rijen.map((r) => waarde(r, id)).filter((w): w is number => w !== null), [rijen, id]);
  const grenzen = useMemo(() => klasseGrenzen(waarden), [waarden]);
  const perCode = useMemo(() => new Map(rijen.map((r) => [r.code, r])), [rijen]);
  const kleurPerCode = useMemo(
    () => (code: string) => {
      const k = klasseVan(waarde(perCode.get(code) ?? ({} as StroomRij), id), grenzen);
      return k === null ? KLEUR_GEEN : KLEUREN[k];
    },
    [perCode, grenzen, id],
  );
  const tipPerCode = useMemo(
    () => (code: string) => {
      const r = perCode.get(code);
      if (!r) return null;
      const w = waarde(r, id);
      return { naam: r.naam, tekst: `${stroom.naam}: ${w === null ? 'geen cijfer' : `${kgTekst(w)} kg per inwoner`}` };
    },
    [perCode, id, stroom.naam],
  );
  const titel = `Kaart van Nederland: ${stroom.naam.toLowerCase()} in kilo per inwoner per gemeente, ${peiljaar}.${gekozen ? ` Gekozen: ${gekozen.naam}.` : ''}`;

  return (
    <>
      <div className="stromen-kaartlaag">
        <div className="stapel kaart-kolom">
          <div className="kaart-vak" role="region" aria-label="Kaart">
            <RestafvalKaart
              indicator="restafval"
              geselecteerd={gekozen?.code ?? null}
              onSelecteer={(code) => onKies(code)}
              zoomVerzoek={zoomVerzoek}
              titel={titel}
              kleurPerCode={kleurPerCode}
              tipPerCode={tipPerCode}
            />
          </div>
          <Legenda rijen={rijen} grenzen={grenzen} stroom={stroom} peiljaar={peiljaar} />
          <p className="klein muted">
            Zonder muis: kies een gemeente met het zoekveld of in de <a href={`#tabel-${id}`}>tabel</a>. De zoomknoppen werken met het toetsenbord.
          </p>
        </div>
        <GemeentePaneel stroom={stroom} bestand={bestand} rijen={rijen} gekozen={gekozen} koptRef={koptRef} />
      </div>
      <Tabel stroom={stroom} bestand={bestand} rijen={rijen} gekozen={gekozen?.code ?? null} onKies={(c) => onKies(c, { zoom: true, focus: true })} />
    </>
  );
}

function Legenda({ rijen, grenzen, stroom, peiljaar }: { rijen: StroomRij[]; grenzen: number[]; stroom: Stroom; peiljaar: number }) {
  const aantal = [0, 0, 0, 0, 0];
  let zonder = 0;
  for (const r of rijen) {
    const k = klasseVan(waarde(r, stroom.id), grenzen);
    if (k === null) zonder++;
    else aantal[k]++;
  }
  const tekst = (i: number) =>
    i === 0 ? `minder dan ${kgTekst(grenzen[0])} kg` : i === 4 ? `${kgTekst(grenzen[3])} kg of meer` : `${kgTekst(grenzen[i - 1])} tot ${kgTekst(grenzen[i])} kg`;
  return (
    <figure className="legenda" aria-labelledby={`legenda-${stroom.id}`}>
      <figcaption id={`legenda-${stroom.id}`}>
        <strong>{stroom.naam}</strong>
        <span className="muted"> per gemeente, kilo per inwoner per jaar, {peiljaar}</span>
      </figcaption>
      <ul>
        {KLEUREN.map((kleur, i) => (
          <li key={kleur}>
            <span className="vlak" style={{ background: kleur }} aria-hidden="true" />
            <span>{tekst(i)}</span>
            <span className="aantal">{aantal[i]} gem.</span>
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
      <p className="klein muted">Donkerder is meer. De klassen zijn gelijk verdeeld over het aantal gemeenten, op twee significante cijfers afgerond.</p>
    </figure>
  );
}

function GemeentePaneel({
  stroom,
  bestand,
  rijen,
  gekozen,
  koptRef,
}: {
  stroom: Stroom;
  bestand: GemeentenBestand;
  rijen: StroomRij[];
  gekozen: StroomRij | null;
  koptRef: React.RefObject<HTMLHeadingElement>;
}) {
  const id = stroom.id;
  const heffingenPad = useHeffingenPad(gekozen?.code ?? null, gekozen?.naam, id === 'restafval');
  const gemiddeldeGemeenten = gewogenGemiddelde(rijen, id);
  const jaarIndex = landelijk.jaren.indexOf(bestand.kop.peiljaar);
  const landelijkKg = jaarIndex >= 0 ? landelijk.reeksen[id].kg[jaarIndex] : null;

  if (!gekozen) {
    return (
      <aside className="stapel gemeente-paneel" aria-labelledby={`paneel-${id}`}>
        <section className="kaart">
          <h3 id={`paneel-${id}`} ref={koptRef} tabIndex={-1}>
            Kies een gemeente
          </h3>
          <p className="muted">Tik op de kaart, zoek in de tabel hieronder of kies een gemeente met het zoekveld. U ziet dan het cijfer naast het landelijke gemiddelde.</p>
          <p className="klein muted">
            Landelijk {bestand.kop.peiljaar}: {landelijkKg === null ? 'geen cijfer' : `${kgTekst(landelijkKg)} kg per inwoner`} (CBS, tabel {landelijk.bron.tabelId}).
          </p>
        </section>
      </aside>
    );
  }
  const w = waarde(gekozen, id);
  const plaats = plaatsVanHoogNaarLaag(gekozen, rijen, id);
  const verschil = w !== null && landelijkKg !== null ? w - landelijkKg : null;
  return (
    <aside className="stapel gemeente-paneel" aria-labelledby={`paneel-${id}`}>
      <section className="kaart">
        <h3 id={`paneel-${id}`} ref={koptRef} tabIndex={-1}>
          {gekozen.naam}
        </h3>
        <p className="klein muted">
          {gekozen.provincie ?? 'provincie onbekend'}
          {gekozen.inwoners ? ` · ${getal(gekozen.inwoners)} inwoners` : ''}
        </p>
        <div className="tegels" aria-live="polite">
          <Tegel
            hero
            label={`${stroom.naam} ${bestand.kop.peiljaar}`}
            waarde={w === null ? 'geen cijfer' : `${kgTekst(w)} kg`}
            toelichting={w === null ? 'CBS publiceert geen cijfer voor deze gemeente' : 'per inwoner'}
          />
          <Tegel
            label="Landelijk"
            waarde={landelijkKg === null ? '–' : `${kgTekst(landelijkKg)} kg`}
            toelichting={
              verschil === null
                ? `CBS, ${bestand.kop.peiljaar}`
                : `CBS, ${bestand.kop.peiljaar}; deze gemeente zit er ${verschil === 0 ? 'precies op' : `${kgTekst(Math.abs(verschil))} kg ${verschil > 0 ? 'boven' : 'onder'}`}`
            }
          />
        </div>
        <ul className="vergelijking">
          {plaats && (
            <li>
              Plaats {plaats.plaats} van {plaats.van} gemeenten, van hoog naar laag.
            </li>
          )}
          {gemiddeldeGemeenten !== null && <li>Gemiddelde van alle gemeenten, gewogen naar inwoners: {kgTekst(gemiddeldeGemeenten)} kg.</li>}
        </ul>
        <p className="klein">
          <Link className="link-pijl" to={`/restafvalkaart?gemeente=${gekozen.code}`}>
            Alle stromen van {gekozen.naam} op de Restafvalkaart
          </Link>
        </p>
        {id === 'restafval' && (
          <p className="klein">
            {heffingenPad ? (
              <Link className="link-pijl" to={heffingenPad}>
                Heffingenscan voor {gekozen.naam}
              </Link>
            ) : (
              <span className="muted">Link naar de Heffingenscan laden…</span>
            )}
          </p>
        )}
      </section>
    </aside>
  );
}

function Tabel({
  stroom,
  bestand,
  rijen,
  gekozen,
  onKies,
}: {
  stroom: Stroom;
  bestand: GemeentenBestand;
  rijen: StroomRij[];
  gekozen: string | null;
  onKies: (code: string) => void;
}) {
  const id = stroom.id;
  const zoekId = useId();
  const [zoek, setZoek] = useState('');
  const [provincie, setProvincie] = useState('alle');
  const [sorteer, setSorteer] = useState<{ op: Sorteer; oplopend: boolean }>({ op: 'waarde', oplopend: false });
  const [alles, setAlles] = useState(false);
  const provincies = useMemo(() => [...new Set(rijen.map((r) => r.provincie).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, 'nl')), [rijen]);
  const lijst = useMemo(() => {
    const gefilterd = zoekRijen(zoek, rijen).filter((r) => provincie === 'alle' || r.provincie === provincie);
    return sorteerRijen(gefilterd, id, sorteer.op, sorteer.oplopend);
  }, [zoek, provincie, rijen, id, sorteer]);
  const ingekort = !alles && !zoek.trim() && provincie === 'alle' && lijst.length > EERSTE_RIJEN;
  const zichtbaar = ingekort ? lijst.slice(0, EERSTE_RIJEN) : lijst;
  const peiljaar = bestand.kop.peiljaar;

  const download = () => {
    const blob = new Blob(['﻿', naarCsv(lijst, id, peiljaar)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}-per-gemeente-${peiljaar}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const kop = (op: Sorteer, label: string, klasse = '') => {
    const actief = sorteer.op === op;
    return (
      <th scope="col" className={klasse || undefined} aria-sort={actief ? (sorteer.oplopend ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => setSorteer({ op, oplopend: actief ? !sorteer.oplopend : op === 'naam' })}>
          {label}
          <span aria-hidden="true">{actief ? (sorteer.oplopend ? ' ▲' : ' ▼') : ''}</span>
        </button>
      </th>
    );
  };

  return (
    <div className="stromen-tabel" id={`tabel-${id}`}>
      <h3>Alle gemeenten in een tabel</h3>
      <p className="klein muted">Dezelfde cijfers als de kaart, in kilo per inwoner. Kies een gemeente om het cijfer naast het landelijke gemiddelde te zien.</p>
      <div className="tabel-bediening">
        <div className="veld">
          <label htmlFor={zoekId}>Zoek een gemeente of provincie</label>
          <div className="invoer">
            <input id={zoekId} type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <KeuzeVeld
          label="Provincie"
          waarde={provincie}
          onChange={setProvincie}
          opties={[{ waarde: 'alle', label: 'Alle provincies' }, ...provincies.map((p) => ({ waarde: p, label: p }))]}
        />
        <button type="button" onClick={download}>
          Download als CSV
        </button>
        <p className="klein muted" aria-live="polite">
          {ingekort ? `${zichtbaar.length} van ${lijst.length} gemeenten` : `${lijst.length} ${lijst.length === 1 ? 'gemeente' : 'gemeenten'}`}
        </p>
      </div>
      <div className="kaarttabel">
        <table>
          <caption>
            {stroom.naam} per gemeente, {peiljaar}, kilo per inwoner. Bron: CBS, tabel {bestand.kop.bron.tabelId}, opgehaald op {datum(bestand.kop.opgehaald)}.
          </caption>
          <thead>
            <tr>
              {kop('naam', 'Gemeente')}
              <th scope="col" className="kol-breed">
                Provincie
              </th>
              {kop('inwoners', 'Inwoners', 'num kol-breed')}
              {kop('waarde', 'Kg per inwoner', 'num')}
            </tr>
          </thead>
          <tbody>
            {zichtbaar.map((r) => {
              const w = waarde(r, id);
              return (
                <tr key={r.code} aria-current={r.code === gekozen ? 'true' : undefined}>
                  <th scope="row">
                    <button type="button" onClick={() => onKies(r.code)} aria-label={`${r.naam} tonen op de kaart`}>
                      {r.naam}
                    </button>
                    <span className="tabel-sub" aria-hidden="true">
                      {r.provincie ?? ''}
                    </span>
                  </th>
                  <td className="kol-breed">{r.provincie ?? '–'}</td>
                  <td className="num kol-breed">{r.inwoners ? getal(r.inwoners) : '–'}</td>
                  <td className="num">{w === null ? 'geen cijfer' : kgTekst(w)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ingekort && (
        <div className="knoppen tabel-meer">
          <button type="button" onClick={() => setAlles(true)}>
            Toon alle {lijst.length} gemeenten
          </button>
        </div>
      )}
      <p className="klein muted">
        Inwonertal en provincie zoals op de Restafvalkaart. Het cijfer per gemeente is die van {peiljaar}; het landelijke cijfer in dit blok is dat van hetzelfde jaar.
      </p>
    </div>
  );
}
