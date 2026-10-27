import type { ChangeEvent, HTMLInputTypeAttribute, ReactNode } from 'react';

// Formuliervelden voor het aanmeldformulier. Elk veld heeft een zichtbaar label, een optionele hint
// en een foutmelding die via aria-describedby aan het veld hangt.

export const veldId = (naam: string) => `am-${naam}`;

function beschrijving(naam: string, hint?: ReactNode, fout?: string) {
  return [hint ? `${veldId(naam)}-hint` : '', fout ? `${veldId(naam)}-fout` : ''].filter(Boolean).join(' ') || undefined;
}

function Label({ naam, label, optioneel }: { naam: string; label: string; optioneel?: boolean }) {
  return (
    <label htmlFor={veldId(naam)}>
      {label}
      {optioneel ? <span className="lm-optioneel"> (optioneel)</span> : <span className="visueel-verborgen"> (verplicht)</span>}
    </label>
  );
}

function HintEnFout({ naam, hint, fout }: { naam: string; hint?: ReactNode; fout?: string }) {
  return (
    <>
      {hint && (
        <span className="hint" id={`${veldId(naam)}-hint`}>
          {hint}
        </span>
      )}
      {fout && (
        <span className="foutmelding" id={`${veldId(naam)}-fout`}>
          <span aria-hidden="true">⚠ </span>
          {fout}
        </span>
      )}
    </>
  );
}

interface TekstVeldProps {
  naam: string;
  label: string;
  waarde: string;
  onChange: (waarde: string) => void;
  type?: HTMLInputTypeAttribute;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  optioneel?: boolean;
  hint?: ReactNode;
  fout?: string;
  min?: string;
  max?: string;
  maxLength?: number;
  breedte?: string;
}

export function TekstVeld({ naam, label, waarde, onChange, type = 'text', autoComplete, inputMode, optioneel, hint, fout, min, max, maxLength, breedte }: TekstVeldProps) {
  return (
    <div className="veld">
      <Label naam={naam} label={label} optioneel={optioneel} />
      <div className="invoer" data-fout={fout ? 'true' : 'false'} style={breedte ? { maxWidth: breedte } : undefined}>
        <input
          id={veldId(naam)}
          name={naam}
          type={type}
          autoComplete={autoComplete ?? 'off'}
          inputMode={inputMode}
          value={waarde}
          min={min}
          max={max}
          maxLength={maxLength}
          required={!optioneel}
          aria-required={!optioneel}
          aria-invalid={fout ? true : undefined}
          aria-describedby={beschrijving(naam, hint, fout)}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </div>
      <HintEnFout naam={naam} hint={hint} fout={fout} />
    </div>
  );
}

export function TekstVak({ naam, label, waarde, onChange, optioneel, hint, fout, rijen = 3 }: Omit<TekstVeldProps, 'type'> & { rijen?: number }) {
  return (
    <div className="veld">
      <Label naam={naam} label={label} optioneel={optioneel} />
      <div className="invoer" data-fout={fout ? 'true' : 'false'}>
        <textarea
          id={veldId(naam)}
          name={naam}
          rows={rijen}
          value={waarde}
          required={!optioneel}
          aria-required={!optioneel}
          aria-invalid={fout ? true : undefined}
          aria-describedby={beschrijving(naam, hint, fout)}
          onChange={(e) => onChange(e.target.value)}
          style={{ minHeight: rijen * 24 + 20 }}
        />
      </div>
      <HintEnFout naam={naam} hint={hint} fout={fout} />
    </div>
  );
}

/** Keuzerondjes in een fieldset met legend. Het eerste rondje krijgt het veld-id (voor de foutsamenvatting). */
export function KeuzeRondjes<T extends string>({
  naam,
  legend,
  waarde,
  opties,
  onChange,
  hint,
  fout,
  kolom,
}: {
  naam: string;
  legend: string;
  waarde: T | '';
  opties: { waarde: T; label: string; toelichting?: ReactNode }[];
  onChange: (waarde: T) => void;
  hint?: ReactNode;
  fout?: string;
  kolom?: boolean;
}) {
  return (
    <fieldset aria-describedby={beschrijving(naam, hint, fout)} aria-invalid={fout ? true : undefined}>
      <legend>
        {legend}
        <span className="visueel-verborgen"> (verplicht)</span>
      </legend>
      <div className={`keuzes${kolom ? ' kolom' : ''}`} style={kolom ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
        {opties.map((o, i) => (
          <label key={o.waarde} className="keuze" style={{ alignItems: 'flex-start' }}>
            <input
              id={i === 0 ? veldId(naam) : undefined}
              type="radio"
              name={naam}
              value={o.waarde}
              checked={waarde === o.waarde}
              onChange={() => onChange(o.waarde)}
              style={{ marginTop: 2 }}
            />
            <span>
              {o.label}
              {o.toelichting && <span className="lm-keuze-toelichting">{o.toelichting}</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="veld" style={{ marginTop: 4 }}>
        <HintEnFout naam={naam} hint={hint} fout={fout} />
      </div>
    </fieldset>
  );
}

export function Akkoord({ naam, waarde, onChange, fout, children }: { naam: string; waarde: boolean; onChange: (v: boolean) => void; fout?: string; children: ReactNode }) {
  return (
    <div className="veld">
      <div className="lm-akkoord">
        <input
          id={veldId(naam)}
          name={naam}
          type="checkbox"
          checked={waarde}
          required
          aria-invalid={fout ? true : undefined}
          aria-describedby={fout ? `${veldId(naam)}-fout` : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={veldId(naam)}>{children}</label>
      </div>
      <HintEnFout naam={naam} fout={fout} />
    </div>
  );
}
