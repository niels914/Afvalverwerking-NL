import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRol } from '../../components/betaalmuur/RolContext';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { LijnGrafiek } from '../../components/grafiek/Grafieken';
import { BronRegels, BronStatusLabel, type BronRegel } from '../../components/rekenen/Bronnen';
import { ExportKnoppen } from '../../components/rekenen/Export';
import { Inklapbaar, Kern, OngeldigeInvoer, useInklapBijPrintEnAnker, useOngeldigeInvoer } from '../../components/rekenen/Inklap';
import { OpDezePagina } from '../../components/rekenen/OpDezePagina';
import type { CsvCel } from '../../components/rekenen/csv';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { Badge, GetalVeld, Kaart, KeuzeVeld, PaginaKop, Tegel } from '../../components/ui';
import {
  bronnen,
  co2StandaardInvoer,
  co2ToolVersie,
  inflatiecorrectie2027,
  kentalEmissiefactor,
  ontwikkelingen,
  PEILDATUM,
  procesemissiefactor,
  reductiefactor,
  scanJaren,
  tariefpaden,
  tariefpadPrijspeil2026,
  vastgesteldeTarieven,
  type PadId,
} from '../../data/co2-tarieven';
import {
  bandbreedte,
  buitenBand,
  co2InvoerNaarParams,
  co2InvoerUitParams,
  inflatieInTarief,
  parametersInJaar,
  restafvalBijScheiding,
  scanJaar,
  scanReeks,
  type Co2PaginaInvoer,
  type Co2Regels,
  VERHOUDING_INVOER_MAX_PCT,
  VERHOUDING_INVOER_MIN_PCT,
} from '../../lib/calc/co2';
import { datum, euro, getal, metEenheid, procent } from '../../lib/format';

const PAD = '/tools/co2-heffingenscan';
const FORMULE = [
  'uitstoot = restafval × fossiele emissiefactor',
  'vrijgesteld deel = procesemissiefactor × reductiefactor × AVI-correctiefactor ÷ (uitstoot ÷ historisch niveau)',
  'heffing = uitstoot × (1 − vrijgesteld deel) × tarief   (niet lager dan 0)',
].join('\n');
const FORMULE_TARIEF = 'tarief_t = (tarief_t−1 + verhoging_t) × (1 + inflatiecorrectie)';

const padIds = Object.keys(tariefpaden) as PadId[];
const VERSIE_TEKST = `Versie ${co2ToolVersie.versie}, bijgewerkt ${datum(co2ToolVersie.datum)}`;

function regelsVoor(pad: PadId): Co2Regels {
  const t = tariefpaden[pad];
  return { vast: t.vast, verhogingen: t.verhogingen, verhogingenGeindexeerd: t.verhogingenGeindexeerd, correctiefactor: t.correctiefactor, reductiefactor, procesemissiefactor };
}

const jaarlijst = Array.from({ length: scanJaren.laatste - scanJaren.eerste + 1 }, (_, i) => scanJaren.eerste + i);

/** Inflatie als tekst, met de bekende correctie voor 2027 erbij. */
function inflatieTekst(pct: number): string {
  if (pct === 0) return 'geen inflatiecorrectie (bedragen zoals in de wet)';
  return `${procent(pct)} per jaar${pct === inflatiecorrectie2027.pct ? ' (gelijk aan de correctie per 1 januari 2027)' : ''}`;
}

