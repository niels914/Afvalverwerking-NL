import { useState, type ReactNode } from 'react';
import { downloadBestand, veiligeBestandsnaam } from '../export';
import './tools-b.css';

/** Printknop voor iedereen (de rapportknop in Uitkomst.tsx is alleen voor leden). */
export function PrintKnop({ tekst = 'Printen of opslaan als PDF' }: { tekst?: string }) {
  return (
    <div className="knoppen geen-print">
      <button type="button" onClick={() => window.print()}>
        {tekst}
      </button>
      <span className="klein muted">Opent het printvenster. Kies “Opslaan als PDF” voor een bestand.</span>
    </div>
  );
}

/** Knop die een tekstbestand downloadt (bijv. een overzicht voor in een bestek). */
export function TekstDownloadKnop({ naam, inhoud, children }: { naam: string; inhoud: () => string; children: ReactNode }) {
  const [melding, setMelding] = useState('');
  function klik() {
    const d = new Date().toISOString().slice(0, 10);
    downloadBestand(`${veiligeBestandsnaam(naam)}-${d}.txt`, inhoud(), 'text/plain;charset=utf-8');
    setMelding('Tekstbestand gedownload.');
  }
  return (
    <>
      <button type="button" onClick={klik}>
        {children}
      </button>
      <span className="visueel-verborgen" role="status" aria-live="polite">
        {melding}
      </span>
    </>
  );
}

/** Melding met de velden die nog ontbreken. */
export function Ontbreekt({ velden, uitleg }: { velden: string[]; uitleg: ReactNode }) {
  if (velden.length === 0) return null;
  return (
    <div className="notitie ontbreekt" role="status">
      <strong>Nog in te vullen voor bedragen</strong>
      <span>{uitleg}</span>
      <ul>
        {velden.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    </div>
  );
}
