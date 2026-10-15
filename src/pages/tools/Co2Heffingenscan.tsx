import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { LijnGrafiek } from '../../components/grafiek/Grafieken';
import { BronStatusLabel, Bronnenlijst, type BronRegel } from '../../components/rekenen/Bronnen';
import { ExportKnoppen } from '../../components/rekenen/Export';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { Badge, GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import {
  bronnen,
  co2StandaardInvoer,
  kentalEmissiefactor,
  ontwikkelingen,
  PEILDATUM,
  procesemissiefactor,
  reductiefactor,
  scanJaren,
  tariefpaden,
  vastgesteldeTarieven,
  type PadId,
} from '../../data/co2-tarieven';
import {
  co2InvoerNaarParams,
  co2InvoerUitParams,
  parametersInJaar,
  scanJaar,
  scanReeks,
  type Co2PaginaInvoer,
  type Co2Regels,
} from '../../lib/calc/co2';
import { datum, euro, getal, metEenheid, procent } from '../../lib/format';

const PAD = '/tools/co2-heffingenscan';
const FORMULE = [
  'uitstoot = restafval × fossiele emissiefactor',
  'vrijgesteld deel = procesemissiefactor × reductiefactor × AVI-correctiefactor ÷ (uitstoot ÷ historisch niveau)',
  'heffing = uitstoot × (1 − vrijgesteld deel) × tarief   (niet lager dan 0)',
].join('\n');

const padIds = Object.keys(tariefpaden) as PadId[];

function regelsVoor(pad: PadId): Co2Regels {
  const t = tariefpaden[pad];
  return { vast: t.vast, verhogingen: t.verhogingen, correctiefactor: t.correctiefactor, reductiefactor, procesemissiefactor };
}

const jaarlijst = Array.from({ length: scanJaren.laatste - scanJaren.eerste + 1 }, (_, i) => scanJaren.eerste + i);

export function Co2Heffingenscan() {
  const [params, setParams] = useSearchParams();
  const [invoer, setInvoer] = useState<Co2PaginaInvoer>(() =>
    co2InvoerUitParams(params, co2StandaardInvoer, { paden: padIds, eersteJaar: scanJaren.eerste, laatsteJaar: scanJaren.laatste }),
  );
  const zet = <K extends keyof Co2PaginaInvoer>(k: K, v: Co2PaginaInvoer[K]) => setInvoer((i) => ({ ...i, [k]: v }));
  const padId = (invoer.pad as PadId) in tariefpaden ? (invoer.pad as PadId) : 'geldend';
  const pad = tariefpaden[padId];
  const u = scanJaar(regelsVoor(padId), invoer, invoer.jaar);

  const deelParams = co2InvoerNaarParams(invoer);
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  const vrijTekst =
    invoer.vrijstelling === 'eigen'
      ? `${procent(invoer.eigenVrijgesteldPct)} (eigen waarde)`
      : `${procent(u.vrijgesteldDeel * 100)} (${getal(u.procesemissiefactor, 2)} × ${getal(u.reductiefactor, 3)} × ${getal(u.correctiefactor, 2)}${
          invoer.uitstootVerhoudingPct !== 100 ? ` ÷ ${getal(invoer.uitstootVerhoudingPct / 100, 2)}` : ''
        })`;

  const invoerRegels = [
    { label: 'Restafval (aanname)', waarde: metEenheid(invoer.tonnage, 'ton per jaar') },
    { label: 'Fossiele emissiefactor', waarde: `${getal(invoer.emissiefactor, 3)} ton CO2 per ton` },
    { label: 'Heffingsjaar', waarde: String(invoer.jaar) },
    { label: 'Tariefpad', waarde: pad.kort },
    { label: 'Inflatiecorrectie (aanname)', waarde: invoer.inflatiePct === 0 ? 'geen (bedragen uit de wet)' : `${procent(invoer.inflatiePct)} per jaar` },
    { label: `Tarief ${invoer.jaar}`, waarde: `${euro(u.tarief, 2)} per ton CO2` },
    { label: 'Vrijgesteld deel', waarde: vrijTekst },
  ];

  const csvGratis = (): CsvCel[][] => [
    ['CO2-heffingenscan', 'KplusV'],
    ['Peildatum tarieven en regels', PEILDATUM],
    ['Tariefpad', pad.naam],
    ['Bron tariefpad', pad.bron.url],
    [],
    ['Invoer', 'Waarde', 'Herkomst'],
    ['Restafval (ton per jaar)', invoer.tonnage, 'aanname gebruiker'],
    ['Fossiele emissiefactor (ton CO2 per ton)', invoer.emissiefactor, invoer.emissiefactor === kentalEmissiefactor.waarde ? 'kental NEa-standaardwaarden 2024' : 'eigen waarde'],
    ['Heffingsjaar', invoer.jaar, ''],
    ['Inflatiecorrectie per jaar (%)', invoer.inflatiePct, 'aanname gebruiker'],
    ['Vrijstelling', invoer.vrijstelling === 'eigen' ? 'eigen percentage' : 'wettelijk berekend', ''],
    ...(invoer.vrijstelling === 'eigen'
      ? [['Eigen vrijgesteld deel (%)', invoer.eigenVrijgesteldPct, 'aanname gebruiker'] as CsvCel[]]
      : [['Uitstoot t.o.v. historisch niveau (%)', invoer.uitstootVerhoudingPct, 'aanname gebruiker'] as CsvCel[]]),
    [],
    ['Parameters', 'Waarde', 'Bron'],
    ['Tarief (euro per ton CO2)', u.tarief, pad.bron.url],
    ['Procesemissiefactor', u.procesemissiefactor, bronnen.neaAvi.url],
    ['Reductiefactor', u.reductiefactor, bronnen.neaDpr.url],
    ['AVI-correctiefactor', u.correctiefactor, pad.status === 'voorstel' ? bronnen.bp2027.url : bronnen.wm16b17.url],
    [],
    ['Uitkomst', 'Waarde'],
    ['Fossiele uitstoot (ton CO2)', u.uitstoot],
    ['Vrijgesteld deel (%)', u.vrijgesteldDeel * 100],
    ['Vrijgestelde uitstoot (ton CO2)', u.vrijgesteld],
    ['Belaste uitstoot (ton CO2)', u.belastbaar],
    ['Heffing (euro)', u.kosten],
    ['Heffing per ton restafval (euro)', u.perTon],
    [],
    ['Formule', FORMULE],
  ];

  const tariefRijen = jaarlijst.map((j) => ({
    jaar: j,
    geldend: parametersInJaar(regelsVoor('geldend'), j, invoer.inflatiePct),
    voorstel: parametersInJaar(regelsVoor('voorstel'), j, invoer.inflatiePct),
  }));

  const bronRegels: BronRegel[] = [
    {
      onderwerp: 'Tarief AVI 2026',
      status: 'officieel',
      waarde: '€ 103,66 per ton CO2',
      bron: `${bronnen.wbm71p.titel}; ${bronnen.neaTarieven.titel}`,
      url: bronnen.wbm71p.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Tariefpad geldend recht 2027–2030',
      status: 'officieel',
      waarde: 'verhoging € 49,66 / € 50,42 / € 50,42 / € 49,39 per jaar, vóór inflatiecorrectie',
      toelichting: 'Zonder inflatiecorrectie: € 153,32 (2027), € 203,74 (2028), € 254,16 (2029), € 303,55 (2030).',
      bron: bronnen.wbm71p.titel,
      url: bronnen.wbm71p.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Tariefpad voorstel Belastingplan 2027',
      status: 'voorstel',
      waarde: '€ 129,15 in 2027, daarna € 22,79 tot € 26,77 verhoging per jaar tot en met 2035',
      bron: bronnen.bp2027.titel,
      url: bronnen.bp2027.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'AVI-correctiefactor',
      status: 'officieel',
      waarde: 'geldend: 0,85 (2026), 0,70, 0,55, 0,40, 0,25, 0,17, 0,09, 0 (2033)',
      toelichting: 'Voorstel BP 2027: na 0,25 in 2030 verder 0,20, 0,15, 0,10, 0,05 en 0 in 2035.',
      bron: `${bronnen.wm16b17.titel}; ${bronnen.neaAvi.titel}`,
      url: bronnen.wm16b17.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Nationale reductiefactor',
      status: 'officieel',
      waarde: '1,023 vanaf 2026',
      bron: `${bronnen.wm16b17.titel}; ${bronnen.neaDpr.titel}`,
      url: bronnen.neaDpr.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Procesemissiefactor',
      status: 'officieel',
      waarde: '0,97; vanaf 2028 0,91',
      toelichting: 'Na 2030 is de waarde niet bekend. De scan rekent dan met 0,91 (aanname).',
      bron: bronnen.neaAvi.titel,
      url: bronnen.neaAvi.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Fossiele emissiefactor',
      status: 'kental',
      waarde: `${getal(kentalEmissiefactor.waarde, 3)} ton CO2 per ton afval`,
      toelichting: `Afgeleid: ${getal(kentalEmissiefactor.stookwaardeGjPerTon, 1)} GJ/ton × ${getal(kentalEmissiefactor.emissiefactorKgPerGj, 1)} kg CO2/GJ × (1 − ${procent(
        kentalEmissiefactor.biogeenAandeel * 100,
        0,
      )} biogeen). Gemiddelde voor afval in AVI’s, niet specifiek voor huishoudelijk restafval. De echte waarde staat in het CO2-heffingsverslag van uw verwerker.`,
      bron: bronnen.nir2024.titel,
      url: bronnen.nir2024.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Restafval, inflatiecorrectie en verhouding tot historisch niveau',
      status: 'aanname',
      toelichting:
        'Deze waarden kent de scan niet. De standaardwaarden zijn voorbeelden. De inflatiecorrectie (art. 90 Wbm) wordt jaarlijks vastgesteld; met 0 % ziet u de bedragen zoals ze in de wet staan.',
    },
  ];

  return (
    <>
      <RapportKop titel="CO2-heffingenscan" ondertitel={`Tarieven en regels volgens wet en NEa, peildatum ${datum(PEILDATUM)}`} />
      <PaginaKop titel="CO2-heffingenscan" badges={<ToegangBadge toegang="gratis+pro" />}>
        Schat wat de CO2-heffing industrie voor afvalverbrandingsinstallaties betekent voor uw tonnage restafval. Tarieven,
        vrijstelling en wetsvoorstel komen uit de wet en van de Nederlandse Emissieautoriteit, peildatum {datum(PEILDATUM)}.
        Hoeveel uw verwerker doorberekent, hangt af van uw contract.
      </PaginaKop>

      <h2 className="sectie" style={{ marginBottom: 12 }}>
        Gratis: heffing in één jaar
      </h2>
      <div className="raster raster-tool">
        <Kaart titel="Invoer" className="invoerkaart">
          <div className="velden">
            <GetalVeld label="Restafval" eenheid="ton/jaar" waarde={invoer.tonnage} onChange={(n) => zet('tonnage', n)} hint="Aanname: vul de tonnage in die u laat verbranden." />
            <GetalVeld
              label="Fossiele emissiefactor"
              eenheid="t CO2/t"
              max={5}
              waarde={invoer.emissiefactor}
              onChange={(n) => zet('emissiefactor', n)}
              hint={`Kental ${getal(kentalEmissiefactor.waarde, 3)} uit de NEa-standaardwaarden voor afval. Vraag de waarde van uw verwerker op.`}
            />
            <KeuzeVeld label="Heffingsjaar" waarde={invoer.jaar} opties={jaarlijst.map((j) => ({ waarde: j, label: String(j) }))} onChange={(j) => zet('jaar', j)} />
            <fieldset>
              <legend>Tariefpad</legend>
              <div className="keuzes kolom">
                {padIds.map((id) => (
                  <label key={id} className="keuze">
                    <input type="radio" name="co2-pad" value={id} checked={padId === id} onChange={() => zet('pad', id)} />
                    {tariefpaden[id].kort}
                    {tariefpaden[id].status === 'voorstel' ? ' (nog geen wet)' : ''}
                  </label>
                ))}
              </div>
            </fieldset>
            <GetalVeld
              label="Inflatiecorrectie per jaar"
              eenheid="%"
              max={25}
              waarde={invoer.inflatiePct}
              onChange={(n) => zet('inflatiePct', n)}
              hint="Aanname. Het tarief wordt jaarlijks gecorrigeerd voor inflatie. Met 0 % rekent de scan met de bedragen uit de wet."
            />
            <fieldset>
              <legend>Vrijgestelde uitstoot (dispensatierechten)</legend>
              <div className="keuzes kolom">
                <label className="keuze">
                  <input type="radio" name="co2-vrij" value="wettelijk" checked={invoer.vrijstelling === 'wettelijk'} onChange={() => zet('vrijstelling', 'wettelijk')} />
                  Wettelijk berekend
                </label>
                <label className="keuze">
                  <input type="radio" name="co2-vrij" value="eigen" checked={invoer.vrijstelling === 'eigen'} onChange={() => zet('vrijstelling', 'eigen')} />
                  Eigen percentage van uw verwerker
                </label>
              </div>
            </fieldset>
            {invoer.vrijstelling === 'wettelijk' ? (
              <GetalVeld
                label="Uitstoot van de AVI ten opzichte van het historisch niveau"
                eenheid="%"
                min={85}
                max={115}
                waarde={invoer.uitstootVerhoudingPct}
                onChange={(n) => zet('uitstootVerhoudingPct', n)}
                hint="Aanname. Historisch niveau is de mediaan van 2019–2023. Daalt de uitstoot, dan stijgt het vrijgestelde deel. Buiten 85–115 % rekent de NEa met de actuele uitstoot."
              />
            ) : (
              <GetalVeld
                label="Vrijgesteld deel van de uitstoot"
                eenheid="%"
                max={200}
                waarde={invoer.eigenVrijgesteldPct}
                onChange={(n) => zet('eigenVrijgesteldPct', n)}
                hint="Aanname: het aantal dispensatierechten gedeeld door de uitstoot van uw verwerker."
              />
            )}
          </div>
        </Kaart>
        <Uitkomst
          label={<Badge soort="status-gegund">Wet en NEa, peildatum {datum(PEILDATUM)}</Badge>}
          formule={FORMULE}
          toelichting={
            <>
              De heffing betaalt de exploitant van de AVI. De scan verdeelt die naar rato van uw tonnage. Voor AVI’s gaat de
              EU ETS-prijs niet van het tarief af. {pad.status === 'voorstel' && 'U rekent met een wetsvoorstel dat nog kan wijzigen.'}
            </>
          }
          invoer={invoerRegels}
        >
          <div className="stapel">
            {pad.status === 'voorstel' && (
              <p className="notitie info">
                <BronStatusLabel status="voorstel" /> Belastingplan 2027 is ingediend op 15 september 2026 en nog niet aangenomen.
              </p>
            )}
            <div className="tegels">
              <Tegel label={`Heffing ${invoer.jaar}`} waarde={euro(u.kosten)} toelichting={`over ${metEenheid(invoer.tonnage, 'ton')} restafval`} hero />
              <Tegel label="Per ton restafval" waarde={euro(u.perTon, 2)} toelichting="gemiddeld" />
              <Tegel label={`Tarief ${invoer.jaar}`} waarde={euro(u.tarief, 2)} toelichting="per ton CO2" />
            </div>
            <dl className="invoerlijst">
              <dt>Fossiele uitstoot</dt>
              <dd>{metEenheid(u.uitstoot, 'ton CO2')}</dd>
              <dt>Vrijgesteld ({procent(Math.min(u.vrijgesteldDeel, 1) * 100)})</dt>
              <dd>{metEenheid(Math.min(u.vrijgesteld, u.uitstoot), 'ton CO2')}</dd>
              <dt>Belast</dt>
              <dd>{metEenheid(u.belastbaar, 'ton CO2')}</dd>
            </dl>
            {u.vrijgesteldDeel > 1 && (
              <p className="notitie" role="status">
                Het vrijgestelde deel is groter dan de uitstoot. De verwerker heeft dan een overschot aan dispensatierechten en
                betaalt over dit deel geen heffing.
              </p>
            )}
            <ExportKnoppen
              naam="CO2-heffingenscan"
              csvRijen={csvGratis}
              params={deelParams}
              pad={PAD}
              toelichting="De CSV bevat invoer, herkomst van elk getal, parameters met bron en uitkomst. De link bewaart al uw invoer."
            />
          </div>
        </Uitkomst>
      </div>

      <h2 className="sectie" style={{ margin: '28px 0 12px' }}>
        Pro voor leden
      </h2>
      <Vergrendeld
        titel="CO2-heffingenscan Pro"
        ledenKrijgen={[
          `Verloop ${scanJaren.eerste}–${scanJaren.laatste} naast elkaar voor geldend recht en het wetsvoorstel`,
          'Drie scenario’s voor het scheidingspercentage',
          'Effect per inwoner',
          'CSV van alle jaren en rapport maken',
        ]}
      >
        <Co2Pro invoer={invoer} zet={zet} padId={padId} deelParams={deelParams} />
      </Vergrendeld>

      <h2 className="sectie" style={{ margin: '28px 0 12px' }}>
        Tarieven en regels
      </h2>
      <div className="stapel">
        <Kaart
          titel="Tarief en correctiefactor per jaar"
          sub={invoer.inflatiePct === 0 ? 'Bedragen zoals in de wet, zonder jaarlijkse inflatiecorrectie.' : `Met een aangenomen inflatiecorrectie van ${procent(invoer.inflatiePct)} per jaar.`}
        >
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel tarief en correctiefactor per jaar">
            <table>
              <caption>Euro per ton CO2. Bron: Wbm art. 71p, Wm art. 16b.17 en wetsvoorstel Belastingplan 2027, peildatum {datum(PEILDATUM)}.</caption>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  <th scope="col" className="num">
                    Tarief geldend
                  </th>
                  <th scope="col" className="num">
                    Correctie&shy;factor geldend
                  </th>
                  <th scope="col" className="num">
                    Tarief voorstel
                  </th>
                  <th scope="col" className="num">
                    Correctie&shy;factor voorstel
                  </th>
                </tr>
              </thead>
              <tbody>
                {tariefRijen.map((r) => (
                  <tr key={r.jaar}>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      {r.jaar}
                    </th>
                    <td className="num">{euro(r.geldend.tarief, 2)}</td>
                    <td className="num">{getal(r.geldend.correctiefactor, 2)}</td>
                    <td className="num">{euro(r.voorstel.tarief, 2)}</td>
                    <td className="num">{getal(r.voorstel.correctiefactor, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="klein muted">
            Eerdere jaren (tarief voor alle installaties, AVI’s betaalden het volledige tarief):{' '}
            {vastgesteldeTarieven
              .filter((t) => t.jaar < 2026)
              .map((t) => `${t.jaar} ${euro(t.avi, 2)}`)
              .join(' · ')}
            . Bron:{' '}
            <a href={bronnen.neaTarieven.url} target="_blank" rel="noopener noreferrer">
              {bronnen.neaTarieven.titel}
            </a>
            .
          </p>
        </Kaart>
        <div className="raster raster-2">
          <Kaart titel="Wat kan er veranderen">
            <ul className="opsomming">
              {ontwikkelingen.map((o) => (
                <li key={o.titel}>
                  <strong>{o.titel}.</strong> {o.tekst}{' '}
                  <a href={o.bron.url} target="_blank" rel="noopener noreferrer" className="klein">
                    Bron: {o.bron.titel}
                  </a>
                </li>
              ))}
            </ul>
          </Kaart>
          <Bronnenlijst regels={bronRegels} sub={<>Alle bronnen geraadpleegd op {datum(PEILDATUM)}.</>} />
        </div>
      </div>
      <RapportVoet tekst={`Tarieven en regels: wet en NEa, peildatum ${datum(PEILDATUM)}`} />
    </>
  );
}

interface ProProps {
  invoer: Co2PaginaInvoer;
  zet: <K extends keyof Co2PaginaInvoer>(k: K, v: Co2PaginaInvoer[K]) => void;
  padId: PadId;
  deelParams: URLSearchParams;
}

function Co2Pro({ invoer, zet, padId, deelParams }: ProProps) {
  const anderPad: PadId = padId === 'geldend' ? 'voorstel' : 'geldend';
  const scenarios = [
    { naam: `Huidig (${procent(invoer.scheidingNuPct, 0)} scheiding)`, kort: 'Huidig', pct: invoer.scheidingNuPct },
    { naam: `${procent(invoer.scenario2Pct, 0)} scheiding`, kort: procent(invoer.scenario2Pct, 0), pct: invoer.scenario2Pct },
    { naam: `${procent(invoer.scenario3Pct, 0)} scheiding`, kort: procent(invoer.scenario3Pct, 0), pct: invoer.scenario3Pct },
  ].map((s) => ({
    ...s,
    regels: scanReeks(regelsVoor(padId), invoer, scanJaren.eerste, scanJaren.laatste, { nuPct: invoer.scheidingNuPct, scenarioPct: s.pct }),
  }));
  const vergelijk = scanReeks(regelsVoor(anderPad), invoer, scanJaren.eerste, scanJaren.laatste);
  const perInw = (k: number) => (invoer.inwoners > 0 ? k / invoer.inwoners : 0);
  const totaal = (r: { kosten: number }[]) => r.reduce((s, x) => s + x.kosten, 0);
  const laatste = scenarios[0].regels.length - 1;

  const csvPro = (): CsvCel[][] => [
    ['CO2-heffingenscan Pro', 'KplusV'],
    ['Peildatum tarieven en regels', PEILDATUM],
    ['Tariefpad', tariefpaden[padId].naam],
    ['Vergelijking', tariefpaden[anderPad].naam],
    [],
    ['Invoer', 'Waarde'],
    ['Restafval huidig (ton per jaar)', invoer.tonnage],
    ['Fossiele emissiefactor (ton CO2 per ton)', invoer.emissiefactor],
    ['Inflatiecorrectie per jaar (%)', invoer.inflatiePct],
    ['Vrijstelling', invoer.vrijstelling === 'eigen' ? `eigen ${invoer.eigenVrijgesteldPct} %` : `wettelijk, uitstoot ${invoer.uitstootVerhoudingPct} % van historisch niveau`],
    ['Inwoners', invoer.inwoners],
    ['Scheiding huidig / scenario 2 / scenario 3 (%)', `${invoer.scheidingNuPct} / ${invoer.scenario2Pct} / ${invoer.scenario3Pct}`],
    [],
    [
      'Jaar',
      'Tarief (euro per ton CO2)',
      'Vrijgesteld deel (%)',
      ...scenarios.flatMap((s): CsvCel[] => [`${s.naam}: heffing (euro)`, `${s.naam}: per inwoner (euro)`]),
      `Huidig bij ${tariefpaden[anderPad].kort}: heffing (euro)`,
    ],
    ...scenarios[0].regels.map((r, i): CsvCel[] => [
      r.jaar,
      r.tarief,
      r.vrijgesteldDeel * 100,
      ...scenarios.flatMap((s): CsvCel[] => [s.regels[i].kosten, perInw(s.regels[i].kosten)]),
      vergelijk[i].kosten,
    ]),
    [],
    ['Formule', FORMULE],
    ['Restafval scenario', 'restafval × (100 − scheiding scenario) / (100 − scheiding huidig)'],
  ];

  return (
    <div className="stapel">
      <Kaart titel="Scenario’s" kopNiveau={3} className="invoerkaart" sub="Restafval, emissiefactor, tariefpad en vrijstelling komen uit het gratis deel hierboven.">
        <div className="velden-2">
          <GetalVeld label="Inwoners" eenheid="inw" waarde={invoer.inwoners} onChange={(n) => zet('inwoners', n)} hint="Aanname: inwoners in uw gebied." />
          <GetalVeld label="Huidig scheidingspercentage" eenheid="%" max={99} waarde={invoer.scheidingNuPct} onChange={(n) => zet('scheidingNuPct', n)} />
          <GetalVeld label="Scenario 2: scheidingspercentage" eenheid="%" max={99} waarde={invoer.scenario2Pct} onChange={(n) => zet('scenario2Pct', n)} />
          <GetalVeld label="Scenario 3: scheidingspercentage" eenheid="%" max={99} waarde={invoer.scenario3Pct} onChange={(n) => zet('scenario3Pct', n)} />
        </div>
      </Kaart>

      <Uitkomst
        titel={`Verloop ${scanJaren.eerste}–${scanJaren.laatste}`}
        label={<Badge soort="status-gegund">Wet en NEa, peildatum {datum(PEILDATUM)}</Badge>}
        formule={`${FORMULE}\nrestafval scenario = restafval × (100 − scheiding scenario) / (100 − scheiding huidig)\nper inwoner = heffing / inwoners`}
        toelichting={`Lijnen: ${tariefpaden[padId].kort}. Grijze stippellijn: huidig scenario bij ${tariefpaden[anderPad].kort}.`}
        invoer={[
          { label: 'Tariefpad', waarde: tariefpaden[padId].kort },
          { label: 'Restafval huidig', waarde: metEenheid(invoer.tonnage, 'ton per jaar') },
          { label: 'Inwoners', waarde: getal(invoer.inwoners) },
          { label: 'Scheiding huidig / 2 / 3', waarde: `${procent(invoer.scheidingNuPct, 0)} / ${procent(invoer.scenario2Pct, 0)} / ${procent(invoer.scenario3Pct, 0)}` },
        ]}
      >
        <div className="stapel">
          <div className="tegels">
            {scenarios.map((s, i) => (
              <Tegel
                key={s.naam}
                label={`${s.kort}, totaal ${scanJaren.eerste}–${scanJaren.laatste}`}
                waarde={euro(totaal(s.regels))}
                toelichting={`${euro(perInw(s.regels[laatste].kosten), 2)} per inwoner in ${s.regels[laatste].jaar}`}
                hero={i === 0}
              />
            ))}
          </div>
          <p className="klein">
            Huidig scenario, totaal {scanJaren.eerste}–{scanJaren.laatste}: {euro(totaal(scenarios[0].regels))} bij {tariefpaden[padId].kort} en{' '}
            {euro(totaal(vergelijk))} bij {tariefpaden[anderPad].kort}.
          </p>
          <LijnGrafiek
            titel={`Heffing per jaar per scenario, ${tariefpaden[padId].kort}, met ${tariefpaden[anderPad].kort} ter vergelijking`}
            labels={scenarios[0].regels.map((r) => r.jaar)}
            reeksen={[
              ...scenarios.map((s) => ({ naam: s.naam, waarden: s.regels.map((r) => r.kosten) })),
              { naam: `Huidig bij ${tariefpaden[anderPad].kort}`, waarden: vergelijk.map((r) => r.kosten), vergelijking: true },
            ]}
            formatY={(n) => euro(n)}
          />
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel heffing per jaar per scenario">
            <table>
              <caption>Heffing in euro per jaar, met bedrag per inwoner eronder.</caption>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  <th scope="col" className="num">
                    Tarief
                  </th>
                  <th scope="col" className="num">
                    Vrijgesteld
                  </th>
                  {scenarios.map((s) => (
                    <th key={s.naam} scope="col" className="num">
                      {s.kort}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios[0].regels.map((r, j) => (
                  <tr key={r.jaar}>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      {r.jaar}
                    </th>
                    <td className="num">{euro(r.tarief, 2)}</td>
                    <td className="num">{procent(Math.min(r.vrijgesteldDeel, 1) * 100, 0)}</td>
                    {scenarios.map((s) => (
                      <td key={s.naam} className="num">
                        {euro(s.regels[j].kosten)}
                        <br />
                        <span className="muted klein">{euro(perInw(s.regels[j].kosten), 2)}/inw</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ExportKnoppen naam="CO2-heffingenscan Pro" csvRijen={csvPro} params={deelParams} pad={PAD} />
          <RapportKnop />
        </div>
      </Uitkomst>
    </div>
  );
}
