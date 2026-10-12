import { useState } from 'react';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { LijnGrafiek } from '../../components/grafiek/Grafieken';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { GetalVeld, Kaart, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import { co2Standaard } from '../../data/standaardwaarden';
import { co2Heffing, co2Meerjarig } from '../../lib/calc/co2';
import { euro, getal, metEenheid, procent } from '../../lib/format';

const FORMULE = 'heffing = max(0, tonnage × emissiefactor − vrijgestelde uitstoot) × heffingstarief';

export function Co2Heffingenscan() {
  const [tonnage, setTonnage] = useState(co2Standaard.tonnage);
  const [emissiefactor, setEmissiefactor] = useState(co2Standaard.emissiefactor);
  const [heffing, setHeffing] = useState(co2Standaard.heffing);
  const [vrijstelling, setVrijstelling] = useState(co2Standaard.vrijstelling);
  const u = co2Heffing({ tonnage, emissiefactor, heffing, vrijstelling });

  return (
    <>
      <RapportKop titel="CO2-heffingenscan" />
      <PaginaKop titel="CO2-heffingenscan" badges={<ToegangBadge toegang="gratis+pro" />}>
        Een eerste schatting van wat een CO2-heffing op afvalverbranding kost bij uw tonnage restafval. Alle
        standaardwaarden zijn voorbeeldwaarden, geen actuele tarieven.
      </PaginaKop>

      <h2 className="sectie" style={{ marginBottom: 12 }}>
        Gratis voorbeeld
      </h2>
      <div className="raster raster-tool">
        <Kaart titel="Invoer" className="invoerkaart">
          <div className="velden">
            <GetalVeld label="Restafval" eenheid="ton/jaar" waarde={tonnage} onChange={setTonnage} />
            <GetalVeld label="Emissiefactor" eenheid="t CO2/t" waarde={emissiefactor} onChange={setEmissiefactor} hint="Ton CO2 per ton verbrand restafval." />
            <GetalVeld label="Heffing" eenheid="€/t CO2" waarde={heffing} onChange={setHeffing} />
            <GetalVeld label="Vrijgestelde uitstoot" eenheid="t CO2/jaar" waarde={vrijstelling} onChange={setVrijstelling} />
            <p className="notitie">Voorbeeldwaarden, geen actuele tarieven.</p>
          </div>
        </Kaart>
        <Uitkomst
          formule={FORMULE}
          toelichting="Aanname: de vrijgestelde hoeveelheid is in ton CO2 en gaat af van de uitstoot voordat de heffing wordt berekend."
          invoer={[
            { label: 'Restafval', waarde: metEenheid(tonnage, 'ton/jaar') },
            { label: 'Emissiefactor', waarde: metEenheid(emissiefactor, 't CO2/t', 2) },
            { label: 'Heffing', waarde: `${euro(heffing, 2)}/t CO2` },
            { label: 'Vrijgestelde uitstoot', waarde: metEenheid(vrijstelling, 't CO2') },
          ]}
        >
          <div className="tegels">
            <Tegel label="Heffing per jaar" waarde={euro(u.kosten)} toelichting="voorbeeld" hero />
            <Tegel label="Uitstoot" waarde={metEenheid(u.uitstoot, 't CO2')} toelichting={`waarvan ${getal(u.belastbaar)} t belast`} />
            <Tegel label="Per ton restafval" waarde={euro(tonnage > 0 ? u.kosten / tonnage : 0, 2)} toelichting="gemiddeld" />
          </div>
        </Uitkomst>
      </div>

      <h2 className="sectie" style={{ margin: '28px 0 12px' }}>
        Pro voor leden
      </h2>
      <Vergrendeld
        titel="CO2-heffingenscan Pro"
        ledenKrijgen={['Meerjarig verloop van de heffing', 'Scenario’s voor scheidingspercentages', 'Effect per inwoner', 'Rapport maken']}
      >
        <Co2Pro tonnage={tonnage} emissiefactor={emissiefactor} heffing={heffing} vrijstelling={vrijstelling} />
      </Vergrendeld>
      <RapportVoet />
    </>
  );
}

function Co2Pro({ tonnage, emissiefactor, heffing, vrijstelling }: { tonnage: number; emissiefactor: number; heffing: number; vrijstelling: number }) {
  const [inwoners, setInwoners] = useState(co2Standaard.inwoners);
  const [scheidingNu, setScheidingNu] = useState(co2Standaard.scheidingNuPct);
  const [scenario2, setScenario2] = useState(co2Standaard.scenarioPct[1]);
  const [scenario3, setScenario3] = useState(co2Standaard.scenarioPct[2]);
  const [startjaar, setStartjaar] = useState(co2Standaard.startjaar);
  const [aantalJaren, setAantalJaren] = useState(co2Standaard.aantalJaren);
  const [stijging, setStijging] = useState(co2Standaard.stijgingPerJaar);

  const basis = {
    tonnage,
    emissiefactor,
    vrijstelling,
    inwoners,
    scheidingNuPct: scheidingNu,
    startjaar: Math.round(startjaar),
    aantalJaren: Math.max(1, Math.min(15, Math.round(aantalJaren))),
    startHeffing: heffing,
    stijgingPerJaar: stijging,
  };
  const scenarios = [
    { naam: `Huidig (${procent(scheidingNu, 0)} scheiding)`, kort: 'Huidig', pct: scheidingNu },
    { naam: `Scenario ${procent(scenario2, 0)} scheiding`, kort: procent(scenario2, 0), pct: scenario2 },
    { naam: `Scenario ${procent(scenario3, 0)} scheiding`, kort: procent(scenario3, 0), pct: scenario3 },
  ].map((s) => ({ ...s, regels: co2Meerjarig(basis, s.pct) }));
  const jaren = scenarios[0].regels.map((r) => r.jaar);
  const laatste = jaren.length - 1;

  return (
    <div className="stapel">
      <Kaart titel="Uitgangspunten Pro" kopNiveau={3} className="invoerkaart" sub="Restafval, emissiefactor, heffing en vrijstelling komen uit het gratis voorbeeld hierboven.">
        <div className="velden-2">
          <GetalVeld label="Inwoners" eenheid="inw" waarde={inwoners} onChange={setInwoners} />
          <GetalVeld label="Huidig scheidingspercentage" eenheid="%" max={99} waarde={scheidingNu} onChange={setScheidingNu} />
          <GetalVeld label="Scenario 2: scheidingspercentage" eenheid="%" max={99} waarde={scenario2} onChange={setScenario2} />
          <GetalVeld label="Scenario 3: scheidingspercentage" eenheid="%" max={99} waarde={scenario3} onChange={setScenario3} />
          <GetalVeld label="Eerste jaar" eenheid="jaar" min={2020} max={2050} waarde={startjaar} onChange={setStartjaar} />
          <GetalVeld label="Aantal jaren" eenheid="jaar" min={1} max={15} waarde={aantalJaren} onChange={setAantalJaren} />
          <GetalVeld label="Stijging heffing per jaar" eenheid="€/t CO2" waarde={stijging} onChange={setStijging} hint="Fictief oplopend pad." />
        </div>
      </Kaart>

      <Uitkomst
        titel="Meerjarig verloop en scenario’s"
        formule={`${FORMULE}\nheffingstarief_t = startheffing + stijging × (t − eerste jaar)\nrestafval_scenario = restafval × (100 − scheiding_scenario) / (100 − scheiding_huidig)\nper inwoner = heffing / inwoners`}
        invoer={[
          { label: 'Restafval (huidig)', waarde: metEenheid(tonnage, 'ton/jaar') },
          { label: 'Emissiefactor', waarde: metEenheid(emissiefactor, 't CO2/t', 2) },
          { label: 'Vrijgestelde uitstoot', waarde: metEenheid(vrijstelling, 't CO2') },
          { label: 'Startheffing', waarde: `${euro(heffing, 2)}/t CO2` },
          { label: 'Stijging per jaar', waarde: `${euro(stijging, 2)}/t CO2` },
          { label: 'Inwoners', waarde: getal(inwoners) },
          { label: 'Scheiding huidig / scenario 2 / 3', waarde: `${procent(scheidingNu, 0)} / ${procent(scenario2, 0)} / ${procent(scenario3, 0)}` },
        ]}
      >
        <div className="stapel">
          <div className="tegels">
            {scenarios.map((s, i) => (
              <Tegel
                key={s.naam}
                label={`${s.kort} · ${jaren[laatste]}`}
                waarde={euro(s.regels[laatste].perInwoner, 2)}
                toelichting={`per inwoner · ${euro(s.regels[laatste].kosten)} totaal`}
                hero={i === 0}
              />
            ))}
          </div>
          <LijnGrafiek
            titel="Heffing per jaar per scenario"
            labels={jaren}
            reeksen={scenarios.map((s) => ({ naam: s.naam, waarden: s.regels.map((r) => r.kosten) }))}
            formatY={(n) => euro(n)}
          />
          <div className="tabel-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  <th scope="col" className="num">
                    Tarief €/t CO2
                  </th>
                  {scenarios.map((s) => (
                    <th key={s.naam} scope="col" className="num">
                      {s.kort}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jaren.map((jaar, j) => (
                  <tr key={jaar}>
                    <td>{jaar}</td>
                    <td className="num">{euro(scenarios[0].regels[j].heffing, 2)}</td>
                    {scenarios.map((s) => (
                      <td key={s.naam} className="num">
                        {euro(s.regels[j].kosten)}
                        <br />
                        <span className="muted klein">{euro(s.regels[j].perInwoner, 2)}/inw</span>
                      </td>
                    ))}
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
