import { useState } from 'react';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { LijnGrafiek } from '../../components/grafiek/Grafieken';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import { indexJaren, indexreeksen, laatsteIndexjaar, standaardWeging } from '../../data/indexreeksen';
import { indexStandaard } from '../../data/standaardwaarden';
import { indexFactor, somWegingen, tariefPerJaar, type Reeks } from '../../lib/calc/indexering';
import { euro, getal, leesGetal, procent, toonInInvoer } from '../../lib/format';

const FORMULE = 'nieuw tarief = basistarief × Σ(weging_i × index_i,nu / index_i,basis)';

export function Indexcalculator() {
  const [basistarief, setBasistarief] = useState(indexStandaard.basistarief);
  const [startjaar, setStartjaar] = useState(indexStandaard.startjaar);

  const onderdelen = indexreeksen.map((r) => ({
    naam: r.naam,
    weging: standaardWeging[r.id],
    basis: r.waarden[startjaar],
    nu: r.waarden[laatsteIndexjaar],
  }));
  const factor = indexFactor(onderdelen);
  const tarief = basistarief * factor;
  const jaarOpties = indexJaren.filter((j) => j < laatsteIndexjaar).map((j) => ({ waarde: j, label: String(j) }));

  return (
    <>
      <RapportKop titel="Indexcalculator" />
      <PaginaKop titel="Indexcalculator" badges={<ToegangBadge toegang="gratis+pro" />}>
        Hoe beweegt een verwerkingstarief mee met loon, energie en prijzen? De gratis versie rekent één voorbeeld met een
        vaste weging. De indexreeksen zijn fictief.
      </PaginaKop>

      <h2 className="sectie" style={{ marginBottom: 12 }}>
        Gratis voorbeeld
      </h2>
      <div className="raster raster-tool">
        <Kaart titel="Invoer" className="invoerkaart">
          <div className="velden">
            <GetalVeld label="Basistarief" eenheid="€/ton" waarde={basistarief} onChange={setBasistarief} hint="Tarief in het startjaar van het contract." />
            <KeuzeVeld label="Startjaar (basisjaar index)" waarde={startjaar} opties={jaarOpties} onChange={setStartjaar} />
            <p className="klein muted">
              Rekenjaar: {laatsteIndexjaar}. Vaste weging: {indexreeksen.map((r) => `${r.naam.toLowerCase()} ${Math.round(standaardWeging[r.id] * 100)} %`).join(', ')}.
            </p>
          </div>
        </Kaart>
        <Uitkomst
          formule={FORMULE}
          invoer={[
            { label: 'Basistarief', waarde: `${euro(basistarief, 2)}/ton` },
            { label: 'Basisjaar → rekenjaar', waarde: `${startjaar} → ${laatsteIndexjaar}` },
            ...onderdelen.map((o) => ({
              label: `${o.naam} (weging ${Math.round(o.weging * 100)} %)`,
              waarde: `${getal(o.basis, 1)} → ${getal(o.nu, 1)}`,
            })),
          ]}
        >
          <div className="tegels">
            <Tegel label={`Tarief ${laatsteIndexjaar}`} waarde={euro(tarief, 2)} toelichting="per ton" hero />
            <Tegel label="Indexfactor" waarde={getal(factor, 4)} toelichting={`t.o.v. ${startjaar}`} />
            <Tegel label="Stijging" waarde={procent((factor - 1) * 100)} toelichting={`${euro(tarief - basistarief, 2)} per ton`} />
          </div>
        </Uitkomst>
      </div>

      <h2 className="sectie" style={{ margin: '28px 0 12px' }}>
        Pro voor leden
      </h2>
      <Vergrendeld
        titel="Indexcalculator Pro"
        ledenKrijgen={[
          'Eigen wegingen en eigen indexreeksen invoeren',
          'Tarief per contractjaar in tabel en grafiek',
          'Rapport maken met invoer, formule en uitkomst',
        ]}
      >
        <IndexPro basistarief={basistarief} startjaar={startjaar} />
      </Vergrendeld>
      <RapportVoet />
    </>
  );
}

