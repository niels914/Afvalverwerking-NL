import { useId, useState } from 'react';
import { Badge, KeuzeVeld, Kaart, PaginaKop, VoorbeeldBadge } from '../components/ui';
import { kennisbankThemas, publicaties } from '../data/kennisbank';

export function Kennisbank() {
  const zoekId = useId();
  const [zoek, setZoek] = useState('');
  const [thema, setThema] = useState<string>('alle');

  const term = zoek.trim().toLowerCase();
  const lijst = publicaties
    .filter((p) => thema === 'alle' || p.thema === thema)
    .filter((p) => !term || `${p.titel} ${p.samenvatting} ${p.uitgever} ${p.type}`.toLowerCase().includes(term))
    .sort((a, b) => b.jaar - a.jaar || a.titel.localeCompare(b.titel));

  return (
    <>
      <PaginaKop titel="Kennisbank">
        Onderzoeken, factsheets en handreikingen over afvalverwerking en aanbesteden. De publicaties hieronder zijn
        verzonnen voorbeelden van verzonnen uitgevers.
      </PaginaKop>

      <form className="filterbalk" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="veld">
          <label htmlFor={zoekId}>Zoeken</label>
          <div className="invoer">
            <input id={zoekId} type="search" value={zoek} placeholder="Bijv. indexering of bodemas" onChange={(e) => setZoek(e.target.value)} />
          </div>
        </div>
        <KeuzeVeld
          label="Thema"
          waarde={thema}
          onChange={setThema}
          opties={[{ waarde: 'alle', label: 'Alle thema’s' }, ...kennisbankThemas.map((t) => ({ waarde: t, label: t }))]}
        />
      </form>

      <p className="klein muted" aria-live="polite">
        {lijst.length} {lijst.length === 1 ? 'publicatie' : 'publicaties'}
      </p>
      <ul className="berichten raster raster-2 sectie">
        {lijst.map((p) => (
          <li key={p.id}>
            <article className="kaart bericht">
              <div className="meta">
                <span>{p.jaar}</span>
                <Badge>{p.type}</Badge>
                <Badge soort="thema">{p.thema}</Badge>
                <VoorbeeldBadge />
              </div>
              <h2>{p.titel}</h2>
              <p>{p.samenvatting}</p>
              <p className="bron">Uitgever: {p.uitgever}</p>
            </article>
          </li>
        ))}
      </ul>
      {lijst.length === 0 && (
        <Kaart>
          <p className="muted">Geen publicaties gevonden. Probeer een ander zoekwoord of thema.</p>
        </Kaart>
      )}
    </>
  );
}
