import '../components/kaart/inhoud.css';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, KeuzeVeld, Kaart, PaginaKop } from '../components/ui';
import { kennisbankThemas, linksGecontroleerd, publicaties, publicatieTypes, type Publicatie } from '../data/kennisbank';
import { datum } from '../lib/format';

const EERSTE = 8;
const maandJaar = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' });
const breed = () => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 900px)').matches;

/** Eén vorm voor elke publicatie: maand en jaar, alleen het jaar, of "doorlopend bijgewerkt". */
function verschenen(p: Publicatie): string {
  if (p.datum) return maandJaar.format(new Date(`${p.datum}T12:00:00`));
  if (p.jaar) return String(p.jaar);
  return 'doorlopend bijgewerkt';
}

export function Kennisbank() {
  const zoekId = useId();
  const [zoek, setZoek] = useState('');
  const [thema, setThema] = useState<string>('alle');
  const [type, setType] = useState<string>('alle');
  const [alles, setAlles] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(breed);

  const lijst = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    return publicaties
      .filter((p) => thema === 'alle' || (p.themas as string[]).includes(thema))
      .filter((p) => type === 'alle' || p.type === type)
      .filter((p) => !term || `${p.titel} ${p.samenvatting} ${p.uitgever} ${p.inOpdrachtVan ?? ''} ${p.type}`.toLowerCase().includes(term))
      .sort((a, b) => (b.datum ?? `${b.jaar ?? 0}`).localeCompare(a.datum ?? `${a.jaar ?? 0}`) || a.titel.localeCompare(b.titel));
  }, [zoek, thema, type]);
  const gefilterd = !!zoek.trim() || thema !== 'alle' || type !== 'alle';
  const ingekort = !alles && !gefilterd && lijst.length > EERSTE;
  const zichtbaar = ingekort ? lijst.slice(0, EERSTE) : lijst;
  const aantalFilters = [thema, type].filter((w) => w !== 'alle').length;

  return (
    <>
      <PaginaKop titel="Kennisbank">
        Rapporten, beleidsstukken en cijfers over afvalbeleid en afvalverwerking van Rijkswaterstaat, CBS, PBL, de Rijksoverheid en onafhankelijke
        onderzoeksbureaus. Per publicatie een korte samenvatting van de redactie en een link naar het origineel.
      </PaginaKop>

      <form className="nieuws-filters" role="search" aria-label="Kennisbank doorzoeken" onSubmit={(e) => e.preventDefault()}>
        <div className="veld">
          <label htmlFor={zoekId}>Zoeken</label>
          <div className="invoer">
            <input id={zoekId} type="search" value={zoek} placeholder="Bijv. afvalstoffenbelasting" onChange={(e) => setZoek(e.target.value)} />
          </div>
        </div>
        <details className="filters-inklap" open={filtersOpen} onToggle={(e) => setFiltersOpen((e.target as HTMLDetailsElement).open)}>
          <summary>Filters{aantalFilters > 0 ? ` (${aantalFilters} actief)` : ''}</summary>
          <div className="filterbalk">
            <KeuzeVeld
              label="Thema"
              waarde={thema}
              onChange={setThema}
              opties={[{ waarde: 'alle', label: 'Alle thema’s' }, ...kennisbankThemas.map((t) => ({ waarde: t, label: t }))]}
            />
            <KeuzeVeld
              label="Soort"
              waarde={type}
              onChange={setType}
              opties={[{ waarde: 'alle', label: 'Alle soorten' }, ...publicatieTypes.map((t) => ({ waarde: t, label: t }))]}
            />
          </div>
        </details>
      </form>

      <div className="lijst-kop sectie">
        <p className="klein muted" aria-live="polite">
          {ingekort ? `${zichtbaar.length} van ${lijst.length} publicaties, nieuwste eerst` : `${lijst.length} ${lijst.length === 1 ? 'publicatie' : 'publicaties'}`}
        </p>
        {gefilterd && (
          <button
            type="button"
            className="klein"
            onClick={() => {
              setZoek('');
              setThema('alle');
              setType('alle');
            }}
          >
            Wis filters
          </button>
        )}
      </div>
      <ul className="berichten raster raster-2 sectie">
        {zichtbaar.map((p) => (
          <li key={p.id}>
            <article className="kaart bericht">
              <div className="meta">
                <span>{verschenen(p)}</span>
                <Badge>{p.type}</Badge>
                {/* Een thema met dezelfde naam als de soort ("Cijfers") niet dubbel tonen. */}
                {p.themas
                  .filter((t) => t !== p.type)
                  .map((t) => (
                    <Badge key={t} soort="thema">
                      {t}
                    </Badge>
                  ))}
              </div>
              <h2>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {p.titel}
                  <span className="visueel-verborgen"> (opent in nieuw tabblad)</span>
                </a>
              </h2>
              <p>{p.samenvatting}</p>
              <p className="klein">
                <strong>Bruikbaar voor:</strong> {p.bruikbaarVoor}
              </p>
              <p className="bron">
                {p.uitgever}
                {p.inOpdrachtVan ? ` · ${p.inOpdrachtVan.startsWith('Samen') ? p.inOpdrachtVan.toLowerCase() : `in opdracht van ${p.inOpdrachtVan}`}` : ''} ·{' '}
                {p.formaat}
                {p.taal ? ` · ${p.taal}` : ''}
              </p>
            </article>
          </li>
        ))}
      </ul>
      {ingekort && (
        <div className="knoppen sectie">
          <button type="button" onClick={() => setAlles(true)}>
            Toon alle {lijst.length} publicaties
          </button>
        </div>
      )}
      {lijst.length === 0 && (
        <Kaart>
          <p className="muted">Geen publicaties gevonden. Probeer een ander zoekwoord, thema of soort.</p>
        </Kaart>
      )}
      <p className="klein muted sectie">
        Alle links zijn op {datum(linksGecontroleerd)} gecontroleerd. Werkt een link niet meer of mist u een publicatie? Meld het via het formulier
        op <Link to="/over-het-platform">Over het platform</Link>.
      </p>
    </>
  );
}
