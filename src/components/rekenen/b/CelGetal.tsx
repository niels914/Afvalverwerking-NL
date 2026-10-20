import { useState } from 'react';
import { leesGetal, toonInInvoer } from '../../../lib/format';

/**
 * Compact getalveld voor in een tabel. Het label is verplicht (aria-label), omdat de kolomkop
 * niet altijd wordt voorgelezen. Een leeg veld geeft null door als `magLeeg`.
 */
export function CelGetal({
  label,
  waarde,
  onChange,
  magLeeg = false,
  max,
  breed,
}: {
  label: string;
  waarde: number | null;
  onChange: (n: number | null) => void;
  magLeeg?: boolean;
  max?: number;
  breed?: boolean;
}) {
  const [tekst, setTekst] = useState(waarde === null ? '' : toonInInvoer(waarde));
  const [fout, setFout] = useState(false);
  function wijzig(t: string) {
    setTekst(t);
    if (t.trim() === '') {
      setFout(!magLeeg);
      if (magLeeg) onChange(null);
      return;
    }
    const n = leesGetal(t);
    const ok = Number.isFinite(n) && n >= 0 && (max === undefined || n <= max);
    setFout(!ok);
    if (ok) onChange(n);
  }
  return (
    <div className="invoer" data-fout={fout ? 'true' : 'false'}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={fout || undefined}
        placeholder={magLeeg ? 'Vul in' : undefined}
        value={tekst}
        onChange={(e) => wijzig(e.target.value)}
        style={{ width: breed ? 200 : 96 }}
      />
    </div>
  );
}
