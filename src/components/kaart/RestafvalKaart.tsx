import './kaart.css';
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { gemeenten as alleGemeenten, grenzenBron, type GemeenteAfval } from '../../data/gemeenten';
import { indicatoren, kleurVan, KLEUR_GEEN, waardeVan, type IndicatorId } from '../../lib/kaartdata';
import { getal } from '../../lib/format';

/** Geprojecteerde gemeentevlakken uit public/data/gemeentekaart.json (scripts/pdok-gemeentekaart.mjs). */
interface KaartVlak {
  /** CBS-gemeentecode */
  c: string;
  /** naam volgens PDOK */
  n: string;
  /** omhullende rechthoek [x0, y0, x1, y1] */
  b: [number, number, number, number];
  /** SVG-pad */
  d: string;
}
interface KaartData {
  breedte: number;
  hoogte: number;
  gemeenten: KaartVlak[];
}

// Eén keer ophalen per bezoek; de kaart op de homepage en op de kaartpagina delen het resultaat.
let kaartBelofte: Promise<KaartData> | null = null;
function laadKaart(): Promise<KaartData> {
  if (!kaartBelofte) {
    kaartBelofte = fetch(grenzenBron.kaartbestand).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<KaartData>;
    });
    kaartBelofte.catch(() => {
      kaartBelofte = null;
    });
  }
  return kaartBelofte;
}

const MAX_ZOOM = 12;
const RAND_GEEN = '#6b7280';

interface Beeld {
  /** middelpunt in kaarteenheden */
  cx: number;
  cy: number;
  zoom: number;
}

interface Props {
  /** Standaard alle gemeenten. */
  gemeenten?: GemeenteAfval[];
  indicator: IndicatorId;
  geselecteerd?: string | null;
  onSelecteer?: (code: string) => void;
  /** Verandert dit getal, dan zoomt de kaart naar de geselecteerde gemeente. */
  zoomVerzoek?: number;
  /** Kleine, stilstaande versie voor de homepage. */
  mini?: boolean;
  /** Tekstalternatief voor de kaart als geheel. */
  titel: string;
}

/**
 * Choropleet per gemeente als gewone SVG. Muis en aanraking: klikken kiest een gemeente, slepen
 * verschuift de kaart als die is ingezoomd. Toetsenbord: alleen de zoomknoppen zijn bedienbaar;
 * gemeenten kies je met het zoekveld of de tabel (die tonen dezelfde cijfers). Zo is de kaart
 * geen reeks van honderden tabstops.
 */
