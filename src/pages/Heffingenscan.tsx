import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MeerWeten } from '../components/contact/MeerWeten';
import { GestapeldeStaafGrafiek } from '../components/grafiek/Grafieken';
import { GemeenteZoeker } from '../components/heffingenscan/GemeenteZoeker';
import { MethodeBronnen } from '../components/heffingenscan/MethodeBronnen';
import { WetsstatusBlok, euroKort, mln } from '../components/heffingenscan/Onderdelen';
import { bewaarBronUitUrl } from '../components/heffingenscan/bron';
import { Inklapbaar, useInklapBijPrintEnAnker } from '../components/rekenen/Inklap';
import { Kaart, PaginaKop, Tegel } from '../components/ui';
import { AANVRAAG_PAD, aanbodPrijzen } from '../data/heffingen-aanbod';
import { heffingGemeenten, heffingGemeentenBron } from '../data/heffingen-gemeenten';
import { PEILDATUM, PRIJSPEIL, heffingPaden, heffingStandaard } from '../data/heffingen-tarieven';
import { landelijkTotaal, naarSlug, overzichtRij, type OverzichtRij } from '../lib/calc/heffingen';
import { datum, euro, getal } from '../lib/format';
import { heffingenVoorbeeld, heffingenscanPad } from '../lib/heffingenVoorbeeld';
import '../components/heffingenscan/heffingenscan.css';

type Sleutel = 'naam' | 'provincie' | 'totaal2026' | 'totaal2035' | 'hh2026' | 'hh2035';
const KOLOMMEN: { sleutel: Sleutel; kop: string; num?: boolean; smalWeg?: boolean }[] = [
  { sleutel: 'naam', kop: 'Gemeente' },
  { sleutel: 'provincie', kop: 'Provincie', smalWeg: true },
  { sleutel: 'totaal2026', kop: 'Heffingen 2026', num: true, smalWeg: true },
  { sleutel: 'totaal2035', kop: 'Heffingen 2035', num: true },
  { sleutel: 'hh2026', kop: 'Per huishouden 2026', num: true, smalWeg: true },
  { sleutel: 'hh2035', kop: 'Per huishouden 2035', num: true },
];
const WAARDE: Record<Sleutel, (r: OverzichtRij) => string | number> = {
  naam: (r) => naarSlug(r.gemeente.naam),
  provincie: (r) => r.gemeente.provincie ?? '',
  totaal2026: (r) => r.totaal2026,
  totaal2035: (r) => r.totaal2035,
  hh2026: (r) => r.perHuishouden2026,
  hh2035: (r) => r.perHuishouden2035,
};
const EERSTE_TONEN = 40;

