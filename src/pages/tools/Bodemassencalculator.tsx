import { useState } from 'react';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { BandGrafiek } from '../../components/grafiek/Grafieken';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import { bodemasInstallatiesStandaard, bodemasStandaard } from '../../data/standaardwaarden';
import { bodemas, bodemasInstallaties, gevoeligheid, type BodemasParameter, type Installatie } from '../../lib/calc/bodemas';
import { euro, getal, leesGetal, metEenheid, procent, toonInInvoer } from '../../lib/format';

const FORMULE = 'netto kosten = verbrand tonnage × aandeel bodemas × (verwerkingskosten − opbrengst metalen)';

const parameterLabel: Record<BodemasParameter, string> = {
  tonnageVerbrand: 'Verbrand tonnage',
  aandeelBodemasPct: 'Aandeel bodemas',
  verwerkingskosten: 'Verwerkingskosten',
  metaalopbrengst: 'Opbrengst metalen',
};

export function Bodemassencalculator() {
  const [tonnageVerbrand, setTonnage] = useState(bodemasStandaard.tonnageVerbrand);
  const [aandeelBodemasPct, setAandeel] = useState(bodemasStandaard.aandeelBodemasPct);
  const [verwerkingskosten, setKosten] = useState(bodemasStandaard.verwerkingskosten);
  const [metaalopbrengst, setOpbrengst] = useState(bodemasStandaard.metaalopbrengst);
  const u = bodemas({ tonnageVerbrand, aandeelBodemasPct, verwerkingskosten, metaalopbrengst });

  return (
    <>
      <RapportKop titel="Bodemassencalculator" />
      <PaginaKop titel="Bodemassencalculator" badges={<ToegangBadge toegang="gratis+pro" />}>
        Wat kost de verwerking van bodemas na aftrek van de opbrengst van teruggewonnen metalen? Alle standaardwaarden zijn
        voorbeeldwaarden.
      </PaginaKop>

      <h2 className="sectie" style={{ marginBottom: 12 }}>
        Gratis voorbeeld
      </h2>
      <div className="raster raster-tool">
        <Kaart titel="Invoer" className="invoerkaart">
          <div className="velden">
            <GetalVeld label="Verbrand tonnage" eenheid="ton/jaar" waarde={tonnageVerbrand} onChange={setTonnage} />
            <GetalVeld label="Aandeel bodemas" eenheid="%" max={100} waarde={aandeelBodemasPct} onChange={setAandeel} hint="Deel van het verbrande tonnage dat als bodemas overblijft." />
            <GetalVeld label="Verwerkingskosten" eenheid="€/t bodemas" waarde={verwerkingskosten} onChange={setKosten} />
            <GetalVeld label="Opbrengst teruggewonnen metalen" eenheid="€/t bodemas" waarde={metaalopbrengst} onChange={setOpbrengst} />
          </div>
        </Kaart>
        <Uitkomst
          formule={FORMULE}
          invoer={[
            { label: 'Verbrand tonnage', waarde: metEenheid(tonnageVerbrand, 'ton/jaar') },
            { label: 'Aandeel bodemas', waarde: procent(aandeelBodemasPct) },
            { label: 'Verwerkingskosten', waarde: `${euro(verwerkingskosten, 2)}/t` },
            { label: 'Opbrengst metalen', waarde: `${euro(metaalopbrengst, 2)}/t` },
          ]}
        >
          <div className="tegels">
            <Tegel label={u.nettoKosten >= 0 ? 'Netto kosten per jaar' : 'Netto opbrengst per jaar'} waarde={euro(Math.abs(u.nettoKosten))} hero />
            <Tegel label="Bodemas" waarde={metEenheid(u.bodemasTon, 'ton')} toelichting="per jaar" />
            <Tegel label="Per ton verbrand" waarde={euro(u.perTonVerbrand, 2)} toelichting="netto" />
          </div>
        </Uitkomst>
      </div>

      <h2 className="sectie" style={{ margin: '28px 0 12px' }}>
        Pro voor leden
      </h2>
      <Vergrendeld titel="Bodemassencalculator Pro" ledenKrijgen={['Meerdere installaties naast elkaar', 'Gevoeligheidsanalyse per parameter', 'Rapport maken']}>
        <BodemasPro />
      </Vergrendeld>
      <RapportVoet />
    </>
  );
}

const velden: { sleutel: Exclude<keyof Installatie, 'id' | 'naam'>; label: string; eenheid: string }[] = [
  { sleutel: 'tonnageVerbrand', label: 'Verbrand', eenheid: 'ton' },
  { sleutel: 'aandeelBodemasPct', label: 'Bodemas', eenheid: '%' },
  { sleutel: 'verwerkingskosten', label: 'Kosten', eenheid: '€/t' },
  { sleutel: 'metaalopbrengst', label: 'Metalen', eenheid: '€/t' },
];

