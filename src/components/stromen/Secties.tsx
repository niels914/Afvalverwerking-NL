import { Link } from 'react-router-dom';
import { Badge } from '../ui';
import { datum } from '../../lib/format';
import { archiefPad, documentenPad, type Stroom } from '../../data/stromen';
import { bronnen, inhoud, PEILDATUM, type Bron } from '../../data/stromen-inhoud';
import { publicatiesVoorStroom, type Publicatie } from '../../data/kennisbank';
import { landelijk } from '../../lib/stromen';

export function BronLink({ bron }: { bron: Bron }) {
  return (
    <a href={bron.url} target="_blank" rel="noopener noreferrer">
      {bron.uitgever}: {bron.titel}
      <span className="visueel-verborgen"> (opent in nieuw tabblad)</span>
    </a>
  );
}
const BronRegel = ({ lijst }: { lijst: Bron[] }) => (
  <p className="klein bron-regel">
    Bron:{' '}
    {lijst.map((b, i) => (
      <span key={b.url}>
        {i > 0 && '; '}
        <BronLink bron={b} /> ({b.datum})
      </span>
    ))}
    . Gelezen op {datum(PEILDATUM)}.
  </p>
);

const procent = (w: number | null) => (w === null ? '–' : `${w} %`);

/** Verwerking en geldstromen: alleen wat bij een bron is nagelezen, met de open vragen zichtbaar. */
export function Verwerking({ stroom }: { stroom: Stroom }) {
  const i = inhoud[stroom.id];
  const v = i.cbsVerwerking ? landelijk.verwerking[i.cbsVerwerking] : null;
  // Laatste jaar waarin CBS een verdeling geeft (het nieuwste jaar is vaak nog leeg).
  const idx = v ? v.verbranden.reduce<number>((laatste, w, k) => (w !== null ? k : laatste), -1) : -1;
  const jaar = idx >= 0 ? landelijk.jaren[idx] : null;
  const rest = v && idx >= 0 ? { nuttig: v.nuttig[idx], composteren: v.composteren[idx], nascheiding: v.nascheiding[idx], verbranden: v.verbranden[idx], storten: v.storten[idx] } : null;
  return (
    <>
      {rest && jaar && (
        <div className="verwerking-cbs">
          <h3>Eerst toegepaste verwerking volgens CBS, {jaar}</h3>
          <p className="klein muted">
            Aandeel van het {i.cbsVerwerking === 'restafval' ? 'huishoudelijk restafval' : 'grof huishoudelijk restafval'} in procenten. CBS telt alleen de eerst toegepaste methode; de eindverwerking kan anders zijn. Bij
            scheiden achteraf worden eerst herbruikbare fracties uit het afval gehaald, daarna volgt verdere verwerking.
          </p>
          <div className="kaarttabel">
            <table>
              <caption className="visueel-verborgen">Verwerkingsmethode van {stroom.naam.toLowerCase()}, aandeel in procenten</caption>
              <thead>
                <tr>
                  <th scope="col">Methode</th>
                  <th scope="col" className="num">
                    Aandeel
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Scheiden achteraf (nascheiding)</th>
                  <td className="num">{procent(rest.nascheiding)}</td>
                </tr>
                <tr>
                  <th scope="row">Verbranden</th>
                  <td className="num">{procent(rest.verbranden)}</td>
                </tr>
                <tr>
                  <th scope="row">Nuttige toepassing (recycling)</th>
                  <td className="num">{procent(rest.nuttig)}</td>
                </tr>
                <tr>
                  <th scope="row">Composteren en vergisten</th>
                  <td className="num">{procent(rest.composteren)}</td>
                </tr>
                <tr>
                  <th scope="row">Storten</th>
                  <td className="num">{procent(rest.storten)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <BronRegel lijst={[bronnen.cbs83558]} />
        </div>
      )}
      {i.verwerking.length > 0 && (
        <ul className="feiten">
          {i.verwerking.map((f) => (
            <li key={f.tekst}>
              <p>{f.tekst}</p>
              <BronRegel lijst={f.bronnen} />
            </li>
          ))}
        </ul>
      )}
      <OpenVragen lijst={i.open} />
    </>
  );
}

export function OpenVragen({ lijst }: { lijst: string[] }) {
  if (lijst.length === 0) return null;
  return (
    <div className="notitie open-vragen">
      <strong>Niet te onderbouwen</strong>
      <ul>
        {lijst.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function Regels({ stroom }: { stroom: Stroom }) {
  const i = inhoud[stroom.id];
  return (
    <>
      <p className="klein muted">
        Gelezen op {datum(PEILDATUM)}. Dit is een overzicht voor beleidsadviseurs en contractmanagers en geen juridisch advies; raadpleeg bij twijfel de brontekst of een jurist.
      </p>
      <ul className="regels">
        {i.regels.map((r) => (
          <li key={r.titel}>
            <h3>{r.titel}</h3>
            <p>{r.inhoud}</p>
            <p className="voor-gemeente">
              <strong>Voor een gemeente:</strong> {r.gemeente}
            </p>
            <BronRegel lijst={r.bron2 ? [r.bron, r.bron2] : [r.bron]} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function ToolsLijst({ stroom }: { stroom: Stroom }) {
  return (
    <ul className="toollijst">
      {stroom.tools.map((t) => (
        <li key={t.naam + t.pad}>
          <Link className="link-pijl" to={t.pad}>
            {t.naam}
          </Link>
          <span className="klein muted">{t.waarvoor}</span>
        </li>
      ))}
    </ul>
  );
}

export function Aanbestedingen({ stroom }: { stroom: Stroom }) {
  return (
    <ul className="toollijst">
      <li>
        <Link className="link-pijl" to={archiefPad(stroom)}>
          Aanbestedingsarchief, gefilterd op {stroom.archiefStroom.toLowerCase()}
        </Link>
        <span className="klein muted">Aanbestedingen van gemeenten en samenwerkingsverbanden uit TenderNed, voor leden.</span>
      </li>
      <li>
        <Link className="link-pijl" to={documentenPad(stroom)}>
          Documenten bij aanbestedingen van deze stroom
        </Link>
        <span className="klein muted">Bestekken, gunningsleidraden en andere stukken in de documentenbibliotheek van het archief.</span>
      </li>
    </ul>
  );
}

const maandJaar = new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' });
const verschenen = (p: Publicatie) => (p.datum ? maandJaar.format(new Date(`${p.datum}T12:00:00`)) : p.jaar ? String(p.jaar) : 'doorlopend bijgewerkt');

function PublicatieItem({ p }: { p: Publicatie }) {
  return (
    <li>
      <h4>
        <a href={p.url} target="_blank" rel="noopener noreferrer">
          {p.titel}
          <span className="visueel-verborgen"> (opent in nieuw tabblad)</span>
        </a>
      </h4>
      <p className="klein muted">
        {p.uitgever} · {verschenen(p)} · <Badge>{p.type}</Badge>
      </p>
      <p>{p.samenvatting}</p>
    </li>
  );
}

export function Publicaties({ stroom }: { stroom: Stroom }) {
  const { specifiek, algemeen } = publicatiesVoorStroom(stroom.id);
  return (
    <>
      {specifiek.length > 0 ? (
        <ul className="publicaties">
          {specifiek.map((p) => (
            <PublicatieItem key={p.id} p={p} />
          ))}
        </ul>
      ) : (
        <p className="muted">Voor deze stroom heeft de kennisbank nog geen eigen publicaties.</p>
      )}
      {algemeen.length > 0 && (
        <details className="inklap-tekst">
          <summary>Publicaties over alle stromen ({algemeen.length})</summary>
          <ul className="publicaties">
            {algemeen.map((p) => (
              <PublicatieItem key={p.id} p={p} />
            ))}
          </ul>
        </details>
      )}
      <p className="klein">
        <Link className="link-pijl" to={`/kennisbank?stroom=${stroom.id}`}>
          Alle publicaties over {stroom.naam.toLowerCase()} in de kennisbank
        </Link>
      </p>
    </>
  );
}
