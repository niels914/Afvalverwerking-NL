import { useId, useState, type ReactNode } from 'react';
import { datum } from '../../../lib/format';
import { BronStatusLabel, type BronRegel } from '../Bronnen';
import { deelUrl, downloadBestand, naarCsv, veiligeBestandsnaam, type CsvCel } from '../csv';
import './tools-b.css';

interface ExportProps {
  naam: string;
  csvRijen: () => CsvCel[][];
  params: URLSearchParams;
  pad: string;
  toelichting?: ReactNode;
  /** Extra knoppen naast CSV en link (bijv. tekstbestand of printen). */
  extra?: ReactNode;
}

/**
 * CSV downloaden en link kopiëren. Het veld met de deellink staat ingeklapt, zodat het blok kort blijft.
 * Verdwijnt in de printweergave.
 */
export function Delen({ naam, csvRijen, params, pad, toelichting, extra }: ExportProps) {
  const id = useId();
  const [melding, setMelding] = useState('');
  const [open, setOpen] = useState(false);
  const link = deelUrl(typeof window === 'undefined' ? '' : window.location.origin, pad, params);

  function csv() {
    const d = new Date().toISOString().slice(0, 10);
    downloadBestand(`${veiligeBestandsnaam(naam)}-${d}.csv`, naarCsv(csvRijen()));
    setMelding('CSV gedownload. Open het bestand in Excel of een ander rekenprogramma.');
  }
  async function kopieer() {
    try {
      await navigator.clipboard.writeText(link);
      setMelding('Link gekopieerd. Wie de link opent, ziet dezelfde invoer.');
    } catch {
      setOpen(true);
      setTimeout(() => (document.getElementById(`${id}-link`) as HTMLInputElement | null)?.select(), 0);
      setMelding('Kopiëren lukte niet automatisch. De link staat geselecteerd in het veld; kopieer die met Ctrl+C.');
    }
  }

  return (
    <div className="geen-print stapel" style={{ gap: 8 }}>
      <div className="knoppen">
        <button type="button" onClick={csv}>
          CSV downloaden
        </button>
        <button type="button" onClick={kopieer}>
          Link kopiëren
        </button>
        {extra}
      </div>
      <details className="tb-deellink" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>Deellink tonen</summary>
        <div className="veld" style={{ marginTop: 8 }}>
          <label htmlFor={`${id}-link`}>Deellink met uw invoer</label>
          <div className="invoer">
            <input id={`${id}-link`} type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
          </div>
        </div>
        {toelichting && <p className="klein muted">{toelichting}</p>}
      </details>
      <p className="klein" role="status" aria-live="polite" style={{ margin: 0 }}>
        {melding}
      </p>
    </div>
  );
}

/** Bronregels zonder kaart (voor in een inklapbaar blok). */
export function BronLijst({ regels }: { regels: BronRegel[] }) {
  return (
    <ul className="tb-bronlijst">
      {regels.map((r) => (
        <li key={r.onderwerp}>
          <div className="tb-bron-kop">
            <strong>{r.onderwerp}</strong>
            <BronStatusLabel status={r.status} />
          </div>
          {r.waarde !== undefined && <div className="num">{r.waarde}</div>}
          {r.toelichting && <div className="klein muted">{r.toelichting}</div>}
          {(r.bron || r.peildatum) && (
            <div className="klein muted" style={{ overflowWrap: 'anywhere' }}>
              {r.bron && (
                <>
                  Bron:{' '}
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.bron}
                    </a>
                  ) : (
                    r.bron
                  )}
                </>
              )}
              {r.bron && r.peildatum && ' · '}
              {r.peildatum && <>peildatum {datum(r.peildatum)}</>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
