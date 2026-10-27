import '../components/kaart/inhoud.css';
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RestafvalKaart } from '../components/kaart/RestafvalKaart';
import { Legenda } from '../components/kaart/Legenda';
import { Badge, Chips, Kaart, KeuzeVeld, PaginaKop, Tegel } from '../components/ui';
import { afvalBron, gemeenten, grenzenBron, type GemeenteAfval } from '../data/gemeenten';
import {
  gewogenGemiddelde,
  indicatoren,
  naarCsv,
  rangVan,
  vindGemeente,
  waardeVan,
  zoekGemeenten,
  zoekUitkomst,
  type IndicatorId,
} from '../lib/kaartdata';
import { datum, getal, procent } from '../lib/format';

const INDICATOR_IDS: IndicatorId[] = ['restafval', 'scheidingsPct', 'totaal'];
const STANDAARD = 'GM0363'; // Amsterdam: grootste gemeente, herkenbaar startpunt.
const EERSTE_RIJEN = 25;
/** Onder deze hoeveelheid gescheiden ingezameld PMD (kg per inwoner) is nascheiding waarschijnlijk. */
const PMD_DREMPEL = 2;

const landelijk = {
  restafval: gewogenGemiddelde(gemeenten, 'restafval'),
  scheidingsPct: gewogenGemiddelde(gemeenten, 'scheidingsPct'),
  totaal: gewogenGemiddelde(gemeenten, 'totaal'),
};

/** Breed scherm: details standaard open. Alleen bij de eerste weergave bepaald. */
const isBreed = () => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 900px)').matches;

