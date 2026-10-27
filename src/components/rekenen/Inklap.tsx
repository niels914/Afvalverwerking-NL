import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import './tools-a.css';

// Bouwstenen om een rekentool op mobiel kort te houden: kern bovenaan, details inklapbaar.
// Ingeklapte delen gaan open bij printen ("Rapport maken") en als een anker ernaar wijst.

/** Samenvatting bovenaan een tool: de uitkomst in één zin en de belangrijkste aannames. */
export function Kern({ titel = 'In het kort', children }: { titel?: string; children: ReactNode }) {
  return (
    <section className="ta-kern" aria-labelledby="ta-kern-titel">
      <h2 id="ta-kern-titel">{titel}</h2>
      {children}
    </section>
  );
}

interface InklapbaarProps {
  /** Anker-id; een link naar #id opent het blok. */
  id?: string;
  titel: string;
  /** Korte tekst naast de titel, bijv. aantal regels of de gekozen instelling. */
  sub?: ReactNode;
  /** Kopniveau van de titel in de samenvatting. */
  kopNiveau?: 2 | 3;
  open?: boolean;
  children: ReactNode;
}

/** Inklapbaar blok met een echte kop in de samenvatting, zodat het in de koppenstructuur blijft. */
export function Inklapbaar({ id, titel, sub, kopNiveau = 2, open, children }: InklapbaarProps) {
  const Kop = kopNiveau === 2 ? 'h2' : 'h3';
  return (
    <details className="ta-inklap" id={id} open={open}>
      <summary>
        <Kop className="ta-inklap-titel">{titel}</Kop>
        {sub && <span className="ta-inklap-sub">{sub}</span>}
      </summary>
      <div className="ta-inklap-inhoud">{children}</div>
    </details>
  );
}

/** Opent het ingeklapte blok waar het anker in de adresbalk naar wijst (of waar het in ligt). */
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

/**
 * Zet ingeklapte blokken open bij printen en zet ze daarna terug, en opent een blok als een anker ernaar wijst.
 * Eén keer aanroepen per pagina.
 */
export function useInklapBijPrintEnAnker() {
  useEffect(() => {
    let geopend: HTMLDetailsElement[] = [];
    const voorPrint = () => {
      geopend = [...document.querySelectorAll<HTMLDetailsElement>('details:not([open])')];
      geopend.forEach((d) => (d.open = true));
    };
    const naPrint = () => {
      geopend.forEach((d) => (d.open = false));
      geopend = [];
    };
    window.addEventListener('beforeprint', voorPrint);
    window.addEventListener('afterprint', naPrint);
    window.addEventListener('hashchange', openBijAnker);
    // Ook bij binnenkomst met een anker (de pagina laadt lazy, dus even wachten tot alles er staat).
    const t = window.setTimeout(openBijAnker, 0);
    return () => {
      window.removeEventListener('beforeprint', voorPrint);
      window.removeEventListener('afterprint', naPrint);
      window.removeEventListener('hashchange', openBijAnker);
      window.clearTimeout(t);
    };
  }, []);
}

/** Klik op een link "Op deze pagina": open eerst het doelblok, zodat het scrollen op de inhoud uitkomt. */
export function openAnkerDoel(id: string) {
  const doel = document.getElementById(id);
  const details = doel?.closest('details');
  if (details && !details.open) details.open = true;
}

/**
 * Houdt bij of een getalveld binnen het blok een ongeldige waarde bevat (aria-invalid="true"). Zolang dat zo is,
 * hoort de getoonde uitkomst bij de vorige, geldige invoer; de tool kan die dan verbergen of markeren.
 * Geeft de labels van de ongeldige velden terug (leeg als alles klopt).
 */
export function useOngeldigeInvoer<T extends HTMLElement = HTMLDivElement>(): [RefObject<T>, string[]] {
  const ref = useRef<T>(null);
  const [velden, setVelden] = useState<string[]>([]);
  useEffect(() => {
    const blok = ref.current;
    if (!blok) return;
    const lees = () => {
      const labels = [...blok.querySelectorAll<HTMLInputElement>('input[aria-invalid="true"]')].map(
        (i) => (i.id && blok.querySelector(`label[for="${CSS.escape(i.id)}"]`)?.textContent?.trim()) || 'een veld',
      );
      setVelden((oud) => (oud.join('|') === labels.join('|') ? oud : labels));
    };
    const waarnemer = new MutationObserver(lees);
    waarnemer.observe(blok, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-invalid'] });
    lees();
    return () => waarnemer.disconnect();
  }, []);
  return [ref, velden];
}

/** Melding bovenaan als de invoer niet klopt: de uitkomst is dan niet bijgewerkt. */
export function OngeldigeInvoer({ velden }: { velden: string[] }) {
  if (velden.length === 0) return null;
  return (
    <p className="notitie ta-ongeldig" role="status">
      <strong>Uitkomst niet bijgewerkt.</strong> Corrigeer {velden.length === 1 ? 'het veld' : 'de velden'}{' '}
      {velden.map((v) => `“${v}”`).join(', ')}. Tot dan toont de tool geen bedragen.
    </p>
  );
}