function IndexPro({ basistarief, startjaar }: { basistarief: number; startjaar: number }) {
  const [wegingPct, setWegingPct] = useState<Record<string, number>>(() =>
    Object.fromEntries(indexreeksen.map((r) => [r.id, standaardWeging[r.id] * 100])),
  );
  const [waarden, setWaarden] = useState<Record<string, Record<number, number>>>(() =>
    Object.fromEntries(indexreeksen.map((r) => [r.id, { ...r.waarden }])),
  );

  const reeksen: Reeks[] = indexreeksen.map((r) => ({ naam: r.naam, weging: wegingPct[r.id] / 100, waarden: waarden[r.id] }));
  const som = somWegingen(reeksen);
  const klopt = Math.abs(som - 1) < 1e-6;
  const jaren = tariefPerJaar(basistarief, reeksen, startjaar, laatsteIndexjaar);
  const aangepast = indexreeksen.some((r) => indexJaren.some((j) => waarden[r.id][j] !== r.waarden[j]));
  const alleenCpi = tariefPerJaar(basistarief, [{ naam: 'cpi', weging: 1, waarden: waarden.cpi }], startjaar, laatsteIndexjaar);

  function zetWaarde(id: string, jaar: number, tekst: string) {
    const n = leesGetal(tekst);
    if (Number.isFinite(n) && n > 0) setWaarden((w) => ({ ...w, [id]: { ...w[id], [jaar]: n } }));
  }

  return (
    <div className="stapel">
      <div className="raster raster-2">
        <Kaart titel="Eigen weging" kopNiveau={3} className="invoerkaart">
          <div className="velden">
            {indexreeksen.map((r) => (
              <GetalVeld key={r.id} label={r.naam} eenheid="%" max={100} waarde={wegingPct[r.id]} onChange={(n) => setWegingPct((w) => ({ ...w, [r.id]: n }))} />
            ))}
            <p className={`notitie ${klopt ? 'succes' : ''}`} role="status">
              {klopt ? '✓ ' : '⚠ '}Samen {procent(som * 100, 0)}
              {klopt ? '' : ': de weging moet samen 100 % zijn. De uitkomst rekent nu met deze weging.'}
            </p>
          </div>
        </Kaart>
        <Kaart titel="Eigen indexreeksen" kopNiveau={3} sub="Pas de indexwaarden per jaar aan." className="invoerkaart">
          <div className="tabel-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  {indexreeksen.map((r) => (
                    <th key={r.id} scope="col">
                      {r.naam}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {indexJaren.map((j) => (
                  <tr key={j}>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      {j}
                    </th>
                    {indexreeksen.map((r) => (
                      <td key={r.id}>
                        <div className="invoer">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`${r.naam} ${j}`}
                            defaultValue={toonInInvoer(waarden[r.id][j])}
                            onChange={(e) => zetWaarde(r.id, j, e.target.value)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kaart>
      </div>

      <Uitkomst
        titel="Tarief per contractjaar"
        formule={`${FORMULE}\nper jaar t: index_i,nu = index_i,t ; index_i,basis = index_i,${startjaar}`}
        invoer={[
          { label: 'Basistarief', waarde: `${euro(basistarief, 2)}/ton` },
          { label: 'Startjaar', waarde: String(startjaar) },
          ...indexreeksen.map((r) => ({ label: `Weging ${r.naam.toLowerCase()}`, waarde: procent(wegingPct[r.id], 0) })),
          { label: 'Indexreeksen', waarde: aangepast ? 'eigen invoer (aangepast)' : 'fictieve standaardreeksen' },
        ]}
      >
        <div className="stapel">
          <LijnGrafiek
            titel="Tarief per jaar met gewogen index, vergeleken met alleen consumentenprijzen"
            labels={jaren.map((j) => j.jaar)}
            reeksen={[
              { naam: 'Tarief met gewogen index', waarden: jaren.map((j) => j.tarief) },
              { naam: 'Vergelijking: alleen consumentenprijzen', waarden: alleenCpi.map((j) => j.tarief), vergelijking: true },
            ]}
            formatY={(n) => euro(n)}
            vanafNul={false}
          />
          <div className="tabel-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  <th scope="col" className="num">
                    Indexfactor
                  </th>
                  <th scope="col" className="num">
                    Tarief per ton
                  </th>
                  <th scope="col" className="num">
                    Stijging t.o.v. vorig jaar
                  </th>
                </tr>
              </thead>
              <tbody>
                {jaren.map((j) => (
                  <tr key={j.jaar}>
                    <td>{j.jaar}</td>
                    <td className="num">{getal(j.factor, 4)}</td>
                    <td className="num">{euro(j.tarief, 2)}</td>
                    <td className="num">{j.stijgingPct === null ? '–' : procent(j.stijgingPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <RapportKnop />
        </div>
      </Uitkomst>
    </div>
  );
}