export default function Restafvalkaart() {
  const [params, setParams] = useSearchParams();
  const indicator = (INDICATOR_IDS.includes(params.get('toon') as IndicatorId) ? params.get('toon') : 'restafval') as IndicatorId;
  const gevraagd = params.get('gemeente');
  const gevonden = gevraagd ? vindGemeente(gevraagd, gemeenten) : undefined;
  const gekozen = gevonden ?? vindGemeente(STANDAARD, gemeenten)!;
  const [zoomVerzoek, setZoomVerzoek] = useState(() => (gevonden ? 1 : 0));
  const paneelRef = useRef<HTMLHeadingElement>(null);

  const zet = (wijziging: Record<string, string>) => {
    const nieuw = new URLSearchParams(params);
    for (const [k, v] of Object.entries(wijziging)) nieuw.set(k, v);
    setParams(nieuw, { replace: true });
  };
  const kies = (code: string, opties: { zoom?: boolean; focus?: boolean } = {}) => {
    zet({ gemeente: code });
    if (opties.zoom) setZoomVerzoek((n) => n + 1);
    if (opties.focus) requestAnimationFrame(() => paneelRef.current?.focus());
  };
  const ind = indicatoren[indicator];
  const waarde = waardeVan(gekozen, indicator);

  return (
    <>
      <PaginaKop
        titel="Restafvalkaart van Nederland"
        badges={
          <>
            <Badge soort="thema">CBS-cijfers {afvalBron.peiljaar}</Badge>
            <Badge>{afvalBron.status.label === 'definitief' ? 'Definitief' : `Cijfers ${afvalBron.status.label}`}</Badge>
          </>
        }
      >
        Restafval en gescheiden inzameling per gemeente, voor alle {gemeenten.length} gemeenten. Kies een gemeente op de kaart, zoek op
        naam of gebruik de tabel.
      </PaginaKop>
      <p className="bronregel klein">
        Bron: CBS,{' '}
        <a href={afvalBron.bron.url} target="_blank" rel="noopener noreferrer">
          tabel {afvalBron.bron.tabelId}
          <span className="visueel-verborgen"> (opent CBS StatLine in nieuw tabblad)</span>
        </a>
        , peiljaar {afvalBron.peiljaar} ({afvalBron.status.label}), opgehaald {datum(afvalBron.opgehaald)}.{' '}
        <a href="#bron">Rekenwijze en bronnen</a>
      </p>

      {gevraagd && !gevonden && (
        <div className="notitie sectie" role="status">
          De gemeente “{gevraagd}” uit de link bestaat niet in de CBS-cijfers over {afvalBron.peiljaar}. U ziet nu {gekozen.naam}. Zoek hieronder
          een andere gemeente; na een herindeling heeft een gemeente soms een nieuwe naam of code.
        </div>
      )}

      <div className="kaart-bediening sectie">
        <Chips<IndicatorId>
          label="Kleur de kaart op"
          waarde={indicator}
          onChange={(id) => zet({ toon: id })}
          opties={INDICATOR_IDS.map((id) => ({ waarde: id, label: indicatoren[id].label }))}
        />
        <ZoekGemeente onKies={(g) => kies(g.code, { zoom: true, focus: true })} />
      </div>

      <div className="kaart-layout sectie">
        <div className="stapel kaart-kolom">
          <div className="kaart-vak" role="region" aria-label="Kaart">
            <RestafvalKaart
              gemeenten={gemeenten}
              indicator={indicator}
              geselecteerd={gekozen.code}
              onSelecteer={(code) => kies(code)}
              zoomVerzoek={zoomVerzoek}
              titel={`Kaart van Nederland: ${ind.label.toLowerCase()} per gemeente, ${afvalBron.peiljaar}. Gekozen: ${gekozen.naam}.`}
            />
          </div>
          <p className="kaart-onderschrift">
            <span aria-live="polite">
              Gekozen: <strong>{gekozen.naam}</strong>, {ind.kort.toLowerCase()}{' '}
              {waarde === null ? 'geen cijfer' : `${getal(waarde, ind.decimalen)}${ind.eenheid === '%' ? ' %' : ` ${ind.eenheid} per inwoner`}`}.{' '}
              <a href="#paneel-titel" className="alleen-smal">
                Naar de kerncijfers
              </a>
            </span>
            <span className="muted">
              Zonder muis: kies een gemeente met het zoekveld of in de <a href="#tabel">tabel</a>. De zoomknoppen werken met het toetsenbord.
            </span>
          </p>
          <Kaart>
            <Legenda gemeenten={gemeenten} indicator={indicator} />
          </Kaart>
        </div>
        <GemeentePaneel gemeente={gekozen} indicator={indicator} kopRef={paneelRef} />
      </div>

      <Tabelweergave indicator={indicator} gekozen={gekozen.code} onKies={(code) => kies(code, { zoom: true, focus: true })} />

      <Bronblok />
    </>
  );
}

