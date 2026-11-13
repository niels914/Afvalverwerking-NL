import { useState, type ReactNode } from 'react';
import '../rekenen/tools-a.css';

const isBreed = () => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 900px)').matches;

interface BlokProps {
  id: string;
  titel: string;
  sub?: ReactNode;
  /** 'breed' = open vanaf 900 px, 'altijd' = altijd open, anders dicht. */
  open?: 'breed' | 'altijd' | 'nooit';
  /** Inhoud pas laden als het blok voor het eerst opengaat (voor zware onderdelen zoals de kaart). */
  uitgesteld?: boolean;
  children: ReactNode;
}

/**
 * Inklapbaar blok van een stroompagina, met dezelfde opmaak als de rekentools (ta-inklap). Een link naar #id opent het blok
 * (zie useInklapBijPrintEnAnker in de pagina). Met `uitgesteld` wordt de inhoud pas gemaakt als het blok opengaat, zodat de
 * kaart en de gemeentecijfers niet laden voor wie ze niet opent.
 */
export function Blok({ id, titel, sub, open = 'nooit', uitgesteld = false, children }: BlokProps) {
  const [geopend, setGeopend] = useState(() => open === 'altijd' || (open === 'breed' && isBreed()));
  const [ooitOpen, setOoitOpen] = useState(geopend);
  return (
    <details
      className="ta-inklap blok"
      id={id}
      open={geopend}
      onToggle={(e) => {
        const nu = (e.target as HTMLDetailsElement).open;
        setGeopend(nu);
        if (nu) setOoitOpen(true);
      }}
    >
      <summary>
        <h2 className="ta-inklap-titel">{titel}</h2>
        {sub && <span className="ta-inklap-sub">{sub}</span>}
      </summary>
      <div className="ta-inklap-inhoud">{!uitgesteld || ooitOpen ? children : null}</div>
    </details>
  );
}
