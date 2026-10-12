import { useState, type ReactNode } from 'react';

// Eenvoudige SVG-grafieken zonder externe bibliotheek, in huisstijlkleuren.
// Eerste reeks donkerviolet, tweede KplusV-blauw, vergelijking als gestreepte grijze lijn.
// Donkerviolet en blauw liggen voor kleurenblinden dicht bij elkaar; daarom heeft elke reeks
// ook een eigen lijnpatroon en markervorm, een legenda en een label aan het eind van de lijn.

export const reeksKleuren = ['#5760A6', '#007DB5', '#9462A6'];
export const vergelijkingKleur = '#9CA3AF';

const patronen = ['', '7 4', '2 3'];

export interface LijnReeks {
  naam: string;
  waarden: number[];
  /** true = grijze gestreepte vergelijkingslijn. */
  vergelijking?: boolean;
}

interface LijnProps {
  titel: string;
  labels: (string | number)[];
  reeksen: LijnReeks[];
  formatY: (n: number) => string;
  /** Laat de y-as bij 0 beginnen (standaard), anders bij het minimum met wat ruimte. */
  vanafNul?: boolean;
}

function mooieSchaal(min: number, max: number, stappen = 4) {
  if (max === min) max = min + 1;
  const ruw = (max - min) / stappen;
  const macht = 10 ** Math.floor(Math.log10(ruw));
  const stap = [1, 2, 2.5, 5, 10].map((f) => f * macht).find((s) => s >= ruw) ?? ruw;
  const onder = Math.floor(min / stap) * stap;
  const boven = Math.ceil(max / stap) * stap;
  const ticks: number[] = [];
  for (let t = onder; t <= boven + stap / 2; t += stap) ticks.push(t);
  return { onder, boven, ticks };
}

function Marker({ vorm, x, y, kleur }: { vorm: number; x: number; y: number; kleur: string }) {
  if (vorm === 1) return <rect x={x - 4} y={y - 4} width={8} height={8} fill={kleur} stroke="#fff" strokeWidth={1.5} />;
  if (vorm === 2) return <path d={`M${x} ${y - 5} L${x + 5} ${y + 4} L${x - 5} ${y + 4} Z`} fill={kleur} stroke="#fff" strokeWidth={1.5} />;
  return <circle cx={x} cy={y} r={4} fill={kleur} stroke="#fff" strokeWidth={1.5} />;
}

function LegendaSymbool({ kleur, patroon, vorm }: { kleur: string; patroon: string; vorm: number }) {
  return (
    <svg width="28" height="12" aria-hidden="true">
      <line x1="1" y1="6" x2="27" y2="6" stroke={kleur} strokeWidth="2" strokeDasharray={patroon} />
      <Marker vorm={vorm} x={14} y={6} kleur={kleur} />
    </svg>
  );
}