/* ---------- Zoeken op gemeente ---------- */
function ZoekGemeente({ onKies }: { onKies: (g: GemeenteAfval) => void }) {
  const id = useId();
  const [term, setTerm] = useState('');
  const [melding, setMelding] = useState('');
  const treffers = useMemo(() => (term.trim().length >= 2 ? zoekGemeenten(term, gemeenten) : []), [term]);
  const exact = vindGemeente(term, gemeenten);

  const kies = (g: GemeenteAfval) => {
    onKies(g);
    setTerm('');
    setMelding(`${g.naam} gekozen.`);
  };

  return (
    <form
      className="zoek-gemeente"
      role="search"
      aria-label="Gemeente zoeken"
      onSubmit={(e) => {
        e.preventDefault();
        const t = term.trim();
        if (!t) {
          setMelding('Typ eerst een gemeentenaam.');
          return;
        }
        const uitkomst = zoekUitkomst(t, gemeenten);
        if (uitkomst.soort === 'gevonden') kies(uitkomst.gemeente);
        else if (uitkomst.soort === 'meerdere')
          setMelding(`${uitkomst.treffers.length} gemeenten gevonden voor “${t}”. Kies er een uit de lijst.`);
        else setMelding(`Geen gemeente gevonden voor “${t}”. Controleer de spelling of zoek op een deel van de naam.`);
      }}
    >
      <div className="veld">
        <label htmlFor={id}>Zoek een gemeente</label>
        <div className="rij">
          <div className="invoer">
            <input
              id={id}
              type="search"
              value={term}
              autoComplete="off"
              placeholder="Bijv. Utrecht, Den Bosch of GM0344"
              aria-describedby={`${id}-melding`}
              onChange={(e) => {
                setTerm(e.target.value);
                setMelding('');
              }}
            />
          </div>
          <button type="submit" className="primair">
            Toon
          </button>
        </div>
      </div>
      {treffers.length > 0 && !(exact && treffers.length === 1) && (
        <ul className="suggesties" aria-label="Gevonden gemeenten">
          {treffers.map((g) => (
            <li key={g.code}>
              <button type="button" onClick={() => kies(g)}>
                <span>{g.naam}</span>
                <span className="muted">{g.provincie}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p id={`${id}-melding`} className="klein muted" aria-live="polite">
        {melding}
      </p>
    </form>
  );
}

/* ---------- Paneel met kerncijfers ---------- */
function verschilTekst(eigen: number | null, ander: number | null, eenheid: string, decimalen = 0) {
  if (eigen === null || ander === null) return null;
  const d = eigen - ander;
  if (Math.abs(d) < 0.5 * 10 ** -decimalen) return 'gelijk aan';
  return `${getal(Math.abs(d), decimalen)}${eenheid} ${d > 0 ? 'meer dan' : 'minder dan'}`;
}

function GemeentePaneel({
  gemeente: g,
  indicator,
  kopRef,
}: {
  gemeente: GemeenteAfval;
  indicator: IndicatorId;
  kopRef: RefObject<HTMLHeadingElement>;
}) {
  const [stromenOpen, setStromenOpen] = useState(isBreed);
  const rang = rangVan(g, gemeenten, indicator);
  const ind = indicatoren[indicator];
  const tovLand = verschilTekst(g.restafval, landelijk.restafval, ' kg');
  const tovVorig = verschilTekst(g.restafval, g.restafvalVorigJaar, ' kg', 1);
  const scheidingTov = verschilTekst(g.scheidingsPct, landelijk.scheidingsPct, ' procentpunt');
  const nascheidingWaarschijnlijk = g.pmd < PMD_DREMPEL;

  const stromen: [string, number | null][] = [
    ['Fijn restafval', g.fijnRest],
    ['Grof restafval', g.grofRest],
    ['Gft', g.gft],
    ['Papier en karton', g.papier],
    ['PMD (plastic, metaal, drankenkartons)', g.pmd],
    ['Glas', g.glas],
    ['Textiel', g.textiel],
  ];
  const max = Math.max(...stromen.map(([, w]) => w ?? 0), 1);

  return (
    <aside className="stapel gemeente-paneel" aria-labelledby="paneel-titel">
      <section className="kaart">
        <div className="kaart-kop">
          <div>
            <h2 id="paneel-titel" ref={kopRef} tabIndex={-1}>
              {g.naam}
            </h2>
            <div className="sub">
              {g.provincie ?? 'Provincie onbekend'} · {g.inwoners ? `${getal(g.inwoners)} inwoners` : 'inwonertal onbekend'} · {g.code}
            </div>
          </div>
        </div>
        <div className="tegels" aria-live="polite">
          <Tegel label="Restafval" waarde={`${getal(g.restafval)} kg`} toelichting={`per inwoner, fijn + grof, ${afvalBron.peiljaar}`} hero />
          <Tegel
            label="Gescheiden ingezameld"
            waarde={g.scheidingsPct === null ? 'geen cijfer' : procent(g.scheidingsPct, 0)}
            toelichting="bij inzameling; nascheiding telt niet mee"
          />
          <Tegel label="Totaal huishoudelijk afval" waarde={g.totaal === null ? 'geen cijfer' : `${getal(g.totaal)} kg`} toelichting="per inwoner" />
          <Tegel
            label="Restafval in ton"
            waarde={g.inwoners ? getal((g.restafval * g.inwoners) / 1000) : '–'}
            toelichting="berekend: kg per inwoner × inwoners"
          />
        </div>
        <ul className="vergelijking">
          {tovLand && (
            <li>
              Restafval: {tovLand} het landelijk gemiddelde ({getal(landelijk.restafval ?? NaN)} kg).
            </li>
          )}
          {tovVorig && (
            <li>
              Restafval: {tovVorig} in {afvalBron.peiljaar - 1} ({getal(g.restafvalVorigJaar ?? NaN, 1)} kg).
            </li>
          )}
          {scheidingTov && (
            <li>
              Gescheiden inzameling: {scheidingTov} het landelijk gemiddelde ({procent(landelijk.scheidingsPct ?? NaN, 0)}).
            </li>
          )}
          {rang && (
            <li>
              {ind.label}: plaats {getal(rang.plaats)} van {getal(rang.van)} gemeenten (plaats 1 = {ind.lagerIsBeter ? 'laagste' : 'hoogste'} waarde).
            </li>
          )}
          {g.totaal === null && <li>CBS publiceert voor deze gemeente geen totaal; het scheidingspercentage ontbreekt daarom.</li>}
        </ul>
        {nascheidingWaarschijnlijk && g.scheidingsPct !== null && (
          <p className="notitie klein nascheiding">
            CBS registreert in {g.naam} {g.pmd === 0 ? 'geen' : `maar ${getal(g.pmd, 1)} kg`} apart ingezameld PMD per inwoner. Haalt de gemeente
            plastic en blik achteraf uit het restafval (nascheiding), dan telt CBS dat niet als gescheiden ingezameld. Het percentage valt dan
            lager uit dan in eigen rapportages van gemeente of verwerker.
          </p>
        )}
      </section>

      <details className="kaart inklap" open={stromenOpen} onToggle={(e) => setStromenOpen((e.target as HTMLDetailsElement).open)}>
        <summary>
          <span className="inklap-titel">Afvalstromen per inwoner</span>
          <span className="sub">kg per inwoner, {afvalBron.peiljaar}</span>
        </summary>
        <table className="samenstelling">
          <caption className="visueel-verborgen">Ingezamelde afvalstromen in {g.naam}</caption>
          <thead>
            <tr>
              <th scope="col">Stroom</th>
              <th scope="col" className="num">
                kg/inw
              </th>
            </tr>
          </thead>
          <tbody>
            {stromen.map(([naam, w]) => (
              <tr key={naam}>
                <th scope="row">
                  {naam}
                  <span className="balkje" style={{ width: `${((w ?? 0) / max) * 100}%` }} aria-hidden="true" />
                </th>
                <td className="num">{w === null ? '–' : getal(w, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <div className="aanbesteding-link">
        <h3>Aanbestedingen van {g.naam}</h3>
        <p>Zoek in het aanbestedingsarchief naar opdrachten van deze gemeente. Het archief is beschikbaar voor leden.</p>
        <Link className="link-pijl" to={`/aanbestedingsarchief?zoek=${encodeURIComponent(g.naam)}`}>
          Zoek “{g.naam}” in het aanbestedingsarchief
        </Link>
      </div>
    </aside>
  );
}

/* ---------- Tabel als toegankelijk alternatief ---------- */
type SorteerKolom = 'naam' | 'inwoners' | 'restafval' | 'scheidingsPct' | 'totaal';

function Tabelweergave({ indicator, gekozen, onKies }: { indicator: IndicatorId; gekozen: string; onKies: (code: string) => void }) {
  const provincies = useMemo(
    () => [...new Set(gemeenten.map((g) => g.provincie).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, 'nl')),
    [],
  );
  const [provincie, setProvincie] = useState('alle');
  const [alles, setAlles] = useState(false);
  const [sortering, setSortering] = useState<{ kolom: SorteerKolom; op: boolean }>({ kolom: indicator, op: indicatoren[indicator].lagerIsBeter });
  useEffect(() => setSortering({ kolom: indicator, op: indicatoren[indicator].lagerIsBeter }), [indicator]);

  const rijen = useMemo(() => {
    const lijst = gemeenten.filter((g) => provincie === 'alle' || g.provincie === provincie);
    const { kolom, op } = sortering;
    const waarde = (g: GemeenteAfval) => (kolom === 'naam' ? null : kolom === 'inwoners' ? g.inwoners : waardeVan(g, kolom));
    return [...lijst].sort((a, b) => {
      if (kolom === 'naam') return (op ? 1 : -1) * a.naam.localeCompare(b.naam, 'nl');
      const wa = waarde(a);
      const wb = waarde(b);
      if (wa === null) return 1;
      if (wb === null) return -1;
      return op ? wa - wb : wb - wa;
    });
  }, [provincie, sortering]);
  // Per provincie alles tonen (hooguit enkele tientallen); landelijk eerst de eerste 25.
  const ingekort = !alles && provincie === 'alle' && rijen.length > EERSTE_RIJEN;
  const zichtbaar = ingekort ? rijen.slice(0, EERSTE_RIJEN) : rijen;

  const downloadCsv = () => {
    const blob = new Blob(['﻿', naarCsv(rijen, afvalBron.peiljaar)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restafval-gemeenten-${afvalBron.peiljaar}${provincie === 'alle' ? '' : `-${provincie.toLowerCase().replace(/\s+/g, '-')}`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kop = (kolom: SorteerKolom, label: string, extra = 'num', kort?: string) => {
    const actief = sortering.kolom === kolom;
    return (
      <th scope="col" className={extra || undefined} aria-sort={actief ? (sortering.op ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => setSortering({ kolom, op: actief ? !sortering.op : kolom === 'naam' })}>
          {kort ? (
            <>
              <span className="kop-lang">{label}</span>
              <span className="kop-kort">{kort}</span>
            </>
          ) : (
            label
          )}
          <span aria-hidden="true">{actief ? (sortering.op ? ' ▲' : ' ▼') : ''}</span>
        </button>
      </th>
    );
  };

  return (
    <Kaart
      titel="Alle gemeenten in een tabel"
      className="sectie"
      id="tabel"
      sub="Zelfde cijfers als de kaart, in kilo per inwoner. Klik op een kolomkop om te sorteren."
    >
      <div className="tabel-bediening">
        <KeuzeVeld
          label="Provincie"
          waarde={provincie}
          onChange={setProvincie}
          opties={[{ waarde: 'alle', label: 'Alle provincies' }, ...provincies.map((p) => ({ waarde: p, label: p }))]}
        />
        <button type="button" onClick={downloadCsv}>
          Download als CSV
        </button>
        <p className="klein muted" aria-live="polite">
          {ingekort ? `${zichtbaar.length} van ${rijen.length} gemeenten` : `${rijen.length} gemeenten`}
        </p>
      </div>
      <div className="kaarttabel">
        <table>
          <caption>
            Huishoudelijk afval per gemeente, {afvalBron.peiljaar}, kilo per inwoner. Bron: CBS, tabel {afvalBron.bron.tabelId}.
          </caption>
          <thead>
            <tr>
              {kop('naam', 'Gemeente', '')}
              <th scope="col" className="kol-breed">
                Provincie
              </th>
              {kop('inwoners', 'Inwoners', 'num kol-breed')}
              {kop('restafval', 'Restafval kg', 'num', 'Rest kg')}
              {kop('scheidingsPct', 'Gescheiden %', 'num', 'Gesch. %')}
              {kop('totaal', 'Totaal kg')}
            </tr>
          </thead>
          <tbody>
            {zichtbaar.map((g) => (
              <tr key={g.code} aria-current={g.code === gekozen ? 'true' : undefined}>
                <th scope="row">
                  <button type="button" onClick={() => onKies(g.code)} aria-label={`${g.naam} tonen op de kaart`}>
                    {g.naam}
                  </button>
                  <span className="tabel-sub" aria-hidden="true">
                    {g.provincie ?? ''}
                  </span>
                </th>
                <td className="kol-breed">{g.provincie ?? '–'}</td>
                <td className="num kol-breed">{g.inwoners ? getal(g.inwoners) : '–'}</td>
                <td className="num">{getal(g.restafval)}</td>
                <td className="num">{g.scheidingsPct === null ? '–' : getal(g.scheidingsPct)}</td>
                <td className="num">{g.totaal === null ? '–' : getal(g.totaal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ingekort && (
        <div className="knoppen tabel-meer">
          <button type="button" onClick={() => setAlles(true)}>
            Toon alle {rijen.length} gemeenten
          </button>
        </div>
      )}
    </Kaart>
  );
}

/* ---------- Bron en peiljaar ---------- */
function Bronblok() {
  const c = afvalBron.controle;
  return (
    <Kaart titel="Bron, peiljaar en rekenwijze" className="sectie bronblok" id="bron">
      <p className="klein">
        Cijfers: CBS,{' '}
        <a href={afvalBron.bron.url} target="_blank" rel="noopener noreferrer">
          {afvalBron.bron.titel} ({afvalBron.bron.tabelId})
        </a>
        . Peiljaar {afvalBron.peiljaar}, {afvalBron.status.label}. Grenzen:{' '}
        <a href={grenzenBron.url} target="_blank" rel="noopener noreferrer">
          {grenzenBron.titel}
        </a>
        , {grenzenBron.uitgever}, {grenzenBron.licentie}.
      </p>
      <details className="inklap-tekst">
        <summary>Definities, rekenwijze en controle</summary>
        <dl>
          <dt>Status</dt>
          <dd>
            Tabel gewijzigd op {datum(afvalBron.bron.gewijzigd)}. {afvalBron.status.tekst}
          </dd>
          <dt>Inwoners</dt>
          <dd>
            CBS,{' '}
            <a href={afvalBron.bevolking.url} target="_blank" rel="noopener noreferrer">
              {afvalBron.bevolking.titel} ({afvalBron.bevolking.tabelId})
            </a>
            : {afvalBron.bevolking.onderwerp.toLowerCase()}. Gebruikt voor tonnen en gewogen gemiddelden.
          </dd>
          <dt>Gemeentegrenzen</dt>
          <dd>{grenzenBron.bewerking}</dd>
          <dt>Opgehaald</dt>
          <dd>
            Cijfers op {datum(afvalBron.opgehaald)}, grenzen op {datum(grenzenBron.opgehaald)}.
          </dd>
          <dt>Restafval</dt>
          <dd>
            {afvalBron.definities.restafval} Verbouwingsrestafval telt niet mee; CBS-nieuwsberichten tellen dat soms wel mee en komen daardoor een
            paar kilo hoger uit.
          </dd>
          <dt>Gescheiden ingezameld</dt>
          <dd>
            {afvalBron.definities.scheidingsPct} Dit is de definitie van CBS. Het wijkt af van afvalscheidingscijfers die nascheiding meetellen.
            {c && (
              <>
                {' '}
                Controle: landelijk komt deze rekenwijze uit op {procent(c.landelijkScheidingsPctBerekend, 1)}; CBS publiceert{' '}
                {procent(c.landelijkScheidingsPctCbs, 0)} (tabel {c.tabelId}).
              </>
            )}
          </dd>
          <dt>Landelijk gemiddelde</dt>
          <dd>
            Gemiddelde van alle gemeenten, gewogen naar inwoners (scheiding: naar hoeveelheid afval). Restafval {getal(landelijk.restafval ?? NaN)} kg
            per inwoner
            {c ? `; CBS landelijk: ${getal(c.landelijkRestafvalKgPerInw)} kg (fijn + grof)` : ''}.
          </dd>
          <dt>Samenwerkingsverbanden</dt>
          <dd>
            De kaart toont gemeenten, geen samenwerkingsverbanden. Er is geen openbare, onderhouden bron met de indeling van gemeenten in
            afvalsamenwerkingsverbanden die we kunnen controleren.
          </dd>
        </dl>
      </details>
    </Kaart>
  );
}
