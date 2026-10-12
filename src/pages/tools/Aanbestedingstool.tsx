import { useRef, useState } from 'react';
import { PercentageBalken } from '../../components/grafiek/Grafieken';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { GetalVeld, Kaart, KeuzeVeld, PaginaKop, Schuif, ToegangBadge } from '../../components/ui';
import { aanbestedingStandaard, stromen } from '../../data/standaardwaarden';
import { checklist, criteria, criteriumLabel, normaliseerWeging, type Criterium } from '../../lib/calc/aanbesteding';
import { getal, metEenheid } from '../../lib/format';

const stappen = ['Scope', 'Criteria', 'Resultaat'];

export function Aanbestedingstool() {
  const [stap, setStap] = useState(0);
  const [stroom, setStroom] = useState(aanbestedingStandaard.stroom);
  const [looptijd, setLooptijd] = useState(aanbestedingStandaard.looptijdJaren);
  const [verlenging, setVerlenging] = useState(aanbestedingStandaard.verlengingJaren);
  const [volume, setVolume] = useState(aanbestedingStandaard.volumeTon);
  const [schuiven, setSchuiven] = useState<Record<Criterium, number>>(aanbestedingStandaard.schuiven);
  const kopRef = useRef<HTMLHeadingElement>(null);

  const weging = normaliseerWeging(schuiven);
  const scope = { stroom, looptijdJaren: looptijd, verlengingJaren: verlenging, volumeTon: volume };
  const punten = checklist(scope, weging);
  const gesorteerd = [...criteria].sort((a, b) => weging[b] - weging[a]);

  function gaNaar(n: number) {
    setStap(n);
    requestAnimationFrame(() => kopRef.current?.focus());
  }

  return (
    <>
      <RapportKop titel="Aanbestedingstool" />
      <PaginaKop
        titel="Aanbestedingstool"
        badges={
          <>
            <ToegangBadge toegang="gratis" />
            <span className="badge">In ontwikkeling met CE Delft, publiek beschikbaar</span>
          </>
        }
      >
        Bereid een aanbesteding voor afvalverwerking voor in drie stappen: scope, gunningscriteria en een checklist. Dit is
        een dummyversie om de opzet te laten zien.
      </PaginaKop>

      <ol className="stappen geen-print" aria-label="Stappen">
        {stappen.map((s, i) => (
          <li key={s} aria-current={i === stap ? 'step' : undefined} data-klaar={i < stap}>
            {s}
          </li>
        ))}
      </ol>

      {stap === 0 && (
        <Kaart className="invoerkaart">
          <h2 ref={kopRef} tabIndex={-1} className="kaart-kop" style={{ borderLeft: '4px solid var(--paars)', paddingLeft: 12 }}>
            Stap 1 · Scope
          </h2>
          <div className="velden-2">
            <KeuzeVeld label="Afvalstroom" waarde={stroom} opties={stromen.map((s) => ({ waarde: s, label: s }))} onChange={setStroom} />
            <GetalVeld label="Volume" eenheid="ton/jaar" waarde={volume} onChange={setVolume} />
            <GetalVeld label="Looptijd" eenheid="jaar" min={1} max={20} waarde={looptijd} onChange={setLooptijd} />
            <GetalVeld label="Verlengingsopties" eenheid="jaar" max={10} waarde={verlenging} onChange={setVerlenging} hint="Totaal aantal jaren dat de opdrachtgever kan verlengen." />
          </div>
          <div className="knoppen">
            <button type="button" className="primair" onClick={() => gaNaar(1)}>
              Volgende: criteria
            </button>
          </div>
        </Kaart>
      )}

      {stap === 1 && (
        <div className="raster raster-tool">
          <Kaart className="invoerkaart">
            <h2 ref={kopRef} tabIndex={-1} className="kaart-kop" style={{ borderLeft: '4px solid var(--paars)', paddingLeft: 12 }}>
              Stap 2 · Gunningscriteria
            </h2>
            <p className="klein muted">Zet de schuifjes naar hoe belangrijk u elk criterium vindt. De tool rekent dat om naar een weging van samen 100 %.</p>
            <div className="velden">
              {criteria.map((c) => (
                <Schuif
                  key={c}
                  label={criteriumLabel[c]}
                  waarde={schuiven[c]}
                  onChange={(n) => setSchuiven((s) => ({ ...s, [c]: n }))}
                  weergave={`${schuiven[c]} punten → ${Math.round(weging[c])} %`}
                />
              ))}
            </div>
            <div className="knoppen">
              <button type="button" onClick={() => gaNaar(0)}>
                Vorige
              </button>
              <button type="button" className="primair" onClick={() => gaNaar(2)}>
                Volgende: resultaat
              </button>
            </div>
          </Kaart>
          <Kaart titel="Weging" kopNiveau={3}>
            <PercentageBalken items={criteria.map((c) => ({ label: criteriumLabel[c], pct: weging[c] }))} />
          </Kaart>
        </div>
      )}

      {stap === 2 && (
        <div className="stapel">
          <h2 ref={kopRef} tabIndex={-1} className="visueel-verborgen">
            Stap 3 · Resultaat
          </h2>
          <div className="raster raster-tool">
            <Uitkomst
              titel="Samenvatting weging"
              formule="weging_i = schuif_i / Σ schuif × 100 %"
              invoer={[
                { label: 'Afvalstroom', waarde: stroom },
                { label: 'Volume', waarde: metEenheid(volume, 'ton/jaar') },
                { label: 'Looptijd', waarde: `${getal(looptijd)} jaar + ${getal(verlenging)} jaar verlenging` },
                ...criteria.map((c) => ({ label: `Schuif ${criteriumLabel[c].toLowerCase()}`, waarde: `${schuiven[c]} punten` })),
              ]}
            >
              <div className="stapel">
                <p>
                  Aanbesteding voor <strong>{stroom.toLowerCase()}</strong>, circa {metEenheid(volume, 'ton')} per jaar, looptijd{' '}
                  {getal(looptijd)} jaar met {getal(verlenging)} jaar verlengingsoptie. Het zwaarst weegt{' '}
                  <strong>{criteriumLabel[gesorteerd[0]].toLowerCase()}</strong> ({Math.round(weging[gesorteerd[0]])} %).
                </p>
                <PercentageBalken items={gesorteerd.map((c) => ({ label: criteriumLabel[c], pct: weging[c] }))} />
              </div>
            </Uitkomst>
            <Kaart titel="Checklist" sub="Voorbeeld, geen juridisch advies">
              <ul className="vinklijst">
                {punten.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Kaart>
          </div>
          <div className="knoppen geen-print">
            <button type="button" onClick={() => gaNaar(1)}>
              Vorige
            </button>
            <button type="button" onClick={() => gaNaar(0)}>
              Opnieuw beginnen
            </button>
          </div>
          <RapportKnop />
        </div>
      )}
      <RapportVoet />
    </>
  );
}
