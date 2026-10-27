import { useEffect, useId, useState, type ReactNode } from 'react';
import { datum, leesGetal, toonInInvoer } from '../../../lib/format';
import { BronStatusLabel, type BronStatus } from '../Bronnen';
import './tools-b.css';

interface Props {
  label: string;
  /** null = nog niet ingevuld. */
  waarde: number | null;
  onChange: (waarde: number | null) => void;
  eenheid?: string;
  /** Herkomst van de standaardwaarde. */
  status: BronStatus;
  /** Waarde volgens de bron; dan verschijnt een knop om terug te zetten als de gebruiker afwijkt. */
  bronwaarde?: number | null;
  /** Opgemaakte bronwaarde voor de knop en de bronregel. */
  bronwaardeTekst?: string;
  bron?: { titel: string; url: string };
  peildatum?: string;
  toelichting?: ReactNode;
  min?: number;
  max?: number;
  /** Mag leeg blijven (de tool rekent dan geen bedragen). Standaard alleen bij status 'aanname'. */
  magLeeg?: boolean;
  /** Voorbeeldwaarde zonder bron: zolang de waarde hieraan gelijk is, staat er "Voorbeeld, vul eigen waarde in". */
  voorbeeld?: number;
  /** Meldt of het veld een ongeldige waarde bevat; de tool kan dan zeggen dat de uitkomst niet is bijgewerkt. */
  onFout?: (fout: boolean) => void;
  /** Eigen tekst voor het herkomstlabel zolang de waarde gelijk is aan de bronwaarde (bijv. bij een onzeker kental). */
  statusTekst?: string;
}

/**
 * Getalveld dat laat zien waar de standaardwaarde vandaan komt: officiële bron, kental of eigen invoer.
 * Accepteert komma en punt. Een leeg veld is toegestaan als `magLeeg`; de tool toont dan wat er nog ontbreekt.
 */
export function BronVeld({ label, waarde, onChange, eenheid, status, bronwaarde, bronwaardeTekst, bron, peildatum, toelichting, min = 0, max, magLeeg, voorbeeld, onFout, statusTekst }: Props) {
  const id = useId();
  const leegToegestaan = magLeeg ?? status === 'aanname';
  const [tekst, setTekst] = useState(waarde === null ? '' : toonInInvoer(waarde));
  const [fout, setFout] = useState<string | null>(null);
  useEffect(() => {
    onFout?.(fout !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fout]);

  useEffect(() => {
    const huidig = tekst.trim() === '' ? null : leesGetal(tekst);
    if (huidig !== waarde) {
      setTekst(waarde === null ? '' : toonInInvoer(waarde));
      setFout(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waarde]);

  function wijzig(nieuw: string) {
    setTekst(nieuw);
    if (nieuw.trim() === '') {
      if (leegToegestaan) {
        setFout(null);
        return onChange(null);
      }
      return setFout('Vul een getal in.');
    }
    const n = leesGetal(nieuw);
    if (Number.isNaN(n)) return setFout('Vul een getal in.');
    if (n < min) return setFout(`Minimaal ${toonInInvoer(min)}.`);
    if (max !== undefined && n > max) return setFout(`Maximaal ${toonInInvoer(max)}.`);
    setFout(null);
    onChange(n);
  }

  const afwijkend = bronwaarde !== undefined && bronwaarde !== null && waarde !== bronwaarde;
  const ids = [`${id}-herkomst`, toelichting ? `${id}-toel` : '', fout ? `${id}-fout` : ''].filter(Boolean).join(' ');

  return (
    <div className="veld bronveld" data-leeg={waarde === null ? 'true' : 'false'}>
      <label htmlFor={id}>{label}</label>
      <div className="invoer" data-fout={fout ? 'true' : 'false'}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={tekst}
          placeholder={leegToegestaan ? 'Vul in' : undefined}
          aria-invalid={fout ? true : undefined}
          aria-describedby={ids}
          onChange={(e) => wijzig(e.target.value)}
        />
        {eenheid && (
          <span className="eenheid" aria-hidden="true">
            {eenheid}
          </span>
        )}
      </div>
      {eenheid && <span className="visueel-verborgen">in {eenheid}</span>}
      <div className="bronveld-herkomst" id={`${id}-herkomst`}>
        {afwijkend ? (
          <span className="badge">Eigen waarde</span>
        ) : voorbeeld !== undefined && waarde === voorbeeld ? (
          <span className="badge voorbeeld">Voorbeeld, vul eigen waarde in</span>
        ) : statusTekst && waarde !== null ? (
          <span className="badge voorbeeld">{statusTekst}</span>
        ) : status === 'aanname' && waarde !== null ? (
          <span className="badge">Eigen waarde</span>
        ) : (
          <BronStatusLabel status={status} />
        )}
        {waarde === null && leegToegestaan && <span className="bronveld-leeg">Nog niet ingevuld</span>}
        {bron && (
          <span className="klein muted">
            {bronwaardeTekst && <>{bronwaardeTekst} · </>}
            <a href={bron.url} target="_blank" rel="noopener noreferrer">
              {bron.titel}
            </a>
            {peildatum && <>, peildatum {datum(peildatum)}</>}
          </span>
        )}
      </div>
      {toelichting && (
        <span className="hint" id={`${id}-toel`}>
          {toelichting}
        </span>
      )}
      {afwijkend && (
        <button type="button" className="bronveld-terug" onClick={() => onChange(bronwaarde ?? null)}>
          Terug naar bronwaarde{bronwaardeTekst ? ` (${bronwaardeTekst})` : ''}
          <span className="visueel-verborgen"> voor {label}</span>
        </button>
      )}
      {fout && (
        <span className="foutmelding" id={`${id}-fout`} role="alert">
          {fout}
        </span>
      )}
    </div>
  );
}
