import { useEffect, useId, useState, type ReactNode } from 'react';
import { leesGetal, toonInInvoer } from '../../lib/format';
import type { Toegang } from '../../data/types';
import { toegangLabel } from '../../data/tools';

/* ---------- Paginakop ---------- */
export function PaginaKop({ titel, children, badges }: { titel: string; children?: ReactNode; badges?: ReactNode }) {
  return (
    <section className="intro">
      <h1>{titel}</h1>
      {badges && <div className="badges">{badges}</div>}
      {children && <p>{children}</p>}
    </section>
  );
}

/* ---------- Kaart met paarse balk naast de kop ---------- */
interface KaartProps {
  titel?: string;
  sub?: ReactNode;
  actie?: ReactNode;
  kopNiveau?: 2 | 3;
  className?: string;
  id?: string;
  children?: ReactNode;
}
export function Kaart({ titel, sub, actie, kopNiveau = 2, className = '', id, children }: KaartProps) {
  const Kop = kopNiveau === 2 ? 'h2' : 'h3';
  return (
    <section className={`kaart ${className}`} id={id}>
      {(titel || actie) && (
        <div className="kaart-kop">
          <div>
            {titel && <Kop>{titel}</Kop>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {actie}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- KPI-tegel ---------- */
export function Tegel({ label, waarde, toelichting, hero }: { label: string; waarde: ReactNode; toelichting?: ReactNode; hero?: boolean }) {
  return (
    <div className={`tegel${hero ? ' hero' : ''}`}>
      <span className="tegel-label">{label}</span>
      <span className="tegel-waarde">{waarde}</span>
      {toelichting && <small>{toelichting}</small>}
    </div>
  );
}

/* ---------- Badges ---------- */
export function Badge({ soort, children }: { soort?: string; children: ReactNode }) {
  return <span className={`badge ${soort ?? ''}`}>{children}</span>;
}
export function VoorbeeldBadge({ tekst = 'Voorbeeld' }: { tekst?: string }) {
  return <Badge soort="voorbeeld">{tekst}</Badge>;
}
export function ToegangBadge({ toegang }: { toegang: Toegang }) {
  const soort = toegang === 'gratis' ? 'gratis' : toegang === 'leden' ? 'leden' : 'pro';
  return (
    <Badge soort={soort}>
      {toegang === 'leden' && <span aria-hidden="true">🔒</span>}
      {toegangLabel[toegang]}
    </Badge>
  );
}

/* ---------- Getalveld met eenheid ---------- */
interface GetalVeldProps {
  label: string;
  waarde: number;
  onChange: (waarde: number) => void;
  eenheid?: string;
  hint?: string;
  min?: number;
  max?: number;
}
/**
 * Invoerveld voor een getal. Accepteert komma en punt. Ongeldige invoer wordt gemeld
 * en niet doorgegeven, zodat de uitkomst de laatste geldige waarde houdt.
 */
export function GetalVeld({ label, waarde, onChange, eenheid, hint, min = 0, max }: GetalVeldProps) {
  const id = useId();
  const [tekst, setTekst] = useState(toonInInvoer(waarde));
  const [fout, setFout] = useState<string | null>(null);

  // Waarde van buitenaf gewijzigd (bijv. reset): veld bijwerken.
  useEffect(() => {
    if (leesGetal(tekst) !== waarde) setTekst(toonInInvoer(waarde));
  }, [waarde]);

  function wijzig(nieuw: string) {
    setTekst(nieuw);
    const n = leesGetal(nieuw);
    if (Number.isNaN(n)) return setFout('Vul een getal in.');
    if (n < min) return setFout(`Minimaal ${toonInInvoer(min)}.`);
    if (max !== undefined && n > max) return setFout(`Maximaal ${toonInInvoer(max)}.`);
    setFout(null);
    onChange(n);
  }

  const beschrijving = [hint ? `${id}-hint` : '', fout ? `${id}-fout` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="veld">
      <label htmlFor={id}>{label}</label>
      <div className="invoer" data-fout={fout ? 'true' : 'false'}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={tekst}
          aria-invalid={fout ? true : undefined}
          aria-describedby={beschrijving}
          onChange={(e) => wijzig(e.target.value)}
        />
        {eenheid && (
          <span className="eenheid" aria-hidden="true">
            {eenheid}
          </span>
        )}
      </div>
      {eenheid && <span className="visueel-verborgen">in {eenheid}</span>}
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {fout && (
        <span className="foutmelding" id={`${id}-fout`} role="alert">
          {fout}
        </span>
      )}
    </div>
  );
}

/* ---------- Keuzelijst ---------- */
interface KeuzeVeldProps<T extends string | number> {
  label: string;
  waarde: T;
  opties: { waarde: T; label: string }[];
  onChange: (waarde: T) => void;
  hint?: string;
}
export function KeuzeVeld<T extends string | number>({ label, waarde, opties, onChange, hint }: KeuzeVeldProps<T>) {
  const id = useId();
  return (
    <div className="veld">
      <label htmlFor={id}>{label}</label>
      <div className="invoer">
        <select
          id={id}
          value={String(waarde)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            const gekozen = opties.find((o) => String(o.waarde) === e.target.value);
            if (gekozen) onChange(gekozen.waarde);
          }}
        >
          {opties.map((o) => (
            <option key={String(o.waarde)} value={String(o.waarde)}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}

/* ---------- Schuif ---------- */
export function Schuif({
  label,
  waarde,
  onChange,
  min = 0,
  max = 100,
  stap = 5,
  weergave,
}: {
  label: string;
  waarde: number;
  onChange: (waarde: number) => void;
  min?: number;
  max?: number;
  stap?: number;
  weergave?: string;
}) {
  const id = useId();
  return (
    <div className="schuif">
      <div className="schuif-kop">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{weergave ?? waarde}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={stap}
        value={waarde}
        aria-valuetext={weergave ?? String(waarde)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/* ---------- Filterknoppen (chips) ---------- */
export function Chips<T extends string>({
  label,
  opties,
  waarde,
  onChange,
}: {
  label: string;
  opties: { waarde: T; label: string }[];
  waarde: T;
  onChange: (waarde: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="chips">
      {opties.map((o) => (
        <button key={o.waarde} type="button" aria-pressed={waarde === o.waarde} onClick={() => onChange(o.waarde)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
