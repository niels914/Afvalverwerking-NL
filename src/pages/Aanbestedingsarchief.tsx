import { useState } from 'react';
import { Vergrendeld } from '../components/betaalmuur/Vergrendeld';
import { Badge, KeuzeVeld, Kaart, PaginaKop, VoorbeeldBadge } from '../components/ui';
import { aanbestedingen, statusLabel } from '../data/aanbestedingen';
import type { AanbestedingStatus, Afvalstroom, Regio } from '../data/types';
import { datumKortNl } from '../lib/format';

const uniek = <T,>(lijst: T[]) => [...new Set(lijst)].sort();

export function Aanbestedingsarchief() {
  const [stroom, setStroom] = useState<Afvalstroom | 'alle'>('alle');
  const [status, setStatus] = useState<AanbestedingStatus | 'alle'>('alle');
  const [regio, setRegio] = useState<Regio | 'alle'>('alle');

  const lijst = aanbestedingen
    .filter((a) => stroom === 'alle' || a.stroom === stroom)
    .filter((a) => status === 'alle' || a.status === status)
    .filter((a) => regio === 'alle' || a.regio === regio)
    .sort((a, b) => b.publicatie.localeCompare(a.publicatie));

  return (
    <>
      <PaginaKop titel="Aanbestedingsarchief" badges={<Badge soort="leden">🔒 Alleen leden</Badge>}>
        Lopende, gesloten en gegunde aanbestedingen voor afvalinzameling en -verwerking, met links naar de aankondiging.
        Alle aanbestedingen hieronder zijn verzonnen; de links gaan naar de homepage van TenderNed of Mercell.
      </PaginaKop>

      <Vergrendeld
        titel="Aanbestedingsarchief"
        ledenKrijgen={[
          'Alle aanbestedingen van samenwerkingsverbanden en gemeenten op één plek',
          'Filters op afvalstroom, status en regio',
          'Links naar de aankondiging op TenderNed of Mercell',
        ]}
      >
        <Kaart>
          <div className="filterbalk">
            <KeuzeVeld<Afvalstroom | 'alle'>
              label="Afvalstroom"
              waarde={stroom}
              onChange={setStroom}
              opties={[{ waarde: 'alle', label: 'Alle stromen' }, ...uniek(aanbestedingen.map((a) => a.stroom)).map((s) => ({ waarde: s, label: s }))]}
            />
            <KeuzeVeld<AanbestedingStatus | 'alle'>
              label="Status"
              waarde={status}
              onChange={setStatus}
              opties={[
                { waarde: 'alle', label: 'Alle statussen' },
                ...(Object.keys(statusLabel) as AanbestedingStatus[]).map((s) => ({ waarde: s, label: statusLabel[s] })),
              ]}
            />
            <KeuzeVeld<Regio | 'alle'>
              label="Regio"
              waarde={regio}
              onChange={setRegio}
              opties={[{ waarde: 'alle', label: 'Alle regio’s' }, ...uniek(aanbestedingen.map((a) => a.regio)).map((r) => ({ waarde: r, label: r }))]}
            />
          </div>
          <p className="klein muted" aria-live="polite">
            {lijst.length} van {aanbestedingen.length} aanbestedingen
          </p>
          <div className="tabel-container">
            <table>
              <caption>Alle aanbestedingen zijn fictief (voorbeeld).</caption>
              <thead>
                <tr>
                  <th scope="col">Opdrachtgever en opdracht</th>
                  <th scope="col">Afvalstroom</th>
                  <th scope="col">Procedure</th>
                  <th scope="col">Regio</th>
                  <th scope="col">Publicatie</th>
                  <th scope="col">Sluiting</th>
                  <th scope="col">Status</th>
                  <th scope="col">Link</th>
                </tr>
              </thead>
              <tbody>
                {lijst.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: 'normal', minWidth: 220 }}>
                      <strong>{a.opdrachtgever}</strong>
                      <br />
                      <span className="muted">{a.titel}</span>
                      <br />
                      <VoorbeeldBadge />
                    </td>
                    <td>{a.stroom}</td>
                    <td>{a.procedure}</td>
                    <td>{a.regio}</td>
                    <td>
                      <time dateTime={a.publicatie}>{datumKortNl(a.publicatie)}</time>
                    </td>
                    <td>
                      <time dateTime={a.sluiting}>{datumKortNl(a.sluiting)}</time>
                    </td>
                    <td>
                      <Badge soort={`status-${a.status}`}>{statusLabel[a.status]}</Badge>
                    </td>
                    <td>
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        {a.platform}
                        <span className="visueel-verborgen"> (homepage, opent in nieuw venster)</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lijst.length === 0 && <p className="muted">Geen aanbestedingen met deze filters.</p>}
        </Kaart>
      </Vergrendeld>
    </>
  );
}