export function Heffingenscan() {
  useInklapBijPrintEnAnker();
  useEffect(() => {
    document.title = 'Heffingenscan restafval: wat kosten de heffingen uw gemeente?';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'Wat kosten de afvalstoffenbelasting en de CO2-heffing op afvalverbranding uw gemeente tot 2035? Kies uw gemeente en zie het in totaal en per huishouden. Gratis, indicatief, prijspeil 2026.',
    );
    bewaarBronUitUrl(window.location.search);
  }, []);

  const land = useMemo(() => landelijkTotaal(heffingGemeenten), []);
  const rijen = useMemo(() => heffingGemeenten.map((g) => overzichtRij(g)), []);
  const l26 = land.jaren[0];
  const l30 = land.jaren.find((j) => j.jaar === 2030)!;
  const l35 = land.jaren[land.jaren.length - 1];
  const pad = heffingPaden[heffingStandaard.pad];
  const v = heffingenVoorbeeld.voorbeeld;
  const metNascheiding = heffingGemeenten.filter((g) => g.nascheiding !== null).length;

  return (
    <div className="hs-pagina stapel">
      <PaginaKop titel="Heffingenscan restafval">
        Wat kosten de afvalstoffenbelasting en de CO2-heffing op afvalverbranding uw gemeente tot 2035? Kies uw gemeente en zie het in totaal en per huishouden. De scan is gratis en vraagt geen account.
      </PaginaKop>

      <GemeenteZoeker gemeenten={heffingGemeenten} />

      <Kaart
        titel="Alle gemeenten samen"
        sub={`${heffingGemeentenBron.aantalGemeenten} gemeenten, ${pad.naam} (${pad.status}), prijspeil ${PRIJSPEIL}`}
      >
        <div className="stapel">
          <div className="tegels hs-tegels" role="group" aria-label="Heffingen van alle gemeenten samen in 2026, 2030 en 2035">
            <Tegel label="In 2026" waarde={euro(l26.totaal / 1e6, 0) + ' mln'} toelichting={`${euro(l26.perHuishouden)} per huishouden per jaar`} />
            <Tegel label="In 2030" waarde={euro(l30.totaal / 1e6, 0) + ' mln'} toelichting={`${euro(l30.perHuishouden)} per huishouden per jaar`} />
            <Tegel label="In 2035" waarde={euro(l35.totaal / 1e6, 0) + ' mln'} toelichting={`${euro(l35.perHuishouden)} per huishouden per jaar`} hero />
          </div>
          <div className="notitie" role="note" aria-label="Kanttekening bij het landelijke beeld">
            <p>
              <strong>Dit is een bovengrens.</strong> De scan rekent met al het fijne huishoudelijk restafval dat CBS per gemeente meldt. Bij {metNascheiding} gemeenten gaat een deel via nascheiding, en wordt dus niet verbrand. Grof restafval en
              bedrijfsafval tellen niet mee. Over 2026–2035 samen komt het op {mln(land.cumulatief)}.
            </p>
          </div>
          <GestapeldeStaafGrafiek
            titel={`Heffingen van alle gemeenten samen per jaar, ${pad.naam}: in 2026 ${euro(l26.totaal / 1e6)} miljoen euro, in 2030 ${euro(l30.totaal / 1e6)} miljoen en in 2035 ${euro(l35.totaal / 1e6)} miljoen. Afvalstoffenbelasting en CO2-heffing gestapeld.`}
            labels={land.jaren.map((j) => j.jaar)}
            reeksen={[
              { naam: 'Afvalstoffenbelasting', waarden: land.jaren.map((j) => j.asb) },
              { naam: 'CO2-heffing', waarden: land.jaren.map((j) => j.co2) },
            ]}
            formatY={euroKort}
          />
        </div>
      </Kaart>

      <WetsstatusBlok />

      <section className="hs-voorbeeld" aria-labelledby="hs-voorbeeld-kop">
        <h2 id="hs-voorbeeld-kop">Voorbeeld: {v.naam}</h2>
        <p>
          {v.naam} heeft {getal(v.inwoners)} inwoners. De heffingen op restafval stijgen daar van {euro(v.jaren[0].totaal)} in 2026 naar {euro(v.jaren[2].totaal)} in 2035, van {euro(v.jaren[0].perHuishouden)} naar{' '}
          {euro(v.jaren[2].perHuishouden)} per huishouden. Het aandeel van de CO2-heffing groeit van {Math.round((v.jaren[0].aandeelCo2 ?? 0) * 100)} % naar {Math.round((v.jaren[2].aandeelCo2 ?? 0) * 100)} %.
        </p>
        <p>
          <Link className="link-pijl" to={heffingenscanPad(v.slug)}>
            Bekijk de scan voor {v.naam} <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>

      <Kaart titel="Alle gemeenten" sub="Zoek, sorteer en open de scan van uw gemeente.">
        <Overzichtstabel rijen={rijen} />
      </Kaart>

      <Inklapbaar id="methode" titel="Methode en bronnen" sub={`tarieventabel, aannames en bronnen, peildatum ${datum(PEILDATUM)}`}>
        <MethodeBronnen />
      </Inklapbaar>

      <MeerWeten id="hs-meer" kop="Betaalt uw gemeente niet te veel?">
        <p>
          De scan rekent met CBS-cijfers en landelijke factoren. KplusV maakt voor uw gemeente een rapport met uw eigen tonnage en uw verwerkingscontract, en loopt het met u door.
        </p>
        <ul className="opsomming">
          <li>
            Rapport voor één gemeente: <strong>{euro(aanbodPrijzen.rapport)}</strong>
          </li>
          <li>
            Toelichting en sparringssessie: <strong>{euro(aanbodPrijzen.toelichtingExtra)} extra</strong>
          </li>
          <li>Meerdere gemeenten: maatwerk, op aanvraag</li>
        </ul>
        <p className="klein muted">Alle bedragen {aanbodPrijzen.btwTekst}.</p>
        <div className="knoppen">
          <Link className="knop cta" to={AANVRAAG_PAD}>
            Rapport aanvragen
          </Link>
        </div>
      </MeerWeten>
    </div>
  );
}

