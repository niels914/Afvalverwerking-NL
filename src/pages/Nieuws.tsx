import '../components/kaart/inhoud.css';
import { useId, useMemo, useState } from 'react';
import { Badge, Chips, Kaart, KeuzeVeld, PaginaKop } from '../components/ui';
import { nieuws, nieuwsBijgewerkt, nieuwsBronnen, nieuwsBronNamen, nieuwsOrganisaties, nieuwsThemas } from '../data/nieuws';
import { datum } from '../lib/format';

const PER_PAGINA = 10;
/** Na zoveel dagen zonder update meldt de pagina dat de lijst mogelijk niet actueel is. */
const VERLOOPT_NA_DAGEN = 14;

type Periode = 'alles' | '3m' | '12m' | string;

function vanafDatum(periode: Periode): string | null {
  if (periode === 'alles' || /^\d{4}$/.test(periode)) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - (periode === '3m' ? 3 : 12));
  return d.toISOString().slice(0, 10);
}

const jaren = [...new Set(nieuws.map((n) => n.datum.slice(0, 4)))].sort().reverse();
const dagenOud = nieuwsBijgewerkt ? Math.floor((Date.now() - new Date(nieuwsBijgewerkt).getTime()) / 86_400_000) : null;
const breed = () => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 900px)').matches;

