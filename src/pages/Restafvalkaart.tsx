import { useMemo, useState } from 'react';
import { RestafvalKaart } from '../components/kaart/RestafvalKaart';
import { Vergrendeld } from '../components/betaalmuur/Vergrendeld';
import { Badge, Kaart, PaginaKop, Tegel, VoorbeeldBadge } from '../components/ui';
import { samenwerkingsverbanden } from '../data/samenwerkingsverbanden';
import { gemeenten } from '../data/gemeenten';
import { aanbestedingen, statusLabel } from '../data/aanbestedingen';
import { aanbestedingenVan, verbandenMetCijfers, type VerbandMetCijfers } from '../lib/kaartdata';
import { datumKortNl, getal, procent } from '../lib/format';

export default function Restafvalkaart() {
  const verbanden = useMemo(() => verbandenMetCijfers(samenwerkingsverbanden, gemeenten), []);
  const [geselecteerdId, setGeselecteerdId] = useState<string>(verbanden[0].id);
  const geselecteerd = verbanden.find((v) => v.id === geselecteerdId) ?? verbanden[0];

  return (
    <>
      <PaginaKop titel="Restafvalkaart van Nederland" badges={<VoorbeeldBadge tekst="Voorbeelddata" />}>
        Kerncijfers over restafval per samenwerkingsverband. Klik op een cirkel of kies een verband uit de lijst. De
        verbanden en cijfers op deze kaart zijn verzonnen; de echte kaart werkt met cijfers per gemeente.
      </PaginaKop>

      <div className="kaart-layout">
        <div className="stapel">
          <div className="leaflet-vak" role="region" aria-label="Kaart van Nederland met samenwerkingsverbanden">
            <RestafvalKaart verbanden={verbanden} geselecteerdId={geselecteerdId} onSelecteer={setGeselecteerdId} />
          </div>
          <Kaart
            titel="Samenwerkingsverbanden"
            kopNiveau={3}
            sub="Ook te kiezen zonder kaart. De grootte van de cirkel volgt het aantal inwoners."
          >
            <ul className="svlijst">
              {verbanden.map((v) => (
                <li key={v.id}>
                  <button type="button" aria-pressed={v.id === geselecteerdId} onClick={() => setGeselecteerdId(v.id)}>
                    {v.naam}
                  </button>
                </li>
              ))}
            </ul>
          </Kaart>
        </div>
        <RegioPaneel verband={geselecteerd} />
      </div>
    </>
  );
}

function RegioPaneel({ verband }: { verband: VerbandMetCijfers }) {
  const c = verband.cijfers;
  const lijst = aanbestedingenVan(verband.id, aanbestedingen);
  return (
    <aside className="stapel" aria-label={`Gegevens ${verband.naam}`}>
      <Kaart titel={verband.naam} sub={`Regio ${verband.regio} · ${c.aantalGemeenten} gemeenten · peiljaar ${c.jaar ?? '–'}`}>
        <div className="badges">
          <VoorbeeldBadge tekst="Voorbeeldcijfers, fictief" />
        </div>
        <div className="tegels" aria-live="polite">
          <Tegel label="Restafval" waarde={`${getal(c.restafvalKgPerInw)} kg`} toelichting="per inwoner per jaar" hero />
          <Tegel label="Scheiding" waarde={procent(c.scheidingsPct)} toelichting="van het huishoudelijk afval" />
          <Tegel label="Inwoners" waarde={getal(c.inwoners)} toelichting={`${getal(c.restafvalTon)} ton restafval`} />
        </div>
        <div className="tabel-container">
          <table>
            <caption>Fictieve gemeenten en cijfers</caption>
            <thead>
              <tr>
                <th scope="col">Gemeente</th>
                <th scope="col" className="num">
                  Inwoners
                </th>
                <th scope="col" className="num">
                  kg/inw
                </th>
                <th scope="col" className="num">
                  Scheiding
                </th>
              </tr>
            </thead>
            <tbody>
              {verband.gemeenten.map((g) => (
                <tr key={g.cbsCode}>
                  <td>{g.naam}</td>
                  <td className="num">{getal(g.inwoners)}</td>
                  <td className="num">{getal(g.restafvalKgPerInw)}</td>
                  <td className="num">{procent(g.scheidingsPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kaart>

      <Vergrendeld
        titel="Aanbestedingen per samenwerkingsverband"
        ledenKrijgen={[
          'Lopende en afgeronde aanbestedingen van dit verband',
          'Directe links naar de aankondiging',
          'Het volledige aanbestedingsarchief',
        ]}
      >
        <Kaart titel="Lopende en afgeronde aanbestedingen" kopNiveau={3} sub="Voorbeelden, fictief">
          {lijst.length === 0 ? (
            <p className="muted klein">Geen aanbestedingen in de voorbeelddata voor dit verband.</p>
          ) : (
            <ul className="aanbestedingslijst">
              {lijst.map((a) => (
                <li key={a.id}>
                  <strong>{a.titel}</strong>
                  <div className="badges">
                    <Badge soort={`status-${a.status}`}>{statusLabel[a.status]}</Badge>
                    <Badge soort="thema">{a.stroom}</Badge>
                    <VoorbeeldBadge />
                  </div>
                  <span className="muted klein">
                    {a.procedure} · sluiting {datumKortNl(a.sluiting)}
                  </span>
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    Naar {a.platform} (homepage)
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Kaart>
      </Vergrendeld>
    </aside>
  );
}