function BodemasPro() {
  const [installaties, setInstallaties] = useState<Installatie[]>(bodemasInstallatiesStandaard);
  const [volgnummer, setVolgnummer] = useState(3);
  const [gekozen, setGekozen] = useState(bodemasInstallatiesStandaard[0].id);
  const [variatie, setVariatie] = useState(20);

  const { regels, totaal } = bodemasInstallaties(installaties);
  const analyseVan = installaties.find((i) => i.id === gekozen) ?? installaties[0];
  const analyse = analyseVan ? gevoeligheid(analyseVan, variatie / 100) : [];

  function wijzig(id: string, sleutel: keyof Installatie, tekst: string) {
    if (sleutel === 'naam') return setInstallaties((l) => l.map((i) => (i.id === id ? { ...i, naam: tekst } : i)));
    const n = leesGetal(tekst);
    if (Number.isFinite(n) && n >= 0) setInstallaties((l) => l.map((i) => (i.id === id ? { ...i, [sleutel]: n } : i)));
  }
  function voegToe() {
    const id = `i${volgnummer}`;
    setVolgnummer((v) => v + 1);
    setInstallaties((l) => [...l, { id, naam: `Installatie ${volgnummer} (voorbeeld)`, ...bodemasStandaard }]);
  }
  function verwijder(id: string) {
    setInstallaties((l) => l.filter((i) => i.id !== id));
    if (gekozen === id) setGekozen(installaties.find((i) => i.id !== id)?.id ?? '');
  }

  return (
    <div className="stapel">
      <Kaart titel="Installaties" kopNiveau={3} className="invoerkaart" actie={<button type="button" onClick={voegToe}>+ Installatie toevoegen</button>}>
        <div className="tabel-container">
          <table>
            <thead>
              <tr>
                <th scope="col">Naam</th>
                {velden.map((v) => (
                  <th key={v.sleutel} scope="col">
                    {v.label} ({v.eenheid})
                  </th>
                ))}
                <th scope="col">
                  <span className="visueel-verborgen">Acties</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {installaties.map((inst) => (
                <tr key={inst.id}>
                  <td>
                    <div className="invoer">
                      <input type="text" aria-label="Naam installatie" defaultValue={inst.naam} onChange={(e) => wijzig(inst.id, 'naam', e.target.value)} style={{ width: 200 }} />
                    </div>
                  </td>
                  {velden.map((v) => (
                    <td key={v.sleutel}>
                      <div className="invoer">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`${v.label} in ${v.eenheid}, ${inst.naam}`}
                          defaultValue={toonInInvoer(inst[v.sleutel])}
                          onChange={(e) => wijzig(inst.id, v.sleutel, e.target.value)}
                        />
                      </div>
                    </td>
                  ))}
                  <td>
                    <button type="button" onClick={() => verwijder(inst.id)} disabled={installaties.length <= 1} aria-label={`Verwijder ${inst.naam}`}>
                      Verwijder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Kaart>

      <Uitkomst
        titel="Uitkomst per installatie"
        formule={`${FORMULE}\ntotaal = Σ netto kosten per installatie\ngevoeligheid: elke parameter apart × (1 ± ${variatie} %), de rest gelijk`}
        invoer={[
          ...installaties.map((i) => ({
            label: i.naam,
            waarde: `${getal(i.tonnageVerbrand)} t · ${procent(i.aandeelBodemasPct, 0)} · ${euro(i.verwerkingskosten)} − ${euro(i.metaalopbrengst)}`,
          })),
          { label: 'Variatie gevoeligheidsanalyse', waarde: `± ${procent(variatie, 0)}` },
        ]}
      >
        <div className="stapel">
          <div className="tegels">
            <Tegel label="Netto kosten totaal" waarde={euro(totaal.nettoKosten)} toelichting="per jaar, alle installaties" hero />
            <Tegel label="Bodemas totaal" waarde={metEenheid(totaal.bodemasTon, 'ton')} />
            <Tegel label="Opbrengst metalen" waarde={euro(totaal.opbrengst)} />
          </div>
          <div className="tabel-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Installatie</th>
                  <th scope="col" className="num">
                    Bodemas (t)
                  </th>
                  <th scope="col" className="num">
                    Kosten
                  </th>
                  <th scope="col" className="num">
                    Opbrengst
                  </th>
                  <th scope="col" className="num">
                    Netto
                  </th>
                </tr>
              </thead>
              <tbody>
                {regels.map((r) => (
                  <tr key={r.id}>
                    <td>{r.naam}</td>
                    <td className="num">{getal(r.bodemasTon)}</td>
                    <td className="num">{euro(r.brutoKosten)}</td>
                    <td className="num">{euro(r.opbrengst)}</td>
                    <td className="num">{euro(r.nettoKosten)}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Totaal</strong>
                  </td>
                  <td className="num">
                    <strong>{getal(totaal.bodemasTon)}</strong>
                  </td>
                  <td className="num">
                    <strong>{euro(totaal.brutoKosten)}</strong>
                  </td>
                  <td className="num">
                    <strong>{euro(totaal.opbrengst)}</strong>
                  </td>
                  <td className="num">
                    <strong>{euro(totaal.nettoKosten)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {analyseVan && (
            <>
              <h3>Gevoeligheidsanalyse</h3>
              <div className="velden-2 geen-print">
                <KeuzeVeld label="Installatie" waarde={analyseVan.id} opties={installaties.map((i) => ({ waarde: i.id, label: i.naam }))} onChange={setGekozen} />
                <GetalVeld label="Variatie per parameter" eenheid="%" max={90} waarde={variatie} onChange={setVariatie} />
              </div>
              <p className="klein muted">
                Netto kosten van {analyseVan.naam} als één parameter {procent(variatie, 0)} lager of hoger is. Grootste invloed bovenaan.
              </p>
              <BandGrafiek
                titel={`Gevoeligheid netto kosten ${analyseVan.naam}`}
                basis={bodemas(analyseVan).nettoKosten}
                banden={analyse.map((a) => ({ label: parameterLabel[a.parameter], laag: a.laag, hoog: a.hoog }))}
                formatX={(n) => euro(n)}
              />
            </>
          )}
          <RapportKnop />
        </div>
      </Uitkomst>
    </div>
  );
}
