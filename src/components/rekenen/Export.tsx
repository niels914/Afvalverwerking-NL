import { useId, useState } from 'react';
import { deelUrl, downloadBestand, naarCsv, veiligeBestandsnaam, type CsvCel } from './export';

interface Props {
  /** Basis van de bestandsnaam, bijv. "Indexcalculator". */
  naam: string;
  /** Rijen voor de CSV, pas opgebouwd bij klikken. */
  csvRijen: () => CsvCel[][];
  /** Parameters die de invoer vastleggen voor de deellink. */
  params: URLSearchParams;
  /** Pad van de tool, bijv. "/tools/indexcalculator". */
  pad: string;
  /** Extra uitleg onder de knoppen. */
  toelichting?: string;
}

/** Knoppen "CSV downloaden" en "Link kopiëren" voor een rekentool. Verdwijnt in de printweergave. */
export function ExportKnoppen({ naam, csvRijen, params, pad, toelichting }: Props) {
  const id = useId();
  const [melding, setMelding] = useState('');
  const link = deelUrl(typeof window === 'undefined' ? '' : window.location.origin, pad, params);

  function csv() {
    const datum = new Date().toISOString().slice(0, 10);
    downloadBestand(`${veiligeBestandsnaam(naam)}-${datum}.csv`, naarCsv(csvRijen()));
    setMelding('CSV-bestand gedownload.');
  }

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(link);
      setMelding('Link gekopieerd. Wie de link opent, ziet dezelfde invoer.');
    } catch {
      const veld = document.getElementById(`${id}-link`) as HTMLInputElement | null;
      veld?.select();
      setMelding('Kopiëren lukte niet automatisch. De link staat geselecteerd in het veld; kopieer die met Ctrl+C.');
    }
  }

  return (
    <div className="geen-print stapel exportblok" style={{ gap: 10 }}>
      <div className="knoppen">
        <button type="button" onClick={csv}>
          CSV downloaden
        </button>
        <button type="button" onClick={kopieer}>
          Link kopiëren
        </button>
      </div>
      <div className="veld">
        <label htmlFor={`${id}-link`}>Deellink met uw invoer</label>
        <div className="invoer">
          <input id={`${id}-link`} type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
        </div>
      </div>
      {toelichting && <p className="klein muted">{toelichting}</p>}
      <p className="klein" role="status" aria-live="polite">
        {melding}
      </p>
    </div>
  );
}