function Overzichtstabel({ rijen }: { rijen: OverzichtRij[] }) {
  const [zoek, setZoek] = useState('');
  const [sleutel, setSleutel] = useState<Sleutel>('naam');
  const [oplopend, setOplopend] = useState(true);
  const [alles, setAlles] = useState(false);

  const gefilterd = useMemo(() => {
    const t = naarSlug(zoek);
    const lijst = t
      ? rijen.filter((r) => {
          const g = r.gemeente;
          return [g.slug, ...g.aliassen, naarSlug(g.provincie ?? '')].some((k) => k.includes(t));
        })
      : rijen;
    const w = WAARDE[sleutel];
    return [...lijst].sort((a, b) => {
      const x = w(a);
      const y = w(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'nl');
      return oplopend ? c : -c;
    });
  }, [rijen, zoek, sleutel, oplopend]);
  const getoond = alles || zoek ? gefilterd : gefilterd.slice(0, EERSTE_TONEN);

  function sorteer(s: Sleutel) {
    if (s === sleutel) setOplopend((o) => !o);
    else {
      setSleutel(s);
      setOplopend(s === 'naam' || s === 'provincie');
    }
  }

  return (
    <div className="stapel">
      <div className="veld">
        <label htmlFor="hs-tabelzoek">Zoek in de tabel</label>
        <div className="invoer" style={{ maxWidth: 380 }}>
          <input id="hs-tabelzoek" type="search" autoComplete="off" value={zoek} onChange={(e) => setZoek(e.target.value)} aria-describedby="hs-tabel-status" placeholder="Gemeente of provincie" />
        </div>
      </div>
      <p className="klein muted" id="hs-tabel-status" role="status" aria-live="polite" style={{ margin: 0 }}>
        {gefilterd.length === 0 ? 'Geen gemeenten gevonden.' : `${getoond.length} van ${gefilterd.length} gemeenten getoond, gesorteerd op ${KOLOMMEN.find((k) => k.sleutel === sleutel)!.kop.toLowerCase()} (${oplopend ? 'oplopend' : 'aflopend'}).`}
      </p>
      <div className="tabel-container hs-overzicht" tabIndex={0} role="region" aria-label="Tabel met alle gemeenten, horizontaal scrollbaar">
        <table>
          <caption>
            Heffingen op restafval per gemeente (afvalstoffenbelasting en CO2-heffing), {heffingPaden[heffingStandaard.pad].naam}, prijspeil {PRIJSPEIL}. Bovengrens: alleen fijn restafval, alles verbrand. “Nascheiding” betekent dat CBS voor deze
            gemeente nascheiding meldt.
          </caption>
          <thead>
            <tr>
              {KOLOMMEN.map((k) => (
                <th key={k.sleutel} scope="col" className={`${k.num ? 'num' : ''}${k.smalWeg ? ' hs-smal-weg' : ''}`} aria-sort={k.sleutel === sleutel ? (oplopend ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="hs-sorteer" onClick={() => sorteer(k.sleutel)}>
                    {k.kop}
                    <span aria-hidden="true">{k.sleutel === sleutel ? (oplopend ? ' ▲' : ' ▼') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getoond.map((r) => (
              <tr key={r.gemeente.code}>
                <th scope="row">
                  <Link to={heffingenscanPad(r.gemeente.slug)}>{r.gemeente.naam}</Link>
                  {r.gemeente.nascheiding !== null && <span className="hs-nascheiding">nascheiding</span>}
                </th>
                <td className="hs-smal-weg">{r.gemeente.provincie ?? ''}</td>
                <td className="num hs-smal-weg">{euro(r.totaal2026)}</td>
                <td className="num">{euro(r.totaal2035)}</td>
                <td className="num hs-smal-weg">{euro(r.perHuishouden2026)}</td>
                <td className="num">{euro(r.perHuishouden2035)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!alles && !zoek && gefilterd.length > EERSTE_TONEN && (
        <div className="knoppen">
          <button type="button" onClick={() => setAlles(true)}>
            Toon alle {gefilterd.length} gemeenten
          </button>
        </div>
      )}
    </div>
  );
}
