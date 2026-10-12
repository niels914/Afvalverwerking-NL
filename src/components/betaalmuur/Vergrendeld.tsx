import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useRol } from './RolContext';

interface Props {
  /** Kop van de slotkaart, bijvoorbeeld "Pro-functies indexcalculator". */
  titel: string;
  /** Korte uitleg wat leden krijgen. */
  ledenKrijgen: string[];
  /** De echte inhoud. Leden zien die gewoon; bezoekers zien een wazige preview. */
  children: ReactNode;
}

/**
 * Betaalmuur voor de demo. Als bezoeker zie je een wazige, niet-bedienbare preview met
 * uitleg en een knop naar Lidmaatschap. Als lid zie je de inhoud.
 */
export function Vergrendeld({ titel, ledenKrijgen, children }: Props) {
  const { isLid } = useRol();
  const previewRef = useRef<HTMLDivElement>(null);

  // inert maakt de preview onbereikbaar voor toetsenbord en schermlezer.
  useEffect(() => {
    previewRef.current?.setAttribute('inert', '');
  }, [isLid]);

  if (isLid) return <>{children}</>;

  return (
    <div className="vergrendeld">
      <div className="vergrendeld-preview" ref={previewRef} aria-hidden="true">
        {children}
      </div>
      <div className="vergrendeld-slot">
        <section className="slotkaart" aria-label={`${titel} (alleen voor leden)`}>
          <h3>
            <span aria-hidden="true">🔒</span> {titel}
          </h3>
          <p>Dit onderdeel is alleen voor leden. Leden krijgen:</p>
          <ul className="opsomming">
            {ledenKrijgen.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="knoppen">
            <Link className="knop primair" to="/lidmaatschap">
              Bekijk lidmaatschap
            </Link>
          </div>
          <p className="klein muted">Demo: zet rechtsboven "Bekijk als" op Lid om de inhoud te zien.</p>
        </section>
      </div>
    </div>
  );
}
