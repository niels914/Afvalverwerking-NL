import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { euro } from '../../../lib/format';
import './tools-b.css';

// Bouwstenen om de tools van tools-b op mobiel kort te houden: uitkomst bovenaan, details inklapbaar.
// Ingeklapte blokken gaan open bij printen en als een anker ernaar wijst.

interface UitklapProps {
  id?: string;
  titel: string;
  /** Korte tekst naast de titel. */
  sub?: ReactNode;
  kopNiveau?: 2 | 3;
  open?: boolean;
  className?: string;
  children: ReactNode;
}

/** Inklapbaar blok met een echte kop in de samenvatting, zodat het in de koppenstructuur blijft. */
export function Uitklap({ id, titel, sub, kopNiveau = 2, open, className = '', children }: UitklapProps) {
  const Kop = kopNiveau === 2 ? 'h2' : 'h3';
  return (
    <details className={`tb-uitklap ${className}`} id={id} open={open}>
      <summary>
        <Kop className="tb-uitklap-titel">{titel}</Kop>
        {sub && <span className="tb-uitklap-sub">{sub}</span>}
      </summary>
      <div className="tb-uitklap-inhoud">{children}</div>
    </details>
  );
}

function openBijAnker() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const doel = document.getElementById(id);
  const details = doel?.closest('details');
  if (details && !details.open) {
    details.open = true;
    doel?.scrollIntoView();
  }
}

/** Opent alle ingeklapte blokken bij printen (en sluit ze daarna weer), en het blok waar een anker naar wijst. */
export function useUitklapBijPrint() {
  useEffect(() => {
    let geopend: HTMLDetailsElement[] = [];
    const voor = () => {
      geopend = [...document.querySelectorAll<HTMLDetailsElement>('details.tb-uitklap:not([open])')];
      geopend.forEach((d) => (d.open = true));
    };
    const na = () => {
      geopend.forEach((d) => (d.open = false));
      geopend = [];
    };
    window.addEventListener('beforeprint', voor);
    window.addEventListener('afterprint', na);
    window.addEventListener('hashchange', openBijAnker);
    const t = window.setTimeout(openBijAnker, 0);
    return () => {
      window.removeEventListener('beforeprint', voor);
      window.removeEventListener('afterprint', na);
      window.removeEventListener('hashchange', openBijAnker);
      window.clearTimeout(t);
    };
  }, []);
}

/** Opent het doelblok voordat de browser naar een anker scrollt. */
export function openDoel(id: string) {
  const details = document.getElementById(id)?.closest('details');
  if (details && !details.open) details.open = true;
}

/** Korte inhoudsopgave met ankers die ingeklapte blokken openen. */
export function Ankers({ links }: { links: { id: string; label: string }[] }) {
  return (
    <nav aria-label="Op deze pagina" className="geen-print tb-ankers">
      <ul>
        {links.map((l) => (
          <li key={l.id}>
            <a href={`#${l.id}`} onClick={() => openDoel(l.id)}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Bandbreedte van een bedrag: laag – hoog, met de middelste waarde als uitkomst. Woorden, niet alleen kleur. */
export function Bandbreedte({ laag, hoog, toelichting }: { laag: number; hoog: number; toelichting?: ReactNode }) {
  return (
    <p className="tb-band">
      <span className="tb-band-label">Bandbreedte</span> <span className="num">{euro(laag)}</span> tot <span className="num">{euro(hoog)}</span>
      {toelichting && <span className="tb-band-toel"> {toelichting}</span>}
    </p>
  );
}

/** Meldingen bij de invoer: fouten (de uitkomst klopt niet) en signalen (controleer de waarde). */
export function Meldingen({ fouten = [], signalen = [] }: { fouten?: string[]; signalen?: string[] }) {
  if (fouten.length === 0 && signalen.length === 0) return null;
  return (
    <div className="stapel" style={{ gap: 8 }}>
      {fouten.length > 0 && (
        <div className="notitie tb-fout" role="alert">
          <strong>Controleer de invoer</strong>
          <ul>
            {fouten.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {signalen.length > 0 && (
        <div className="notitie tb-signaal" role="status">
          <strong>Let op</strong>
          <ul>
            {signalen.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Houdt bij welke velden een ongeldige waarde hebben (via BronVeld.onFout). De tool kan dan melden dat de uitkomst
 * nog bij de vorige geldige invoer hoort.
 */
export function useVeldFouten() {
  const [fouten, setFouten] = useState<Record<string, boolean>>({});
  const melder = useCallback((naam: string) => (fout: boolean) => setFouten((x) => (Boolean(x[naam]) === fout ? x : { ...x, [naam]: fout })), []);
  const lijst = Object.keys(fouten).filter((k) => fouten[k]);
  const melding = lijst.length
    ? `De uitkomst is niet bijgewerkt: ${lijst.join(', ')} ${lijst.length === 1 ? 'heeft' : 'hebben'} een ongeldige waarde. Hij hoort nog bij de laatste geldige invoer.`
    : null;
  return { lijst, melder, melding };
}
