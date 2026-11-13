import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { heffingenscanPad } from '../../lib/heffingenVoorbeeld';
import { zoekHeffingGemeenten, zoekUitkomstHeffing, type HeffingGemeente } from '../../lib/calc/heffingen';
import './heffingenscan.css';

type Keuze = Pick<HeffingGemeente, 'code' | 'naam' | 'slug' | 'aliassen' | 'provincie'>;

interface Props {
  /** Label boven het veld. */
  label?: string;
  /** Knoptekst. */
  knop?: string;
  /** Dataset als de pagina die al heeft; anders laadt het veld de gemeenten pas als u het veld opent of typt. */
  gemeenten?: Keuze[];
  /** Eigen id-voorvoegsel, nodig als er twee zoekvelden op één pagina staan. */
  id?: string;
  /** Wat er na het kiezen gebeurt; standaard naar de gemeentepagina. */
  onKies?: (gemeente: Keuze) => void;
}

/**
 * Zoekveld voor de gemeente (naam, gangbare naam zoals Den Haag en Den Bosch, of CBS-code). Navigeert naar
 * /heffingenscan/<slug>. De gemeentelijst (342 rijen) laadt pas bij de eerste aanraking, zodat een pagina die dit veld
 * toont (zoals de homepage) de dataset niet in de hoofdbundel krijgt.
 */
export function GemeenteZoeker({ label = 'Zoek uw gemeente', knop = 'Toon mijn gemeente', gemeenten, id, onKies }: Props) {
  const uniek = useId().replace(/[^a-zA-Z0-9]/g, '');
  const basis = id ?? `gz${uniek}`;
  const navigate = useNavigate();
  const [lijst, setLijst] = useState<Keuze[] | null>(gemeenten ?? null);
  const [tekst, setTekst] = useState('');
  const [open, setOpen] = useState(false);
  const [actief, setActief] = useState(-1);
  const [melding, setMelding] = useState('');
  const geladen = useRef(Boolean(gemeenten));

  useEffect(() => {
    if (gemeenten) setLijst(gemeenten);
  }, [gemeenten]);

  function laad() {
    if (geladen.current) return;
    geladen.current = true;
    import('../../data/heffingen-gemeenten').then((m) => setLijst(m.heffingGemeenten));
  }

  const treffers = lijst && tekst.trim() ? zoekHeffingGemeenten(tekst, lijst, 8) : [];
  const toonLijst = open && treffers.length > 0;

  function kies(g: Keuze) {
    setOpen(false);
    setMelding('');
    if (onKies) onKies(g);
    else navigate(heffingenscanPad(g.slug));
  }

  function verstuur(e: FormEvent) {
    e.preventDefault();
    if (!lijst) {
      laad();
      setMelding('De gemeentelijst wordt geladen. Probeer het over een moment opnieuw.');
      return;
    }
    if (actief >= 0 && treffers[actief]) return kies(treffers[actief]);
    if (!tekst.trim()) {
      setMelding('Typ de naam van uw gemeente.');
      return;
    }
    const uitkomst = zoekUitkomstHeffing(tekst, lijst);
    if (uitkomst.soort === 'gevonden') return kies(uitkomst.gemeente);
    if (uitkomst.soort === 'meerdere') {
      setOpen(true);
      setMelding(`${uitkomst.treffers.length} gemeenten passen bij “${tekst.trim()}”. Kies er een uit de lijst.`);
    } else {
      setMelding(`Geen gemeente gevonden bij “${tekst.trim()}”. Controleer de spelling of probeer een deel van de naam.`);
    }
  }

  function toets(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && treffers.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActief((a) => (a + 1) % treffers.length);
    } else if (e.key === 'ArrowUp' && treffers.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActief((a) => (a <= 0 ? treffers.length - 1 : a - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActief(-1);
    }
  }

  return (
    <form className="hs-zoeker" role="search" aria-label="Gemeente zoeken" onSubmit={verstuur} noValidate>
      <div className="veld">
        <label htmlFor={`${basis}-veld`}>{label}</label>
        <div className="hs-zoeker-rij">
          <div className="invoer hs-zoeker-invoer">
            <input
              id={`${basis}-veld`}
              type="text"
              role="combobox"
              aria-expanded={toonLijst}
              aria-controls={toonLijst ? `${basis}-lijst` : undefined}
              aria-autocomplete="list"
              aria-activedescendant={toonLijst && actief >= 0 ? `${basis}-opt-${actief}` : undefined}
              aria-describedby={`${basis}-hint ${basis}-melding`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Bijvoorbeeld Overbetuwe of Den Haag"
              value={tekst}
              onFocus={laad}
              onChange={(e) => {
                laad();
                setTekst(e.target.value);
                setOpen(true);
                setActief(-1);
                setMelding('');
              }}
              onKeyDown={toets}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            />
            {toonLijst && (
              <ul className="hs-zoeker-lijst" id={`${basis}-lijst`} role="listbox" aria-label="Gemeenten">
                {treffers.map((g, i) => (
                  <li
                    key={g.code}
                    id={`${basis}-opt-${i}`}
                    role="option"
                    aria-selected={i === actief}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      kies(g);
                    }}
                  >
                    <span>{g.naam}</span>
                    {g.provincie && <span className="hs-zoeker-prov">{g.provincie}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" className="primair">
            {knop}
          </button>
        </div>
        <span className="hint" id={`${basis}-hint`}>
          Naam, gangbare naam of CBS-code. Kies uit de lijst of druk op Enter.
        </span>
        <span className="hs-melding" id={`${basis}-melding`} role="status" aria-live="polite">
          {melding}
        </span>
      </div>
    </form>
  );
}
