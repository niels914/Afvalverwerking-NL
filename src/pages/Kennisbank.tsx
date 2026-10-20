import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, KeuzeVeld, Kaart, PaginaKop } from '../components/ui';
import { kennisbankThemas, linksGecontroleerd, publicaties, publicatieTypes } from '../data/kennisbank';
import { datum } from '../lib/format';

export function Kennisbank() {
  const zoekId = useId();
  const [zoek, setZoek] = useState('');
  const [thema, setThema] = useState<string>('alle');
  const [type, setType] = useState<string>('alle');

  const term = zoek.trim().toLowerCase();
  const lijst = publicaties
    .filter((p) => thema === 'alle' || (p.themas as string[]).includes(thema))
    .filter((p) => type === 'alle' || p.type === type)
    .filter((p) => !term || `${p.titel} ${p.samenvatting} ${p.uitgever} ${p.inOpdrachtVan ?? ''} ${p.type}`.toLowerCase().includes(term))
    .sort((a, b) => (b.datum ?? `${b.jaar ?? 0}`).localeCompare(a.datum ?? `${a.jaar ?? 0}`) || a.titel.localeCompare(b.titel));

  return (
    <>
      <PaginaKop titel="Kennisbank">
        Rapporten, beleidsstukken en cijfers over afvalbeleid en afvalverwerking van Rijkswaterstaat, CBS, PBL, de
        Rijksoverheid en onafhankelijke onderzoeksbureaus. Per publicatie een korte samenvatting van de redactie en een link
        naar het origineel.
      </PaginaKop>

      <form className="filterbalk" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="veld">
          <label htmlFor={zoekId}>Zoeken</label>
          <div className="invoer">
            <input id={zoekId} type="search" value={zoek} placeholder="Bijv. afvalstoffenbelasting" onChange={(e) => setZoek(e.target.value)} />
          </div>
        </div>
        <KeuzeVeld
          label="Thema"
          waarde={thema}
          onChange={setThema}
          opties={[{ waarde: 'alle', label: 'Alle thema’s' }, ...kennisbankThemas.map((t) => ({ waarde: t, label: t }))]}
        />
        <KeuzeVeld
          label="Soort"
          waarde={type}
          onChange={setType}
          opties={[{ waarde: 'alle', label: 'Alle soorten' }, ...publicatieTypes.map((t) => ({ waarde: t, label: t }))]}
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
                <span>{p.datum ? datum(p.datum) : p.jaar ?? 'Doorlopend bijgewerkt'}</span>
                <Badge>{p.type}</Badge>
                {p.themas.map((t) => (
                  <Badge key={t} soort="thema">
                    {t}
                  </Badge>
                ))}
              </div>
              <h2>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  {p.titel}
                  <span className="visueel-verborgen"> (opent in nieuw tabblad)</span>
                </a>
              </h2>
              <p>{p.samenvatting}</p>
              <p className="klein">
                <strong>Bruikbaar voor:</strong> {p.bruikbaarVoor}
              </p>
              <p className="bron">
                {p.uitgever}
                {p.inOpdrachtVan ? ` · ${p.inOpdrachtVan.startsWith('Samen') ? p.inOpdrachtVan.toLowerCase() : `in opdracht van ${p.inOpdrachtVan}`}` : ''} ·{' '}
                {p.formaat}
                {p.taal ? ` · ${p.taal}` : ''}
              </p>
            </article>
          </li>
        ))}
      </ul>
      {lijst.length === 0 && (
        <Kaart>
          <p className="muted">Geen publicaties gevonden. Probeer een ander zoekwoord, thema of soort.</p>
        </Kaart>
      )}
      <p className="klein muted sectie">
        Alle links zijn op {datum(linksGecontroleerd)} gecontroleerd. Werkt een link niet meer of mist u een publicatie? Meld
        het via het formulier op <Link to="/over-het-platform">Over het platform</Link>.
      </p>
    </>
  );
}