export function RestafvalKaart({ gemeenten = alleGemeenten, indicator, geselecteerd = null, onSelecteer, zoomVerzoek = 0, mini = false, titel }: Props) {
  const id = useId();
  const [data, setData] = useState<KaartData | null>(null);
  const [fout, setFout] = useState(false);
  const [beeld, setBeeld] = useState<Beeld | null>(null);
  const [zweef, setZweef] = useState<{ code: string; x: number; y: number } | null>(null);
  const vakRef = useRef<HTMLDivElement>(null);
  const sleep = useRef<{ px: number; py: number; cx: number; cy: number; bewogen: boolean; pointer: number } | null>(null);

  useEffect(() => {
    let actief = true;
    laadKaart()
      .then((d) => {
        if (!actief) return;
        setData(d);
        setBeeld({ cx: d.breedte / 2, cy: d.hoogte / 2, zoom: 1 });
      })
      .catch(() => actief && setFout(true));
    return () => {
      actief = false;
    };
  }, []);

  const perCode = useMemo(() => new Map(gemeenten.map((g) => [g.code, g])), [gemeenten]);
  const vlakPerCode = useMemo(() => new Map((data?.gemeenten ?? []).map((v) => [v.c, v])), [data]);

  /** Houdt het middelpunt binnen de kaart. */
  const begrens = useCallback(
    (b: Beeld): Beeld => {
      if (!data) return b;
      const zoom = Math.min(MAX_ZOOM, Math.max(1, b.zoom));
      const halfB = data.breedte / zoom / 2;
      const halfH = data.hoogte / zoom / 2;
      return {
        zoom,
        cx: Math.min(data.breedte - halfB, Math.max(halfB, b.cx)),
        cy: Math.min(data.hoogte - halfH, Math.max(halfH, b.cy)),
      };
    },
    [data],
  );

  // Zoomen naar de gekozen gemeente (na zoeken of kiezen in de tabel).
  useEffect(() => {
    if (!zoomVerzoek || !geselecteerd || !data) return;
    const v = vlakPerCode.get(geselecteerd);
    if (!v) return;
    const [x0, y0, x1, y1] = v.b;
    const zoom = Math.min(8, data.breedte / Math.max((x1 - x0) * 2.2, 1), data.hoogte / Math.max((y1 - y0) * 2.2, 1));
    setBeeld(begrens({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, zoom }));
  }, [zoomVerzoek, geselecteerd, data, vlakPerCode, begrens]);

  if (fout) {
    return (
      <div className="kaart-melding" role="alert">
        De kaart kon niet worden geladen. De cijfers staan wel in de tabel{mini ? ' op de kaartpagina' : ' hieronder'}.
      </div>
    );
  }

  const ind = indicatoren[indicator];
  const viewBox =
    data && beeld
      ? (() => {
          const w = data.breedte / beeld.zoom;
          const h = data.hoogte / beeld.zoom;
          return `${(beeld.cx - w / 2).toFixed(1)} ${(beeld.cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
        })()
      : '0 0 2000 2358';

  /** Kaarteenheden per schermpixel (de SVG schaalt met 'meet'). */
  const eenhedenPerPixel = () => {
    const vak = vakRef.current?.getBoundingClientRect();
    if (!vak || !data || !beeld) return 1;
    return Math.max(data.breedte / beeld.zoom / vak.width, data.hoogte / beeld.zoom / vak.height);
  };

  const codeOnder = (e: { target: EventTarget }) => (e.target as Element).getAttribute?.('data-c') ?? null;

  const interactief = !mini && !!data;
  const handlers = interactief
    ? {
        onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
          if (!beeld || e.button !== 0) return;
          sleep.current = { px: e.clientX, py: e.clientY, cx: beeld.cx, cy: beeld.cy, bewogen: false, pointer: e.pointerId };
        },
        onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
          const s = sleep.current;
          if (s && s.pointer === e.pointerId && beeld && beeld.zoom > 1) {
            const dx = e.clientX - s.px;
            const dy = e.clientY - s.py;
            if (!s.bewogen && Math.hypot(dx, dy) > 4) {
              s.bewogen = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            if (s.bewogen) {
              const f = eenhedenPerPixel();
              setBeeld(begrens({ zoom: beeld.zoom, cx: s.cx - dx * f, cy: s.cy - dy * f }));
              setZweef(null);
              return;
            }
          }
          if (e.pointerType !== 'mouse') return;
          const code = codeOnder(e);
          const vak = vakRef.current?.getBoundingClientRect();
          if (!code || !vak) setZweef(null);
          else setZweef({ code, x: e.clientX - vak.left, y: e.clientY - vak.top });
        },
        onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => {
          const s = sleep.current;
          sleep.current = null;
          if (s?.bewogen) return;
          const code = codeOnder(e);
          if (code) onSelecteer?.(code);
        },
        onPointerCancel: () => {
          sleep.current = null;
        },
        onPointerLeave: () => setZweef(null),
      }
    : {};

  const zoomMet = (factor: number) => beeld && setBeeld(begrens({ ...beeld, zoom: beeld.zoom * factor }));
  const gekozenVlak = geselecteerd ? vlakPerCode.get(geselecteerd) : undefined;
  const zweefVlak = zweef ? vlakPerCode.get(zweef.code) : undefined;
  const zweefGemeente = zweef ? perCode.get(zweef.code) : undefined;
  const zweefWaarde = zweefGemeente ? waardeVan(zweefGemeente, indicator) : null;

  return (
    <div className={`svgkaart${mini ? ' mini' : ''}${beeld && beeld.zoom > 1 ? ' ingezoomd' : ''}`} ref={vakRef}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby={`${id}-titel`}
        aria-describedby={mini ? undefined : `${id}-uitleg`}
        {...handlers}
      >
        <title id={`${id}-titel`}>{titel}</title>
        {!mini && (
          <desc id={`${id}-uitleg`}>
            De kaart is met de muis of door aantikken te bedienen. Met het toetsenbord kiest u een gemeente via het zoekveld of de tabel; die tonen
            dezelfde cijfers.
          </desc>
        )}
        {data && <Vlakken data={data} perCode={perCode} indicator={indicator} />}
        {zweefVlak && zweefVlak !== gekozenVlak && (
          <path d={zweefVlak.d} className="zweef" fill="none" stroke="#111827" strokeWidth={1.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        )}
        {gekozenVlak && (
          <g pointerEvents="none">
            <path d={gekozenVlak.d} fill="none" stroke="#ffffff" strokeWidth={5} vectorEffect="non-scaling-stroke" />
            <path d={gekozenVlak.d} fill="none" stroke="#111827" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>

      {!data && (
        <div className="kaart-laden" role="status">
          Kaart laden…
        </div>
      )}

      {zweef && zweefGemeente && (
        <div className="kaart-tip" style={{ left: zweef.x, top: zweef.y }} aria-hidden="true">
          <strong>{zweefGemeente.naam}</strong>
          <span>
            {ind.kort}: {zweefWaarde === null ? 'geen cijfer' : `${getal(zweefWaarde, ind.decimalen)} ${ind.eenheid}`}
          </span>
        </div>
      )}

      {!mini && data && beeld && (
        <div className="kaart-zoom">
          <button type="button" onClick={() => zoomMet(1.6)} disabled={beeld.zoom >= MAX_ZOOM} aria-label="Inzoomen">
            <span aria-hidden="true">+</span>
          </button>
          <button type="button" onClick={() => zoomMet(1 / 1.6)} disabled={beeld.zoom <= 1} aria-label="Uitzoomen">
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            className="tekst"
            onClick={() => setBeeld({ cx: data.breedte / 2, cy: data.hoogte / 2, zoom: 1 })}
            disabled={beeld.zoom <= 1}
          >
            Heel Nederland
          </button>
        </div>
      )}
      <p className="kaart-attributie">Grenzen: CBS/Kadaster via PDOK ({grenzenBron.jaar}) · Cijfers: CBS</p>
    </div>
  );
}

/** Alle gemeentevlakken; alleen opnieuw tekenen als indicator of cijfers veranderen, niet bij zweven. */
const Vlakken = memo(function Vlakken({
  data,
  perCode,
  indicator,
}: {
  data: KaartData;
  perCode: Map<string, GemeenteAfval>;
  indicator: IndicatorId;
}) {
  return (
    <g className="vlakken" stroke="#ffffff" strokeWidth={0.6} strokeLinejoin="round">
      {data.gemeenten.map((v) => {
        const kleur = kleurVan(perCode.get(v.c), indicator);
        const geen = kleur === KLEUR_GEEN;
        return (
          <path
            key={v.c}
            d={v.d}
            data-c={v.c}
            fill={kleur}
            fillRule="evenodd"
            vectorEffect="non-scaling-stroke"
            stroke={geen ? RAND_GEEN : undefined}
            strokeDasharray={geen ? '3 2' : undefined}
          />
        );
      })}
    </g>
  );
});