export function Co2Heffingenscan() {
  useInklapBijPrintEnAnker();
  const { laden, isLid } = useRol();
  const [toolRef, ongeldigeVelden] = useOngeldigeInvoer();
  const ok = ongeldigeVelden.length === 0;
  const toon = (t: string) => (ok ? t : '–');
  const [params, setParams] = useSearchParams();
  const [invoer, setInvoer] = useState<Co2PaginaInvoer>(() =>
    co2InvoerUitParams(params, co2StandaardInvoer, { paden: padIds, eersteJaar: scanJaren.eerste, laatsteJaar: scanJaren.laatste }),
  );
  const zet = <K extends keyof Co2PaginaInvoer>(k: K, v: Co2PaginaInvoer[K]) => setInvoer((i) => ({ ...i, [k]: v }));
  const padId = (invoer.pad as PadId) in tariefpaden ? (invoer.pad as PadId) : 'geldend';
  const anderPad: PadId = padId === 'geldend' ? 'voorstel' : 'geldend';
  const pad = tariefpaden[padId];
  const u = scanJaar(regelsVoor(padId), invoer, invoer.jaar);
  const ander = scanJaar(regelsVoor(anderPad), invoer, invoer.jaar);
  const prijspeil = tariefpadPrijspeil2026.find((r) => r.jaar === invoer.jaar);
  const band = bandbreedte([regelsVoor('geldend'), regelsVoor('voorstel')], invoer, invoer.jaar);
  const bandVast = Math.abs(band.hoog.kosten - band.laag.kosten) < 0.5;
  const metInflatie = inflatieInTarief(regelsVoor(padId), invoer.jaar, invoer.inflatiePct);
  const tariefWet = parametersInJaar(regelsVoor(padId), invoer.jaar, 0).tarief;
  const verhouding = invoer.uitstootVerhoudingPct / 100;

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
  const eigenEf = invoer.emissiefactor !== kentalEmissiefactor.waarde;

  const invoerRegels = [
    { label: 'Restafval (aanname)', waarde: metEenheid(invoer.tonnage, 'ton per jaar') },
    { label: 'Fossiele emissiefactor', waarde: `${getal(invoer.emissiefactor, 3)} ton CO2 per ton${eigenEf ? ' (eigen waarde)' : ' (kental)'}` },
    { label: 'Heffingsjaar', waarde: String(invoer.jaar) },
    { label: 'Tariefpad', waarde: pad.kort },
    { label: 'Inflatiecorrectie (aanname)', waarde: inflatieTekst(invoer.inflatiePct) },
    {
      label: `Tarief ${invoer.jaar}`,
      waarde: `${euro(u.tarief, 2)} per ton CO2${metInflatie ? ` (wet ${euro(tariefWet, 2)} plus inflatieaanname)` : ''}`,
    },
    { label: 'Vrijgesteld deel', waarde: vrijTekst },
  ];

  const csvGratis = (): CsvCel[][] => [
    ['CO2-heffingenscan', 'KplusV'],
    ['Versie tool', `${co2ToolVersie.versie} (${co2ToolVersie.datum})`],
    ['Peildatum tarieven en regels', PEILDATUM],
    ['Tariefpad', pad.naam],
    ['Bron tariefpad', pad.bron.url],
    [],
    ['Invoer', 'Waarde', 'Herkomst'],
    ['Restafval (ton per jaar)', invoer.tonnage, 'aanname gebruiker'],
    ['Fossiele emissiefactor (ton CO2 per ton)', invoer.emissiefactor, eigenEf ? 'eigen waarde' : `kental, ${kentalEmissiefactor.bron.url}`],
    ['Heffingsjaar', invoer.jaar, ''],
    ['Inflatiecorrectie per jaar (%)', invoer.inflatiePct, `aanname gebruiker; correctie per 1-1-2027 is ${getal(inflatiecorrectie2027.pct, 1)} % (MvT BP 2027)`],
    ['Vrijstelling', invoer.vrijstelling === 'eigen' ? 'eigen percentage' : 'wettelijk berekend', ''],
    ...(invoer.vrijstelling === 'eigen'
      ? [['Eigen vrijgesteld deel (%)', invoer.eigenVrijgesteldPct, 'aanname gebruiker'] as CsvCel[]]
      : [
          [
            'Uitstoot t.o.v. historisch niveau (%)',
            invoer.uitstootVerhoudingPct,
            buitenBand(verhouding) ? 'aanname gebruiker; buiten 85–115 % benaderd met de actuele uitstoot (aanname)' : 'aanname gebruiker',
          ] as CsvCel[],
        ]),
    [],
    ['Parameters', 'Waarde', 'Bron'],
    [`Tarief ${invoer.jaar} volgens ${pad.status === 'voorstel' ? 'wetsvoorstel' : 'wet'}, zonder inflatiecorrectie (euro per ton CO2)`, tariefWet, pad.bron.url],
    metInflatie
      ? [`Tarief ${invoer.jaar} incl. inflatieaanname ${getal(invoer.inflatiePct, 1)} % per jaar (euro per ton CO2)`, u.tarief, 'wet plus aanname gebruiker']
      : [`Tarief ${invoer.jaar} waarmee gerekend is (euro per ton CO2)`, u.tarief, pad.bron.url],
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
    [`Ter vergelijking: heffing bij ${tariefpaden[anderPad].kort} (euro)`, ander.kosten],
    [`Bandbreedte ondergrens (euro): beide tariefpaden, inflatie ${getal(band.inflatie[0], 1)}–${getal(band.inflatie[1], 1)} %`, band.laag.kosten],
    ['Bandbreedte bovengrens (euro)', band.hoog.kosten],
    ['Let op', 'Het Belastingplan 2027 is nog geen wet en het coalitieakkoord noemt afschaffing van de heffing; dat valt buiten de bandbreedte.'],
    [],
    ['Formule', FORMULE],
    ['Tarief per jaar', FORMULE_TARIEF],
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
      )} biogeen aandeel in de emissiefactor). De lijst geeft voor 2025 en 2026 de waarden van 2024. Gemiddelde voor afval in AVI’s, niet specifiek voor huishoudelijk restafval. De echte waarde staat in het CO2-heffingsverslag van uw verwerker.`,
      bron: kentalEmissiefactor.bron.titel,
      url: kentalEmissiefactor.bron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Inflatiecorrectie 2027',
      status: 'voorstel',
      waarde: `${procent(inflatiecorrectie2027.pct)} (tabelcorrectiefactor 1,026)`,
      toelichting:
        'Wettelijke inflatiecorrectie per 1 januari 2027 volgens de memorie van toelichting. Het voorgestelde AVI-tarief 2027 van € 129,15 is daar al mee geïndexeerd. De scan gebruikt 2,6 % ook voor latere jaren; dat is een aanname.',
      bron: inflatiecorrectie2027.bron.titel,
      url: inflatiecorrectie2027.bron.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Restafval, inflatie na 2027 en verhouding tot historisch niveau',
      status: 'aanname',
      toelichting:
        'Deze waarden kent de scan niet. De standaardwaarden zijn voorbeelden. De inflatiecorrectie (art. 90 Wbm) wordt jaarlijks vastgesteld; met 0 % ziet u de bedragen zoals ze in de wet staan.',
    },
  ];

  return (
    <div className="ta-tool" ref={toolRef}>
      <RapportKop titel="CO2-heffingenscan" ondertitel={`Tarieven en regels volgens wet en NEa, peildatum ${datum(PEILDATUM)} · ${VERSIE_TEKST}`} />
      <PaginaKop titel="CO2-heffingenscan" badges={<Badge soort="pro">Gratis deel + Pro voor leden</Badge>}>
        Schat wat de CO2-heffing voor afvalverbrandingsinstallaties betekent voor uw tonnage restafval. Tarieven en vrijstelling
        komen uit de wet, van de Nederlandse Emissieautoriteit en uit het Belastingplan 2027.
      </PaginaKop>

      <Kern>
        {ok ? (
          <p className="ta-kern-zin">
            Heffing {invoer.jaar}: <strong>{euro(u.kosten)}</strong> voor {metEenheid(invoer.tonnage, 'ton')} restafval, gemiddeld{' '}
            <strong>{euro(u.perTon, 2)} per ton</strong> ({pad.kort.toLowerCase()}).
          </p>
        ) : (
          <OngeldigeInvoer velden={ongeldigeVelden} />
        )}
        <ul>
          {ok && (
            <li>
              {bandVast ? (
                <>Tarief {invoer.jaar} ligt vast in de wet; onzeker zijn alleen uw eigen aannames.</>
              ) : (
                <>
                  Bandbreedte: <strong>{euro(band.laag.kosten)}</strong> tot <strong>{euro(band.hoog.kosten)}</strong> (beide tariefpaden, inflatie{' '}
                  {getal(band.inflatie[0], 1)}–{procent(band.inflatie[1])}).
                </>
              )}{' '}
              Belastingplan 2027 is nog geen wet; het coalitieakkoord noemt afschaffing: <a href="#ontwikkelingen">wat kan er veranderen</a>.
            </li>
          )}
          {ok && (
            <li>
              {tariefpaden[anderPad].kort}: {euro(ander.kosten)} ({euro(ander.perTon, 2)} per ton)
              {invoer.inflatiePct > 0
                ? `, ook met ${procent(invoer.inflatiePct)} inflatie per jaar.`
                : '. Let op: zonder inflatieaanname is deze vergelijking scheef, zie de tarieven per jaar.'}
              {prijspeil &&
                ` In prijspeil 2026 (Belastingplan 2027, tabel 12) is het tarief ${invoer.jaar} ${euro(prijspeil.geldend, 0)} bij geldend recht en ${euro(prijspeil.voorstel, 0)} bij het voorstel.`}
            </li>
          )}
          {ok && isLid && !laden && <KernPro invoer={invoer} padId={padId} />}
          <li>
            Aannames: fossiele emissiefactor {getal(invoer.emissiefactor, 3)} ton CO2 per ton{eigenEf ? ' (eigen waarde)' : ' (kental)'}, inflatie{' '}
            {inflatieTekst(invoer.inflatiePct)},{' '}
            {invoer.vrijstelling === 'eigen'
              ? `eigen vrijgesteld deel ${procent(invoer.eigenVrijgesteldPct)}`
              : `uitstoot van de AVI ${procent(invoer.uitstootVerhoudingPct, 0)} van het historisch niveau`}
            . Tarieven en regels: wet en NEa, peildatum {datum(PEILDATUM)}.
          </li>
          <li className="ta-versie">
            {VERSIE_TEKST}. <a href="#versie">Wat is er veranderd</a>
          </li>
        </ul>
      </Kern>

      <OpDezePagina
        links={[
          { id: 'gratis', label: 'Heffing in één jaar' },
          { id: 'pro', label: 'Verloop en scenario’s (Pro)' },
          { id: 'tarieven', label: 'Tarieven per jaar' },
          { id: 'ontwikkelingen', label: 'Wat kan er veranderen' },
          { id: 'bronnen', label: 'Bronnen en peildatum' },
        ]}
      />

      <section aria-labelledby="gratis">
        <div className="ta-sectiekop">
          <h2 className="sectie" id="gratis" style={{ margin: 0 }}>
            Heffing in één jaar
          </h2>
          <Badge soort="gratis">Gratis</Badge>
        </div>
        <div className="raster raster-tool">
          <Kaart titel="Invoer" className="invoerkaart">
            <div className="velden">
              <GetalVeld label="Restafval" eenheid="ton/jaar" max={1e9} waarde={invoer.tonnage} onChange={(n) => zet('tonnage', n)} hint="Aanname: de tonnage die u laat verbranden." />
              <GetalVeld
                label="Fossiele emissiefactor"
                eenheid="t CO2/t"
                max={5}
                waarde={invoer.emissiefactor}
                onChange={(n) => zet('emissiefactor', n)}
                hint={`Kental ${getal(kentalEmissiefactor.waarde, 3)} uit de lijst van energiedragers 2026 (afval gemiddeld). Vraag de waarde van uw verwerker op.`}
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
                min={-10}
                max={25}
                waarde={invoer.inflatiePct}
                onChange={(n) => zet('inflatiePct', n)}
                hint={`Aanname. Het tarief stijgt elk jaar mee met de inflatie (art. 90 Wbm). Per 1 januari 2027 is dat ${procent(
                  inflatiecorrectie2027.pct,
                )}; latere jaren zijn niet bekend. Met 0 % ziet u de bedragen zoals ze in de wet staan.`}
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
                <>
                  <GetalVeld
                    label="Uitstoot van de AVI ten opzichte van het historisch niveau"
                    eenheid="%"
                    min={VERHOUDING_INVOER_MIN_PCT}
                    max={VERHOUDING_INVOER_MAX_PCT}
                    waarde={invoer.uitstootVerhoudingPct}
                    onChange={(n) => zet('uitstootVerhoudingPct', n)}
                    hint="Aanname. Historisch niveau: mediaan 2019–2023. Daalt de uitstoot binnen 85–115 %, dan stijgt het vrijgestelde deel."
                  />
                  {buitenBand(verhouding) && (
                    <p className="notitie" role="status">
                      Meer dan 15 % afwijking: de NEa past het activiteitsniveau dan aan, met efficiëntieregels uit het EU ETS. De scan
                      benadert dat met de actuele uitstoot (vrijgesteld deel zoals bij 100 %). Dat is een aanname; vraag het aantal
                      dispensatierechten op bij uw verwerker en kies “Eigen percentage”.
                    </p>
                  )}
                </>
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
            inklapbaar
            label={<Badge soort="status-gegund">Wet en NEa + uw aannames</Badge>}
            formule={`${FORMULE}\n${FORMULE_TARIEF}`}
            toelichting={
              <>
                De heffing betaalt de exploitant van de AVI. De scan verdeelt die naar rato van uw tonnage. Voor AVI’s gaat de EU
                ETS-prijs niet van het tarief af. {pad.status === 'voorstel' && 'U rekent met een wetsvoorstel dat nog kan wijzigen.'}
              </>
            }
            invoer={invoerRegels}
          >
            <div className="stapel">
              {pad.status === 'voorstel' && (
                <p className="notitie info">
                  <BronStatusLabel status="voorstel" /> U rekent met het Belastingplan 2027. Dat is nog niet aangenomen.
                </p>
              )}
              <div className="tegels">
                <Tegel label={`Heffing ${invoer.jaar}`} waarde={toon(euro(u.kosten))} toelichting={`over ${metEenheid(invoer.tonnage, 'ton')} restafval`} hero />
                <Tegel label="Per ton restafval" waarde={toon(euro(u.perTon, 2))} toelichting="gemiddeld" />
                <Tegel
                  label={`Tarief ${invoer.jaar}`}
                  waarde={toon(euro(u.tarief, 2))}
                  toelichting={metInflatie ? `per ton CO2, incl. ${procent(invoer.inflatiePct)} inflatie per jaar (aanname); wet: ${euro(tariefWet, 2)}` : 'per ton CO2, bedrag uit de wet'}
                />
              </div>
              {ok && (
                <div className="ta-onzeker" role="note" aria-label="Onzekerheid">
                  <p>
                    <strong>Onder- en bovengrens {invoer.jaar}:</strong>{' '}
                    {bandVast ? `${euro(band.laag.kosten)} (tarief ligt vast in de wet)` : `${euro(band.laag.kosten)} tot ${euro(band.hoog.kosten)}`}
                  </p>
                  {!bandVast && (
                    <p className="klein">
                      Beide tariefpaden, met inflatie van {procent(band.inflatie[0])} tot {procent(band.inflatie[1])} per jaar (uw aanname ± 1
                      procentpunt). Ondergrens bij een tarief van {euro(band.laag.tarief, 2)}, bovengrens bij {euro(band.hoog.tarief, 2)} per ton
                      CO2.
                    </p>
                  )}
                  <p className="klein">
                    <BronStatusLabel status="voorstel" /> Het Belastingplan 2027 is ingediend op 15 september 2026 en nog niet aangenomen. Het
                    coalitieakkoord noemt afschaffing van de heffing; dan vervalt dit bedrag. Beide vallen buiten de bandbreedte.
                  </p>
                </div>
              )}
              <dl className="invoerlijst">
                <dt>Fossiele uitstoot</dt>
                <dd>{metEenheid(u.uitstoot, 'ton CO2')}</dd>
                <dt>Vrijgesteld ({procent(Math.min(u.vrijgesteldDeel, 1) * 100)})</dt>
                <dd>{metEenheid(Math.min(u.vrijgesteld, u.uitstoot), 'ton CO2')}</dd>
                <dt>Belast</dt>
                <dd>{metEenheid(u.belastbaar, 'ton CO2')}</dd>
                <dt>Bij {tariefpaden[anderPad].kort}</dt>
                <dd>{toon(euro(ander.kosten))}</dd>
              </dl>
              {u.vrijgesteldDeel > 1 && (
                <p className="notitie" role="status">
                  Het vrijgestelde deel is groter dan de uitstoot. De verwerker heeft dan een overschot aan dispensatierechten en
                  betaalt over dit deel geen heffing.
                </p>
              )}
              {ok ? (
                <ExportKnoppen
                  naam="CO2-heffingenscan"
                  csvRijen={csvGratis}
                  params={deelParams}
                  pad={PAD}
                  linkInklappen
                  toelichting="De CSV bevat invoer, herkomst van elk getal, parameters met bron, bandbreedte en uitkomst. De link bewaart al uw invoer."
                />
              ) : (
                <p className="klein muted">CSV en deellink staan weer klaar zodra de invoer klopt.</p>
              )}
            </div>
          </Uitkomst>
        </div>
      </section>

      <section className="ta-pro" aria-labelledby="pro">
        <div className="ta-sectiekop">
          <h2 className="sectie" id="pro" style={{ margin: 0 }}>
            Verloop en scenario’s
          </h2>
          <Badge soort="pro">Pro voor leden</Badge>
        </div>
        <p className="ta-pro-uitleg">
          De heffing per jaar tot en met {scanJaren.laatste} bij drie scheidingspercentages, per inwoner, en naast het andere tariefpad.
        </p>
        {laden ? (
          <p className="notitie info" role="status" style={{ minHeight: 120 }}>
            Ledentoegang controleren…
          </p>
        ) : (
          <Vergrendeld
            titel="CO2-heffingenscan Pro"
            ledenKrijgen={[
              `Verloop ${scanJaren.eerste}–${scanJaren.laatste} naast elkaar voor geldend recht en het wetsvoorstel`,
              'Drie scenario’s voor het scheidingspercentage',
              'Effect per inwoner',
              'CSV van alle jaren en rapport maken',
            ]}
          >
            <Co2Pro invoer={invoer} zet={zet} padId={padId} deelParams={deelParams} ok={ok} />
          </Vergrendeld>
        )}
      </section>

      <section className="ta-achtergrond" aria-labelledby="ta-achtergrond-kop">
        <h2 className="sectie" id="ta-achtergrond-kop">
          Achtergrond
        </h2>
        <Inklapbaar id="tarieven" titel="Tarieven per jaar" sub={`geldend recht en wetsvoorstel, ${scanJaren.eerste}–${scanJaren.laatste}`}>
          <p className="klein" style={{ margin: 0 }}>
            {invoer.inflatiePct === 0
              ? 'Bedragen zoals in de wet, zonder jaarlijkse inflatiecorrectie.'
              : `Met een aangenomen inflatiecorrectie van ${procent(invoer.inflatiePct)} per jaar.`}{' '}
            Onder het tarief staat de AVI-correctiefactor voor de vrijgestelde uitstoot.
          </p>
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel tarief en correctiefactor per jaar">
            <table>
              <caption>Euro per ton CO2. Bron: Wbm art. 71p, Wm art. 16b.17 en wetsvoorstel Belastingplan 2027, peildatum {datum(PEILDATUM)}.</caption>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  <th scope="col" className="num">
                    Geldend recht
                  </th>
                  <th scope="col" className="num">
                    Voorstel BP 2027
                  </th>
                </tr>
              </thead>
              <tbody>
                {tariefRijen.map((r) => (
                  <tr key={r.jaar}>
                    <th scope="row" style={{ fontWeight: 600 }}>
                      {r.jaar}
                    </th>
                    <td className="num">
                      {euro(r.geldend.tarief, 2)}
                      <span className="ta-onder">correctiefactor {getal(r.geldend.correctiefactor, 2)}</span>
                    </td>
                    <td className="num">
                      {euro(r.voorstel.tarief, 2)}
                      <span className="ta-onder">correctiefactor {getal(r.voorstel.correctiefactor, 2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invoer.inflatiePct === 0 && (
            <p className="notitie" role="note">
              Let op bij vergelijken: de verhogingen in het wetsvoorstel houden al rekening met inflatie, die in het geldend recht
              niet. Zonder inflatieaanname lijkt het voorstel daardoor in 2035 duurder. Vul een inflatiecorrectie in, of kijk naar de
              vergelijking in prijspeil 2026 hieronder.
            </p>
          )}
          <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel tariefpad in prijspeil 2026">
            <table>
              <caption>
                Tariefpad in prijspeil 2026, afgerond op hele euro’s per ton CO2. Bron:{' '}
                <a href={bronnen.bp2027.url} target="_blank" rel="noopener noreferrer">
                  memorie van toelichting Belastingplan 2027, tabel 12
                </a>
                , peildatum {datum(PEILDATUM)}.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
                  <th scope="col" className="num">
                    Geldend recht
                  </th>
                  <th scope="col" className="num">
                    Voorstel BP 2027
                  </th>
                </tr>
              </thead>
              <tbody>
                {tariefpadPrijspeil2026.map((r) => (
                  <tr key={r.jaar}>
                    <th scope="row" style={{ fontWeight: 600 }}>
                      {r.jaar}
                    </th>
                    <td className="num">{euro(r.geldend, 0)}</td>
                    <td className="num">{euro(r.voorstel, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="klein muted" style={{ margin: 0 }}>
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
        </Inklapbaar>
        <Inklapbaar id="ontwikkelingen" titel="Wat kan er veranderen" sub={`${ontwikkelingen.length} ontwikkelingen`}>
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
        </Inklapbaar>
        <Inklapbaar id="rekenregels" titel="Zo rekent de scan" sub="formules en uitgangspunten">
          <code className="formule">{`${FORMULE}\n${FORMULE_TARIEF}`}</code>
          <ul className="opsomming">
            <li>De heffing betaalt de exploitant van de AVI. De scan verdeelt die naar rato van uw tonnage. Hoeveel uw verwerker doorberekent, staat in uw contract.</li>
            <li>
              Geldend recht: het tarief én de nog niet toegepaste verhogingen stijgen elk jaar mee met de inflatie (art. 90 Wbm).
              Voorstel Belastingplan 2027: het tarief 2027 is € 129,15 en de verhogingen daarna bevatten al inflatie.
            </li>
            <li>
              Historisch niveau: mediaan van de uitstoot 2019–2023. Binnen ± 15 % rekent de NEa daarmee. Wijkt de uitstoot meer af, dan
              past de NEa het activiteitsniveau aan met efficiëntieregels uit het EU ETS; de scan benadert dat met de actuele uitstoot
              (aanname).
            </li>
            <li>
              Bandbreedte: de heffing bij geldend recht en bij het wetsvoorstel, met uw inflatieaanname min en plus 1 procentpunt (niet
              onder 0 %). Andere invoer blijft gelijk. Afschaffing van de heffing valt erbuiten.
            </li>
            <li>De EU ETS-prijs gaat voor AVI’s niet van het tarief af, omdat AVI’s (nog) geen emissierechten inleveren.</li>
          </ul>
        </Inklapbaar>
        <Inklapbaar id="bronnen" titel="Bronnen en peildatum" sub={`wet, NEa en RVO, geraadpleegd op ${datum(PEILDATUM)}`}>
          <BronRegels regels={bronRegels} />
        </Inklapbaar>
        <Inklapbaar id="versie" titel="Versie en wijzigingen" sub={VERSIE_TEKST}>
          <ul className="opsomming">
            {co2ToolVersie.wijzigingen.map((w) => (
              <li key={w.versie}>
                <strong>
                  Versie {w.versie} ({datum(w.datum)}).
                </strong>{' '}
                {w.tekst}
              </li>
            ))}
          </ul>
        </Inklapbaar>
      </section>
      <RapportVoet tekst={`Tarieven en regels: wet en NEa, peildatum ${datum(PEILDATUM)} · ${VERSIE_TEKST}`} />
    </div>
  );
}

interface ProProps {
  invoer: Co2PaginaInvoer;
  zet: <K extends keyof Co2PaginaInvoer>(k: K, v: Co2PaginaInvoer[K]) => void;
  padId: PadId;
  deelParams: URLSearchParams;
  /** Klopt alle invoer? Anders geen bedragen tonen. */
  ok: boolean;
}

/** Eén regel in de kern bovenaan voor leden: totaal over alle jaren bij het gekozen tariefpad. */
function KernPro({ invoer, padId }: { invoer: Co2PaginaInvoer; padId: PadId }) {
  const reeks = scanReeks(regelsVoor(padId), invoer, scanJaren.eerste, scanJaren.laatste);
  const totaal = reeks.reduce((s, x) => s + x.kosten, 0);
  return (
    <li>
      Pro: totaal {scanJaren.eerste}–{scanJaren.laatste} <strong>{euro(totaal)}</strong> bij {tariefpaden[padId].kort.toLowerCase()} en het huidige
      scheidingspercentage. <a href="#pro-uitkomst">Naar het verloop</a>.
    </li>
  );
}

function Co2Pro({ invoer, zet, padId, deelParams, ok }: ProProps) {
  // Op smalle schermen staan de bedragen per jaar ingeklapt (de grafiek toont het verloop); breed staan ze open.
  const [breed] = useState(() => typeof window === 'undefined' || !window.matchMedia || window.matchMedia('(min-width: 521px)').matches);
  const anderPad: PadId = padId === 'geldend' ? 'voorstel' : 'geldend';
  const scenarios = [
    { naam: `Huidig (${procent(invoer.scheidingNuPct, 0)} scheiding)`, kort: 'Huidig', pct: invoer.scheidingNuPct },
    { naam: `${procent(invoer.scenario2Pct, 0)} scheiding`, kort: procent(invoer.scenario2Pct, 0), pct: invoer.scenario2Pct },
    { naam: `${procent(invoer.scenario3Pct, 0)} scheiding`, kort: procent(invoer.scenario3Pct, 0), pct: invoer.scenario3Pct },
  ].map((s) => ({
    ...s,
    ton: restafvalBijScheiding(invoer.tonnage, invoer.scheidingNuPct, s.pct),
    regels: scanReeks(regelsVoor(padId), invoer, scanJaren.eerste, scanJaren.laatste, { nuPct: invoer.scheidingNuPct, scenarioPct: s.pct }),
  }));
  const vergelijk = scanReeks(regelsVoor(anderPad), invoer, scanJaren.eerste, scanJaren.laatste);
  const perInw = (k: number) => (invoer.inwoners > 0 ? k / invoer.inwoners : 0);
  const totaal = (r: { kosten: number }[]) => r.reduce((s, x) => s + x.kosten, 0);
  const laatste = scenarios[0].regels.length - 1;

  const csvPro = (): CsvCel[][] => [
    ['CO2-heffingenscan Pro', 'KplusV'],
    ['Versie tool', `${co2ToolVersie.versie} (${co2ToolVersie.datum})`],
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
      `Tarief (euro per ton CO2)${invoer.inflatiePct !== 0 ? `, na het laatste vaste jaar incl. inflatieaanname ${getal(invoer.inflatiePct, 1)} %` : ''}`,
      'AVI-correctiefactor',
      'Vrijgesteld deel (%)',
      ...scenarios.flatMap((s): CsvCel[] => [`${s.naam}: restafval (ton)`, `${s.naam}: heffing (euro)`, `${s.naam}: per inwoner (euro)`]),
      `Huidig bij ${tariefpaden[anderPad].kort}: tarief (euro per ton CO2)`,
      `Huidig bij ${tariefpaden[anderPad].kort}: heffing (euro)`,
    ],
    ...scenarios[0].regels.map((r, i): CsvCel[] => [
      r.jaar,
      r.tarief,
      r.correctiefactor,
      r.vrijgesteldDeel * 100,
      ...scenarios.flatMap((s): CsvCel[] => [s.ton, s.regels[i].kosten, perInw(s.regels[i].kosten)]),
      vergelijk[i].tarief,
      vergelijk[i].kosten,
    ]),
    [],
    ['Formule', FORMULE],
    ['Tarief per jaar', FORMULE_TARIEF],
    ['Restafval scenario', 'restafval × (100 − scheiding scenario) / (100 − scheiding huidig)'],
  ];

  return (
    <div className="stapel">
      <Kaart titel="Scenario’s" kopNiveau={3} className="invoerkaart" sub="Restafval, emissiefactor, tariefpad en vrijstelling komen uit het gratis deel hierboven.">
        <div className="velden-2">
          <GetalVeld label="Inwoners" eenheid="inw" max={1e8} waarde={invoer.inwoners} onChange={(n) => zet('inwoners', n)} hint="Aanname: inwoners in uw gebied." />
          <GetalVeld label="Huidig scheidingspercentage" eenheid="%" max={99} waarde={invoer.scheidingNuPct} onChange={(n) => zet('scheidingNuPct', n)} />
          <GetalVeld label="Scenario 2: scheidingspercentage" eenheid="%" max={99} waarde={invoer.scenario2Pct} onChange={(n) => zet('scenario2Pct', n)} />
          <GetalVeld label="Scenario 3: scheidingspercentage" eenheid="%" max={99} waarde={invoer.scenario3Pct} onChange={(n) => zet('scenario3Pct', n)} />
        </div>
      </Kaart>

      <div id="pro-uitkomst">
      <Uitkomst
        inklapbaar
        titel={`Verloop ${scanJaren.eerste}–${scanJaren.laatste}`}
        label={<Badge soort="status-gegund">Wet en NEa, peildatum {datum(PEILDATUM)}</Badge>}
        formule={`${FORMULE}\n${FORMULE_TARIEF}\nrestafval scenario = restafval × (100 − scheiding scenario) / (100 − scheiding huidig)\nper inwoner = heffing / inwoners`}
        toelichting={`Lijnen: ${tariefpaden[padId].kort}. Grijze stippellijn: huidig scenario bij ${tariefpaden[anderPad].kort}.`}
        invoer={[
          { label: 'Tariefpad', waarde: tariefpaden[padId].kort },
          { label: 'Restafval huidig', waarde: metEenheid(invoer.tonnage, 'ton per jaar') },
          { label: 'Inflatiecorrectie (aanname)', waarde: inflatieTekst(invoer.inflatiePct) },
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
                waarde={ok ? euro(totaal(s.regels)) : '–'}
                toelichting={`${euro(perInw(s.regels[laatste].kosten), 2)} per inwoner in ${s.regels[laatste].jaar}`}
                hero={i === 0}
              />
            ))}
          </div>
          <p className="klein" style={{ margin: 0 }}>
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
          <details className="ta-afronding ta-jaartabel" open={breed || undefined}>
            <summary>
              <span className="veld-label">Bedragen per jaar</span>{' '}
              <span className="ta-inklap-sub">
                {scenarios[0].regels.length} jaren, {scenarios.length} scenario’s
              </span>
            </summary>
          <div className="tabel-container ta-kaarttabel-houder" tabIndex={0} role="region" aria-label="Tabel heffing per jaar per scenario">
            <table className="ta-kaarttabel">
              <caption>
                Heffing per jaar bij {tariefpaden[padId].kort}, met het bedrag per inwoner eronder. Tarief per ton CO2
                {invoer.inflatiePct !== 0 ? ' (na 2026 incl. inflatieaanname)' : ''} en vrijgesteld deel staan bij het jaar.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Jaar</th>
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
                    <th scope="row" style={{ fontWeight: 600 }}>
                      {r.jaar}
                      <span className="ta-onder">tarief {euro(r.tarief, 0)}/t</span>
                      <span className="ta-onder">vrij {procent(Math.min(r.vrijgesteldDeel, 1) * 100, 0)}</span>
                    </th>
                    {scenarios.map((s) => (
                      <td key={s.naam} className="num" data-label={s.kort}>
                        {ok ? euro(s.regels[j].kosten) : '–'}
                        <span className="ta-onder">{ok ? euro(perInw(s.regels[j].kosten), 2) : '–'}/inw</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
          {ok && <ExportKnoppen naam="CO2-heffingenscan Pro" csvRijen={csvPro} params={deelParams} pad={PAD} linkInklappen />}
          <RapportKnop />
        </div>
      </Uitkomst>
      </div>
    </div>
  );
}