/** Lijngrafiek met crosshair en tooltip. */
export function LijnGrafiek({ titel, labels, reeksen, formatY, vanafNul = true }: LijnProps) {
  const [actief, setActief] = useState<number | null>(null);
  const B = 640;
  const H = 260;
  const m = { l: 64, r: 16, t: 14, b: 30 };
  const alle = reeksen.flatMap((r) => r.waarden).filter(Number.isFinite);
  const min = vanafNul ? Math.min(0, ...alle) : Math.min(...alle) * 0.95;
  const { onder, boven, ticks } = mooieSchaal(min, Math.max(...alle));
  const x = (i: number) => m.l + (labels.length <= 1 ? 0 : (i * (B - m.l - m.r)) / (labels.length - 1));
  const y = (v: number) => m.t + ((boven - v) / (boven - onder)) * (H - m.t - m.b);
  const stijl = (r: LijnReeks, i: number) => {
    const eigen = reeksen.slice(0, i + 1).filter((x) => !x.vergelijking).length - 1;
    return r.vergelijking
      ? { kleur: vergelijkingKleur, patroon: '6 4', vorm: 0 }
      : { kleur: reeksKleuren[eigen % 3], patroon: patronen[eigen % 3], vorm: eigen % 3 };
  };
  const stapBreedte = labels.length > 1 ? (B - m.l - m.r) / (labels.length - 1) : B - m.l - m.r;

  return (
    <figure className="grafiek-houder" style={{ margin: 0 }}>
      <figcaption className="visueel-verborgen">{titel}</figcaption>
      <ul className="legenda" style={{ marginBottom: 8 }}>
        {reeksen.map((r, i) => {
          const s = stijl(r, i);
          return (
            <li key={r.naam}>
              <LegendaSymbool {...s} />
              {r.naam}
            </li>
          );
        })}
      </ul>
      <svg className="grafiek" viewBox={`0 0 ${B} ${H}`} role="img" aria-label={titel} onMouseLeave={() => setActief(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="raster-lijn" x1={m.l} x2={B - m.r} y1={y(t)} y2={y(t)} />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
        ))}
        <line className="as" x1={m.l} x2={B - m.r} y1={y(onder)} y2={y(onder)} />
        {labels.map((l, i) => (
          <text key={String(l)} x={x(i)} y={H - 8} textAnchor="middle">
            {l}
          </text>
        ))}
        {actief !== null && <line x1={x(actief)} x2={x(actief)} y1={m.t} y2={H - m.b} stroke="#B8AED6" strokeWidth={1} />}
        {reeksen.map((r, i) => {
          const s = stijl(r, i);
          const punten = r.waarden.map((v, j) => `${x(j)},${y(v)}`).join(' ');
          return (
            <g key={r.naam}>
              <polyline points={punten} fill="none" stroke={s.kleur} strokeWidth={2} strokeDasharray={s.patroon} strokeLinejoin="round" />
              {!r.vergelijking && r.waarden.map((v, j) => <Marker key={j} vorm={s.vorm} x={x(j)} y={y(v)} kleur={s.kleur} />)}
            </g>
          );
        })}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={x(i) - stapBreedte / 2}
            y={m.t}
            width={stapBreedte}
            height={H - m.t - m.b}
            fill="transparent"
            onMouseEnter={() => setActief(i)}
            onTouchStart={() => setActief(i)}
          />
        ))}
      </svg>
      {actief !== null && (
        <div className="grafiek-tip" style={{ left: `${(x(actief) / B) * 100}%`, top: `${(m.t / H) * 100 + 18}%` }}>
          <strong>{labels[actief]}</strong>
          {reeksen.map((r) => (
            <div key={r.naam}>
              {r.naam}: {formatY(r.waarden[actief])}
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}

export interface Staaf {
  label: string;
  waarde: number;
  kleur?: string;
}

/** Verticale staafgrafiek met waardelabels. Labels op de x-as dragen de betekenis, niet de kleur. */
export function StaafGrafiek({ titel, staven, formatY, kop }: { titel: string; staven: Staaf[]; formatY: (n: number) => string; kop?: ReactNode }) {
  const [actief, setActief] = useState<number | null>(null);
  const B = 320;
  const H = 220;
  const m = { l: 8, r: 8, t: 22, b: 30 };
  const min = Math.min(0, ...staven.map((s) => s.waarde));
  const max = Math.max(0, ...staven.map((s) => s.waarde));
  const bereik = max - min || 1;
  const y = (v: number) => m.t + ((max - v) / bereik) * (H - m.t - m.b);
  const vak = (B - m.l - m.r) / staven.length;
  const breedte = Math.min(72, vak * 0.55);

  return (
    <figure className="grafiek-houder" style={{ margin: 0 }}>
      {kop}
      <svg className="grafiek" viewBox={`0 0 ${B} ${H}`} role="img" aria-label={`${titel}: ${staven.map((s) => `${s.label} ${formatY(s.waarde)}`).join(', ')}`}>
        <line className="as" x1={m.l} x2={B - m.r} y1={y(0)} y2={y(0)} />
        {staven.map((s, i) => {
          const cx = m.l + vak * i + vak / 2;
          const boven = Math.min(y(s.waarde), y(0));
          const hoogte = Math.max(1, Math.abs(y(s.waarde) - y(0)));
          const r = Math.min(4, hoogte / 2);
          const positief = s.waarde >= 0;
          // Afgeronde hoeken alleen aan de datazijde, vast aan de nullijn.
          const d = positief
            ? `M${cx - breedte / 2},${boven + hoogte} V${boven + r} Q${cx - breedte / 2},${boven} ${cx - breedte / 2 + r},${boven} H${cx + breedte / 2 - r} Q${cx + breedte / 2},${boven} ${cx + breedte / 2},${boven + r} V${boven + hoogte} Z`
            : `M${cx - breedte / 2},${boven} V${boven + hoogte - r} Q${cx - breedte / 2},${boven + hoogte} ${cx - breedte / 2 + r},${boven + hoogte} H${cx + breedte / 2 - r} Q${cx + breedte / 2},${boven + hoogte} ${cx + breedte / 2},${boven + hoogte - r} V${boven} Z`;
          return (
            <g key={s.label} onMouseEnter={() => setActief(i)} onMouseLeave={() => setActief(null)}>
              <rect x={cx - vak / 2} y={m.t} width={vak} height={H - m.t - m.b} fill="transparent" />
              <path d={d} fill={s.kleur ?? reeksKleuren[i % 3]} opacity={actief === null || actief === i ? 1 : 0.6} />
              <text className="waardelabel" x={cx} y={positief ? boven - 6 : boven + hoogte + 14} textAnchor="middle">
                {formatY(s.waarde)}
              </text>
              <text x={cx} y={H - 8} textAnchor="middle">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export interface Band {
  label: string;
  laag: number;
  hoog: number;
}

/** Tornadodiagram voor een gevoeligheidsanalyse rond een basiswaarde. */
export function BandGrafiek({ titel, basis, banden, formatX }: { titel: string; basis: number; banden: Band[]; formatX: (n: number) => string }) {
  const B = 640;
  const rij = 34;
  const m = { l: 150, r: 170, t: 8, b: 26 };
  const H = m.t + m.b + banden.length * rij;
  const alle = banden.flatMap((b) => [b.laag, b.hoog]).concat(basis);
  const min = Math.min(...alle);
  const max = Math.max(...alle);
  const marge = (max - min) * 0.05 || 1;
  const x = (v: number) => m.l + ((v - (min - marge)) / (max - min + 2 * marge)) * (B - m.l - m.r);
  return (
    <figure className="grafiek-houder" style={{ margin: 0 }}>
      <figcaption className="visueel-verborgen">{titel}</figcaption>
      <svg className="grafiek" viewBox={`0 0 ${B} ${H}`} role="img" aria-label={titel}>
        {banden.map((b, i) => {
          const yy = m.t + i * rij + 6;
          const links = Math.min(b.laag, b.hoog);
          const rechts = Math.max(b.laag, b.hoog);
          return (
            <g key={b.label}>
              <text x={m.l - 10} y={yy + 15} textAnchor="end" style={{ fill: 'var(--tekst-2)' }}>
                {b.label}
              </text>
              <rect x={x(links)} y={yy} width={Math.max(2, x(rechts) - x(links))} height={rij - 14} rx={4} fill="#5760A6" opacity={0.85} />
              <text className="waardelabel" x={x(rechts) + 6} y={yy + 15}>
                {formatX(links)} – {formatX(rechts)}
              </text>
            </g>
          );
        })}
        <line x1={x(basis)} x2={x(basis)} y1={m.t} y2={H - m.b + 4} stroke={vergelijkingKleur} strokeDasharray="6 4" strokeWidth={2} />
        <text x={x(basis)} y={H - 6} textAnchor="middle">
          basis {formatX(basis)}
        </text>
      </svg>
    </figure>
  );
}

/** Horizontale balken voor percentages (bijv. weging van criteria). */
export function PercentageBalken({ items }: { items: { label: string; pct: number }[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
      {items.map((it) => (
        <li key={it.label} style={{ display: 'grid', gap: 4 }}>
          <span className="schuif-kop">
            <span style={{ fontWeight: 600 }}>{it.label}</span>
            <span className="num" style={{ color: 'var(--donkerviolet)', fontWeight: 600 }}>
              {Math.round(it.pct)} %
            </span>
          </span>
          <span style={{ display: 'block', height: 10, background: 'var(--kaartvlak)', borderRadius: 4, overflow: 'hidden' }} aria-hidden="true">
            <span style={{ display: 'block', height: '100%', width: `${it.pct}%`, background: 'var(--paars)', borderRadius: 4 }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
