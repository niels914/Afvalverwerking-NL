import type { ReactNode } from 'react';
import { datum } from '../../lib/format';
import { Badge, Kaart } from '../ui';

/** Status van een gegeven: uit een officiële bron, uit een wetsvoorstel, of een aanname van de gebruiker. */
export type BronStatus = 'officieel' | 'voorstel' | 'aanname' | 'kental';

const statusTekst: Record<BronStatus, string> = {
  officieel: 'Officiële bron',
  voorstel: 'Wetsvoorstel',
  aanname: 'Aanname, vul eigen waarde in',
  kental: 'Kental, afgeleid uit bron',
};
const statusSoort: Record<BronStatus, string> = {
  officieel: 'status-gegund',
  voorstel: 'status-lopend',
  aanname: 'voorbeeld',
  kental: 'status-lopend',
};

/** Label dat zegt waar een getal vandaan komt. De tekst draagt de betekenis, de kleur ondersteunt. */
export function BronStatusLabel({ status }: { status: BronStatus }) {
  return <Badge soort={statusSoort[status]}>{statusTekst[status]}</Badge>;
}

export interface BronRegel {
  onderwerp: string;
  status: BronStatus;
  /** De gebruikte waarde, al opgemaakt. */
  waarde?: ReactNode;
  /** Naam van de bron (pagina of document). */
  bron?: string;
  url?: string;
  /** ISO-datum waarop de bron is geraadpleegd of de data zijn opgehaald. */
  peildatum?: string;
  toelichting?: ReactNode;
}

/** Lijst met herkomst van alle getallen in een tool. Werkt op 400 px zonder tabel. */
export function Bronnenlijst({ titel = 'Bronnen en peildatum', sub, regels, id }: { titel?: string; sub?: ReactNode; regels: BronRegel[]; id?: string }) {
  return (
    <Kaart titel={titel} sub={sub} id={id} className="bronnenkaart">
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
        {regels.map((r) => (
          <li key={r.onderwerp} style={{ display: 'grid', gap: 3, borderTop: '1px solid var(--rij)', paddingTop: 10, minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline' }}>
              <strong style={{ fontWeight: 600 }}>{r.onderwerp}</strong>
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
    </Kaart>
  );
}