export function Nieuws() {
  const zoekId = useId();
  const [zoek, setZoek] = useState('');
  const [thema, setThema] = useState('alle');
  const [bron, setBron] = useState('alle');
  const [periode, setPeriode] = useState<Periode>('alles');
  const [aantal, setAantal] = useState(PER_PAGINA);
  const [filtersOpen, setFiltersOpen] = useState(breed);

  const lijst = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    const vanaf = vanafDatum(periode);
    return nieuws.filter(
      (n) =>
        (thema === 'alle' || n.thema === thema) &&
        (bron === 'alle' || n.bron === bron) &&
        (!vanaf || n.datum >= vanaf) &&
        (!/^\d{4}$/.test(periode) || n.datum.startsWith(periode)) &&
        (!term || `${n.titel} ${n.inleiding} ${n.bron}`.toLowerCase().includes(term)),
    );
  }, [zoek, thema, bron, periode]);
  const zichtbaar = lijst.slice(0, aantal);
  const mislukt = nieuwsBronnen.filter((b) => b.status === 'mislukt');
  const aantalFilters = [thema, bron, periode].filter((w) => w !== 'alle' && w !== 'alles').length;
  const opnieuw = <T,>(zet: (w: T) => void) => (w: T) => {
    zet(w);
    setAantal(PER_PAGINA);
  };
  const wis = () => {
    setZoek('');
    setThema('alle');
    setBron('alle');
    setPeriode('alles');
    setAantal(PER_PAGINA);
  };

  return (
    <>
      <PaginaKop titel="Nieuws">
        Berichten over afval, verwerking en circulaire economie van {nieuwsBronNamen.join(', ').replace(/, ([^,]*)$/, ' en $1')}. Elk bericht
        linkt naar het origineel; hier staan alleen titel, datum en de inleiding uit de nieuwsfeed.
      </PaginaKop>

      <p className="klein muted">
        {nieuwsBijgewerkt ? <>Bijgewerkt op {datum(nieuwsBijgewerkt)}. </> : null}
        De lijst wordt opgehaald bij elke publicatie van het platform.
      </p>
      {dagenOud !== null && dagenOud > VERLOOPT_NA_DAGEN && (
        <div className="notitie" role="note">
          Deze lijst is {dagenOud} dagen niet bijgewerkt. Nieuwere berichten staan bij de bronnen zelf; zie de links onderaan de pagina.
        </div>
      )}
      {mislukt.length > 0 && (
        <div className="notitie" role="note">
          Bij de laatste update was niet elke bron bereikbaar ({[...new Set(mislukt.map((b) => b.naam))].join(', ')}). U ziet van die bron de
          laatst opgehaalde berichten.
        </div>
      )}

      <form className="sectie nieuws-filters" role="search" aria-label="Nieuws doorzoeken" onSubmit={(e) => e.preventDefault()}>
        <div className="veld">
          <label htmlFor={zoekId}>Zoek in titel en inleiding</label>
          <div className="invoer">
            <input
              id={zoekId}
              type="search"
              value={zoek}
              placeholder="Bijv. statiegeld"
              onChange={(e) => opnieuw(setZoek)(e.target.value)}
            />
          </div>
        </div>
        <details className="filters-inklap" open={filtersOpen} onToggle={(e) => setFiltersOpen((e.target as HTMLDetailsElement).open)}>
          <summary>
            Filters{aantalFilters > 0 ? ` (${aantalFilters} actief)` : ''}
          </summary>
          <div className="filterbalk">
            <KeuzeVeld
              label="Periode"
              waarde={periode}
              onChange={opnieuw(setPeriode)}
              opties={[
                { waarde: 'alles', label: 'Alle berichten' },
                { waarde: '3m', label: 'Laatste 3 maanden' },
                { waarde: '12m', label: 'Laatste 12 maanden' },
                ...jaren.map((j) => ({ waarde: j, label: j })),
              ]}
            />
            <KeuzeVeld
              label="Bron"
              waarde={bron}
              onChange={opnieuw(setBron)}
              opties={[{ waarde: 'alle', label: 'Alle bronnen' }, ...nieuwsBronNamen.map((b) => ({ waarde: b, label: b }))]}
            />
          </div>
          <p className="chips-label">Thema</p>
          <Chips<string>
            label="Thema"
            waarde={thema}
            onChange={opnieuw(setThema)}
            opties={[{ waarde: 'alle', label: 'Alle thema’s' }, ...nieuwsThemas.map((t) => ({ waarde: t, label: t }))]}
          />
        </details>
      </form>

      <div className="sectie lijst-kop">
        <p className="klein muted" aria-live="polite">
          {lijst.length} {lijst.length === 1 ? 'bericht' : 'berichten'}
        </p>
        {(aantalFilters > 0 || zoek) && (
          <button type="button" className="klein" onClick={wis}>
            Wis filters
          </button>
        )}
      </div>
      <ul className="berichten sectie">
        {zichtbaar.map((n) => (
          <li key={n.id}>
            <article className="kaart bericht">
              <div className="meta">
                <time dateTime={n.datum}>{datum(n.datum)}</time>
                <span>
                  Bron: <strong>{n.bron}</strong>
                </span>
                <Badge soort="thema">{n.thema}</Badge>
              </div>
              <h2>
                <a href={n.link} target="_blank" rel="noopener noreferrer">
                  {n.titel}
                  <span className="visueel-verborgen"> (opent website van {n.bron} in nieuw tabblad)</span>
                </a>
              </h2>
              {n.inleiding && <p>{n.inleiding}</p>}
            </article>
          </li>
        ))}
      </ul>
      {lijst.length > aantal && (
        <div className="knoppen sectie">
          <button type="button" onClick={() => setAantal((a) => a + PER_PAGINA)}>
            Meer berichten ({lijst.length - aantal} over)
          </button>
        </div>
      )}
      {lijst.length === 0 && (
        <Kaart>
          <p className="muted">Geen berichten voor deze keuze. Pas de zoekterm of de filters aan.</p>
        </Kaart>
      )}

      <Kaart titel="Bronnen van dit overzicht" kopNiveau={2} className="sectie">
        <p className="klein">
          Berichten komen uit de openbare RSS-feeds van deze organisaties en worden gefilterd op onderwerpen als afval, recycling, verpakkingen,
          textiel, verbranding en circulaire economie. De rechten op de berichten liggen bij de bron.
        </p>
        <ul className="klein bronlinks">
          {nieuwsOrganisaties.map((o) => (
            <li key={o.naam}>
              <a href={o.site} target="_blank" rel="noopener noreferrer">
                {o.naam}
              </a>{' '}
              <span className="muted">
                ({o.aantal === 0 ? 'nu geen berichten over deze onderwerpen' : `${o.aantal} ${o.aantal === 1 ? 'bericht' : 'berichten'}`})
              </span>
            </li>
          ))}
        </ul>
      </Kaart>
    </>
  );
}
