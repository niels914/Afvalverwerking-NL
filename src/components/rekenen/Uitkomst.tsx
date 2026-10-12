import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Kaart } from '../ui';
import { useRol } from '../betaalmuur/RolContext';
import { platform } from '../../data/site';

export interface InvoerRegel {
  label: string;
  waarde: string;
}

interface UitkomstProps {
  titel?: string;
  /** De formule als leesbare tekst. */
  formule: string;
  /** De gebruikte invoerwaarden, al opgemaakt met eenheid. */
  invoer: InvoerRegel[];
  children: ReactNode;
  /** Extra toelichting onder de formule, bijv. aannames. */
  toelichting?: ReactNode;
}

/** Uitkomstblok voor alle rekentools: dummylabel, uitkomst, formule en invoerwaarden. */
export function Uitkomst({ titel = 'Uitkomst', formule, invoer, children, toelichting }: UitkomstProps) {
  return (
    <Kaart titel={titel} actie={<span className="dummylabel">Dummyberekening, indicatief en fictief</span>}>
      <div aria-live="polite">{children}</div>
      <div className="verantwoording">
        <h3>Zo ontstaat deze uitkomst</h3>
        <code className="formule">{formule}</code>
        {toelichting && <p className="klein muted">{toelichting}</p>}
        <h3>Gebruikte invoer</h3>
        <dl className="invoerlijst">
          {invoer.map((r) => (
            <div key={r.label} style={{ display: 'contents' }}>
              <dt>{r.label}</dt>
              <dd>{r.waarde}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Kaart>
  );
}

/** "Rapport maken": printweergave via window.print(). Alleen voor leden. */
export function RapportKnop() {
  const { isLid } = useRol();
  if (!isLid) {
    return (
      <p className="klein muted geen-print">
        <span aria-hidden="true">🔒</span> Rapport maken is voor leden. <Link to="/lidmaatschap">Bekijk lidmaatschap</Link>
      </p>
    );
  }
  return (
    <div className="knoppen">
      <button type="button" className="primair" onClick={() => window.print()}>
        Rapport maken
      </button>
      <span className="klein muted">Opent het printvenster. Kies “Opslaan als PDF” voor een bestand.</span>
    </div>
  );
}

/** Kop en voet die alleen in de printweergave verschijnen. */
export function RapportKop({ titel }: { titel: string }) {
  const vandaag = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return (
    <div className="print-alleen rapportkop">
      <div className="rij">
        <img src="/logo-kplusv.jpg" alt="" width={36} height={36} />
        <h1>Rapport {titel}</h1>
      </div>
      <p>
        KplusV · {platform.korteNaam} · {vandaag} · Dummyberekening, indicatief en fictief
      </p>
      <div className="kpv-streep" />
    </div>
  );
}

export function RapportVoet() {
  return (
    <div className="print-alleen rapportvoet">
      <span>KplusV · Verschil zien, verschil maken</span>
      <span>Prototype: alle waarden zijn fictief</span>
    </div>
  );
}
