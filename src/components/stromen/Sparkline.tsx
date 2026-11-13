import type { Punt } from '../../lib/stromen';

/** Kleine lijn zonder as; decoratief, de tekst eromheen geeft de cijfers. */
export function Sparkline({ reeks }: { reeks: Punt[] }) {
  if (reeks.length < 2) return null;
  const w = 240;
  const h = 44;
  const min = Math.min(...reeks.map((p) => p.waarde));
  const max = Math.max(...reeks.map((p) => p.waarde));
  const span = max - min || 1;
  const x = (i: number) => 3 + (i * (w - 6)) / (reeks.length - 1);
  const y = (v: number) => 4 + (1 - (v - min) / span) * (h - 8);
  const punten = reeks.map((p, i) => `${x(i).toFixed(1)},${y(p.waarde).toFixed(1)}`).join(' ');
  const laatste = reeks[reeks.length - 1];
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polyline points={punten} fill="none" stroke="#5760A6" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={x(reeks.length - 1)} cy={y(laatste.waarde)} r={3.5} fill="#5760A6" />
    </svg>
  );
}
