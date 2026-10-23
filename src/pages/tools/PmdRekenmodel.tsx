import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { reeksKleuren, StaafGrafiek } from '../../components/grafiek/Grafieken';
import { Bronnenlijst, type BronRegel } from '../../components/rekenen/Bronnen';
import { ExportKnoppen } from '../../components/rekenen/Export';
import { OpDezePagina } from '../../components/rekenen/OpDezePagina';
import type { CsvCel } from '../../components/rekenen/export';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { BronVeld } from '../../components/rekenen/b/BronVeld';
import { Ontbreekt } from '../../components/rekenen/b/Knoppen';
import { Badge, Kaart, KeuzeVeld, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import { pmdStandaard, pmdStandaardCategorie } from '../../data/standaardwaarden';
import {
  asb2026,
  cbsGemeenten,
  cbsPmd,
  kentalNascheidingskosten,
  kentalVerbrandingstarief,
  kostenbasisBron,
  nascheiding,
  PEILDATUM,
  pmdBronnen,
  poorttariefBandbreedte,
  staffel,
  staffelJaren,
  staffelPerCategorie,
  voorschot2026,
  type StaffelCategorie,
} from '../../data/tools-b-pmd';
import { breakEvenTeruggewonnen, pmdNaarParams, pmdUitParams, pmdVergelijking, vergoedingVoorTonnage, type PmdInvoer, type PmdRoute } from '../../lib/calc/pmd';
import { datum, euro, getal, metEenheid, procent } from '../../lib/format';

const PAD = '/tools/pmd-rekenmodel';
const FORMULE = `Nulsituatie: al het PMD gaat met het restafval naar de verbranding.
bronscheiding: PMD = inwoners × respons / 1000
               netto = PMD × (inzamelkosten + overige kosten − inzamelvergoeding − verbrandingstarief)
nascheiding:   restafval = inwoners × restafval naar nascheider / 1000
               netto = restafval × (nascheidingskosten − nascheidingsvergoeding) − teruggewonnen PMD × verbrandingstarief
per inwoner = netto / inwoners`;

const categorieen = staffel.map((s) => s.categorie);
const r1 = (n: number) => Math.round(n * 10) / 10;
const cbsBron = { titel: `CBS ${cbsPmd.bronnen.gemeente.tabelId}, ${cbsPmd.jaar}`, url: cbsPmd.bronnen.gemeente.url };
const cbsNlBron = { titel: `CBS ${cbsPmd.bronnen.landelijk.tabelId}, ${cbsPmd.landelijk.jaar}`, url: cbsPmd.bronnen.landelijk.url };
const akkoordBron = { titel: 'akkoord Verpact, VNG en NVRD (2025)', url: pmdBronnen.akkoord.url };

/** Standaardinvoer met de CBS-cijfers van een gemeente (of landelijk als de code onbekend is). */
function basisVoorGemeente(code: string): PmdInvoer {
  const n = cbsGemeenten.find((x) => x.code === code);
  const resp = n?.pmdKgPerInw ?? cbsPmd.landelijk.pmdKgPerInw;
  return {
    ...pmdStandaard,
    inwoners: n?.inwoners ?? pmdStandaard.inwoners,
    responsBron: resp,
    restafvalNa: r1((n?.restafvalKgPerInw ?? cbsPmd.landelijk.restafvalKgPerInw) + resp),
  };
}

const kostOfLevert = (n: number | null) => (n === null ? 'is nog niet te berekenen' : n < 0 ? `levert netto ${euro(-n)} op` : `kost netto ${euro(n)}`);

const euroOfStreep = (n: number | null, d = 0) => (n === null ? '–' : euro(n, d));

export function PmdRekenmodel() {
  return (
    <>
      <RapportKop titel="Rekenmodel bron- en nascheiding PMD" ondertitel={`Vergoedingen 2026 volgens akkoord Verpact, VNG en NVRD; CBS ${cbsPmd.jaar}; peildatum ${datum(PEILDATUM)}`} />
      <PaginaKop titel="Rekenmodel bron- en nascheiding PMD" badges={<ToegangBadge toegang="leden" />}>
        Vergelijk wat bronscheiding en nascheiding van PMD uw gemeente per jaar kosten, met de vergoedingen van Verpact voor
        2026 en de afvalcijfers van CBS voor uw gemeente. Kosten en tarieven zonder openbare bron staan als kental of
        aanname gemarkeerd.
      </PaginaKop>
      <OpDezePagina
        links={[
          { id: 'model', label: 'Rekenmodel (leden)' },
          { id: 'staffel', label: 'Vergoedingen 2026–2028' },
          { id: 'bronnen', label: 'Bronnen en peildatum' },
        ]}
      />
      <h2 className="sectie" id="model" style={{ marginBottom: 12 }}>
        Rekenmodel
      </h2>
      <Vergrendeld
        titel="Rekenmodel bron- en nascheiding PMD"
        ledenKrijgen={[
          'Afvalcijfers van CBS voor uw gemeente met één keuze',
          'Bronscheiding en nascheiding naast elkaar, totaal en per inwoner',
          'Opbrengst per staffelcategorie en verloop 2026–2028',
          'CSV, deellink en rapport',
        ]}
      >
        <PmdModel />
      </Vergrendeld>

      <h2 className="sectie" id="staffel" style={{ margin: '28px 0 12px' }}>
        Vergoedingen 2026–2028
      </h2>
      <div className="raster raster-2">
        <StaffelKaart />
        <Bronnenlijst id="bronnen" regels={bronRegels} sub={<>Alle bronnen geraadpleegd op {datum(PEILDATUM)}.</>} />
      </div>
      <RapportVoet tekst={`Vergoedingen: akkoord Verpact, VNG en NVRD; CBS ${cbsPmd.jaar}; peildatum ${datum(PEILDATUM)}`} />
    </>
  );
}

function StaffelKaart() {
  return (
    <Kaart titel="Staffel inzamelvergoeding bronscheiding" sub="Euro per ton ingezameld PMD. De categorie hangt af van het aandeel PMD-verpakkingen in wat u inzamelt.">
      <div className="tabel-container" tabIndex={0} role="region" aria-label="Tabel staffel inzamelvergoeding">
        <table>
          <caption>
            Bron:{' '}
            <a href={pmdBronnen.akkoord.url} target="_blank" rel="noopener noreferrer">
              onderhandelingsresultaat Verpact, VNG en NVRD, par. 6.2
            </a>
            . Bedragen afgerond zoals in de bron. 100 % = kostenbasis {euro(kostenbasisBron)}.
          </caption>
          <thead>
            <tr>
              <th scope="col">Categorie</th>
              {staffelJaren.map((j) => (
                <th key={j} scope="col" className="num">
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffel.map((s) => (
              <tr key={s.categorie}>
                <th scope="row" style={{ fontWeight: 500, whiteSpace: 'normal', minWidth: 150 }}>
                  {s.categorie}: {s.aandeel}
                </th>
                {staffelJaren.map((j) => (
                  <td key={j} className="num">
                    {euro(s.euroPerTon[j])}
                    <br />
                    <span className="klein muted">{procent(s.pctKostenbasis[j], 0)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="opsomming klein">
        <li>
          Voor 2027 en 2028 worden de bedragen geïndexeerd met een methode die partijen samen vaststellen. De euro’s daarvan
          zijn nog niet gepubliceerd; de tabel toont alleen de afgesproken daling van categorie 3b.
        </li>
        <li>
          Voorschot 2026 voor gemeenten met (overwegend) een haalsysteem: {euro(voorschot2026)} per ton. Verrekening volgt op
          basis van de gemeten kwaliteit (
          <a href={pmdBronnen.nvrd.url} target="_blank" rel="noopener noreferrer">
            NVRD, 11 juni 2025
          </a>
          ).
        </li>
        <li>
          Nascheiding: {euro(nascheiding.vergoeding2026, 2)} per ton restafval dat bij een door Verpact gecontracteerde
          nascheider is nagescheiden (par. 7).
        </li>
        <li>Na overdracht op de overslag wordt apart ingezameld PMD eigendom van Verpact, dat sortering en verdere verwerking regelt.</li>
      </ul>
    </Kaart>
  );
}

const bronRegels: BronRegel[] = [
  {
    onderwerp: 'Inzamelvergoeding bronscheiding (staffel)',
    status: 'officieel',
    waarde: `${staffel.map((s) => `${s.categorie}: ${euro(s.euroPerTon[2026])}`).join(' · ')} per ton (2026)`,
    toelichting: 'Ingestemd door de ledenvergaderingen van VNG en NVRD op 18 en 19 juni 2025. Uw deelnemersovereenkomst met Verpact is leidend.',
    bron: `${pmdBronnen.akkoord.uitgever}, ${pmdBronnen.akkoord.titel}`,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Inzamelkosten bronscheiding',
    status: 'kental',
    waarde: `${euro(kostenbasisBron)} per ton PMD`,
    toelichting:
      'De kostenbasis van de staffel (100 %): kostenonderzoek 2021, gecontroleerd door EY, zonder uitschieters, 90 % haal- en 10 % brengsystemen, plus € 5 voor flankerend beleid, geïndexeerd naar 2025. Een gemiddelde; uw eigen kosten kunnen hoger of lager zijn.',
    bron: pmdBronnen.akkoord.titel,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Nascheidingsvergoeding',
    status: 'officieel',
    waarde: `${euro(nascheiding.vergoeding2026, 2)} per ton restafval (2026)`,
    toelichting: `(${getal(nascheiding.kosten2021, 2)} + ${getal(nascheiding.opslagTransport, 2)}) × ${procent(nascheiding.pmdAandeel * 100, 1)} PMD × ${getal(nascheiding.inflatiefactor, 4)} inflatiecorrectie.`,
    bron: pmdBronnen.akkoord.titel,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Nascheidingskosten',
    status: 'kental',
    waarde: `${euro(kentalNascheidingskosten, 2)} per ton restafval`,
    toelichting: `Afgeleid door KplusV: gemiddelde kosten uit het kostenonderzoek 2021 (${euro(nascheiding.kosten2021, 2)}) plus opslag transport en overslag (${euro(
      nascheiding.opslagTransport,
      2,
    )}), met dezelfde inflatiecorrectie die het akkoord op de vergoeding toepast. Vraag het tarief van uw nascheider op.`,
    bron: pmdBronnen.akkoord.titel,
    url: pmdBronnen.akkoord.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Verbrandingstarief restafval',
    status: 'kental',
    waarde: `${euro(kentalVerbrandingstarief, 2)} per ton`,
    toelichting: `Midden van het poorttarief bij aanbesteding van gemeentelijk restafval (${euro(poorttariefBandbreedte.laag)}–${euro(
      poorttariefBandbreedte.hoog,
    )} per ton, Strategy& 2025 op basis van ACM 2023) plus afvalstoffenbelasting 2026 (${euro(asb2026, 2)} per ton, Belastingdienst). De bron zegt niet of het poorttarief belasting bevat; de tool telt de belasting apart op. CO2-heffing zit er niet in.`,
    bron: `${pmdBronnen.strategy.uitgever}; ${pmdBronnen.asb.uitgever}`,
    url: pmdBronnen.strategy.url,
    peildatum: PEILDATUM,
  },
  {
    onderwerp: 'Inwoners, PMD en restafval per gemeente',
    status: 'officieel',
    waarde: `${cbsGemeenten.length} gemeenten, ${cbsPmd.jaar}; landelijk ${getal(cbsPmd.landelijk.pmdKgPerInw)} kg PMD en ${getal(cbsPmd.landelijk.restafvalKgPerInw)} kg restafval per inwoner (${cbsPmd.landelijk.jaar})`,
    toelichting: `PMD = PMD-fractie + kunststof verpakkingen + drankenkartons + blik, gescheiden ingezameld. Het landelijk gemiddelde telt ook gemeenten die nascheiden en dus weinig PMD apart inzamelen. Inwoners: ${cbsPmd.bronnen.inwoners.titel} (${cbsPmd.bronnen.inwoners.tabelId}).`,
    bron: `CBS, ${cbsPmd.bronnen.gemeente.titel} (${cbsPmd.bronnen.gemeente.tabelId}) en ${cbsPmd.bronnen.landelijk.titel} (${cbsPmd.bronnen.landelijk.tabelId})`,
    url: cbsPmd.bronnen.gemeente.url,
    peildatum: cbsPmd.peildatum,
  },
  {
    onderwerp: 'Teruggewonnen PMD bij nascheiding en overige kosten',
    status: 'aanname',
    toelichting: `Geen openbare bron. Ter oriëntatie: in het kostenonderzoek 2021 bestond nascheidingsrestafval voor ${procent(
      nascheiding.pmdAandeel * 100,
      1,
    )} uit PMD; dat is de samenstelling, niet wat de nascheider terugwint. Vraag het rendement op bij uw nascheider.`,
  },
];

function PmdModel() {
  const [params, setParams] = useSearchParams();
  const [gemeente, setGemeente] = useState<string>(() => {
    const gm = params.get('gm') ?? '';
    return cbsGemeenten.some((g) => g.code === gm) ? gm : '';
  });
  const [categorie, setCategorie] = useState<StaffelCategorie>(() => {
    const c = params.get('cat') as StaffelCategorie | null;
    return c && categorieen.includes(c) ? c : pmdStandaardCategorie;
  });
  // Met gemeente en categorie in de link zijn hun cijfers de basis; expliciete waarden in de link gaan voor.
  const [i, setI] = useState<PmdInvoer>(() =>
    pmdUitParams(params, { ...basisVoorGemeente(params.get('gm') ?? ''), vergoedingBron: staffelPerCategorie[categorie].euroPerTon[2026] }),
  );
  const zet = <K extends keyof PmdInvoer>(k: K) => (v: PmdInvoer[K]) => setI((x) => ({ ...x, [k]: v }));

  const g = cbsGemeenten.find((x) => x.code === gemeente);
  const bronRespons = g?.pmdKgPerInw ?? cbsPmd.landelijk.pmdKgPerInw;
  const bronRest = r1((g?.restafvalKgPerInw ?? cbsPmd.landelijk.restafvalKgPerInw) + bronRespons);
  const vergoedingCategorie = staffelPerCategorie[categorie].euroPerTon[2026];

  function kiesGemeente(code: string) {
    setGemeente(code);
    const b = basisVoorGemeente(code);
    setI((x) => ({ ...x, inwoners: b.inwoners, responsBron: b.responsBron, restafvalNa: b.restafvalNa }));
  }
  function kiesCategorie(c: StaffelCategorie) {
    setCategorie(c);
    setI((x) => ({ ...x, vergoedingBron: staffelPerCategorie[c].euroPerTon[2026] }));
  }

  const { bron, na, verschil } = pmdVergelijking(i);
  const breakEven = breakEvenTeruggewonnen(i);

  const deelParams = pmdNaarParams(i, { ...(gemeente ? { gm: gemeente } : {}), cat: categorie });
  const deelTekst = deelParams.toString();
  useEffect(() => {
    if (params.toString() !== deelTekst) setParams(new URLSearchParams(deelTekst), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deelTekst]);

  const gebied = g ? `${g.naam} (CBS ${cbsPmd.jaar})` : 'eigen invoer, landelijke gemiddelden';

  const csv = (): CsvCel[][] => [
    ['Rekenmodel bron- en nascheiding PMD', 'KplusV'],
    ['Peildatum', PEILDATUM],
    ['Gebied', gebied],
    [],
    ['Invoer', 'Waarde', 'Herkomst'],
    ['Inwoners', i.inwoners, g && i.inwoners === g.inwoners ? `CBS ${cbsPmd.bronnen.inwoners.tabelId}` : 'eigen waarde of voorbeeld'],
    ['Respons bronscheiding (kg per inwoner)', i.responsBron, i.responsBron === bronRespons ? (g ? `CBS ${cbsPmd.bronnen.gemeente.tabelId}` : `CBS ${cbsPmd.bronnen.landelijk.tabelId}`) : 'eigen waarde'],
    ['Staffelcategorie', categorie, staffelPerCategorie[categorie].aandeel],
    ['Inzamelvergoeding (euro per ton PMD)', i.vergoedingBron, i.vergoedingBron === vergoedingCategorie ? pmdBronnen.akkoord.url : 'eigen waarde'],
    ['Inzamelkosten (euro per ton PMD)', i.inzamelkostenBron, i.inzamelkostenBron === kostenbasisBron ? 'kental: kostenbasis akkoord 2025' : 'eigen waarde'],
    ['Overige kosten bronscheiding (euro per ton PMD)', i.overigeKostenBron, 'aanname gebruiker'],
    ['Restafval naar nascheider (kg per inwoner)', i.restafvalNa, i.restafvalNa === bronRest ? 'afgeleid: CBS restafval + CBS PMD' : 'eigen waarde'],
    ['Nascheidingskosten (euro per ton restafval)', i.nascheidingskosten, i.nascheidingskosten === kentalNascheidingskosten ? 'kental afgeleid uit akkoord 2025' : 'eigen waarde'],
    ['Nascheidingsvergoeding (euro per ton restafval)', i.vergoedingNa, i.vergoedingNa === nascheiding.vergoeding2026 ? pmdBronnen.akkoord.url : 'eigen waarde'],
    ['Teruggewonnen PMD bij nascheiding (kg per inwoner)', i.teruggewonnenNa, i.teruggewonnenNa === null ? 'niet ingevuld' : 'aanname gebruiker'],
    ['Verbrandingstarief incl. afvalstoffenbelasting (euro per ton)', i.verbrandingstarief, i.verbrandingstarief === kentalVerbrandingstarief ? 'kental Strategy& 2025 + ASB 2026' : 'eigen waarde'],
    [],
    ['Uitkomst', 'Bronscheiding', 'Nascheiding'],
    ['PMD gescheiden of teruggewonnen (ton)', bron.pmdTon, na.pmdTon],
    ['Restafval door nascheider (ton)', '', na.grondslagTon],
    ['Kosten (euro)', bron.kosten, na.kosten],
    ['Vergoeding Verpact (euro)', bron.vergoeding, na.vergoeding],
    ['Vermeden verbranding (euro)', bron.vermedenVerbranding, na.vermedenVerbranding],
    ['Netto per jaar (euro, negatief = opbrengst)', bron.netto, na.netto],
    ['Netto per inwoner (euro)', bron.perInwoner, na.perInwoner],
    ['Netto per ton PMD (euro)', bron.perTonPmd, na.perTonPmd],
    ['Verschil nascheiding − bronscheiding (euro)', verschil],
    ['Teruggewonnen PMD waarbij beide even duur zijn (kg per inwoner)', breakEven],
    [],
    ['Formule', FORMULE],
  ];

  const ontbrekend = i.teruggewonnenNa === null ? ['Teruggewonnen PMD bij nascheiding (kg per inwoner)'] : [];

  return (
    <div className="stapel">
      <div className="raster raster-tool">
        <Kaart titel="Invoer" className="invoerkaart">
          <div className="velden">
            <KeuzeVeld
              label="Gemeente"
              waarde={gemeente}
              opties={[{ waarde: '', label: 'Geen keuze: landelijk gemiddelde' }, ...cbsGemeenten.map((x) => ({ waarde: x.code, label: x.naam }))]}
              onChange={kiesGemeente}
              hint={`Vult inwoners, PMD en restafval in met CBS-cijfers over ${cbsPmd.jaar}.`}
            />
            <BronVeld
              label="Inwoners"
              eenheid="inw"
              waarde={i.inwoners}
              onChange={(n) => zet('inwoners')(n ?? 0)}
              status={g ? 'officieel' : 'aanname'}
              magLeeg={false}
              voorbeeld={g ? undefined : pmdStandaard.inwoners}
              bronwaarde={g?.inwoners ?? undefined}
              bronwaardeTekst={g?.inwoners ? getal(g.inwoners) : undefined}
              bron={g ? { titel: `CBS ${cbsPmd.bronnen.inwoners.tabelId}, 1 januari ${cbsPmd.jaar}`, url: cbsPmd.bronnen.inwoners.url } : undefined}
            />
            <fieldset className="velden">
              <legend>Bronscheiding</legend>
              <BronVeld
                label="PMD gescheiden ingezameld"
                eenheid="kg/inw"
                waarde={i.responsBron}
                onChange={(n) => zet('responsBron')(n ?? 0)}
                status="officieel"
                bronwaarde={bronRespons}
                bronwaardeTekst={`${getal(bronRespons, 1)} kg`}
                bron={g ? cbsBron : cbsNlBron}
                toelichting={g ? undefined : 'Landelijk gemiddelde, inclusief gemeenten die nascheiden. Kies uw gemeente voor een beter beeld.'}
              />
              <KeuzeVeld
                label="Staffelcategorie"
                waarde={categorie}
                opties={staffel.map((s) => ({ waarde: s.categorie, label: `${s.categorie}: ${s.aandeel} (${euro(s.euroPerTon[2026])})` }))}
                onChange={kiesCategorie}
                hint="Volgt uit het gemeten aandeel PMD-verpakkingen in uw ingezamelde PMD."
              />
              <BronVeld
                label="Inzamelvergoeding Verpact"
                eenheid="€/t PMD"
                waarde={i.vergoedingBron}
                onChange={(n) => zet('vergoedingBron')(n ?? 0)}
                status="officieel"
                bronwaarde={vergoedingCategorie}
                bronwaardeTekst={euro(vergoedingCategorie)}
                bron={akkoordBron}
              />
              <BronVeld
                label="Inzamelkosten"
                eenheid="€/t PMD"
                waarde={i.inzamelkostenBron}
                onChange={(n) => zet('inzamelkostenBron')(n ?? 0)}
                status="kental"
                bronwaarde={kostenbasisBron}
                bronwaardeTekst={euro(kostenbasisBron)}
                bron={akkoordBron}
                toelichting="Gemiddelde kostenbasis uit het akkoord. Vul uw eigen kosten in als u die kent."
              />
              <BronVeld
                label="Overige kosten bronscheiding"
                eenheid="€/t PMD"
                waarde={i.overigeKostenBron}
                onChange={(n) => zet('overigeKostenBron')(n ?? 0)}
                status="aanname"
                magLeeg={false}
                voorbeeld={0}
                toelichting="Bijvoorbeeld residu na opschoning of extra communicatie. 0 betekent: niet meegerekend."
              />
            </fieldset>
            <fieldset className="velden">
              <legend>Nascheiding</legend>
              <BronVeld
                label="Restafval naar de nascheider"
                eenheid="kg/inw"
                waarde={i.restafvalNa}
                onChange={(n) => zet('restafvalNa')(n ?? 0)}
                status="kental"
                bronwaarde={bronRest}
                bronwaardeTekst={`${getal(bronRest, 1)} kg`}
                bron={g ? cbsBron : cbsNlBron}
                toelichting="Afgeleid: restafval plus het PMD dat nu apart wordt ingezameld, want bij nascheiding zit dat in het restafval."
              />
              <BronVeld
                label="Nascheidingskosten"
                eenheid="€/t rest"
                waarde={i.nascheidingskosten}
                onChange={(n) => zet('nascheidingskosten')(n ?? 0)}
                status="kental"
                bronwaarde={kentalNascheidingskosten}
                bronwaardeTekst={euro(kentalNascheidingskosten, 2)}
                bron={akkoordBron}
                toelichting="Afgeleid uit het kostenonderzoek 2021 in het akkoord. Vraag het tarief van uw nascheider op."
              />
              <BronVeld
                label="Nascheidingsvergoeding Verpact"
                eenheid="€/t rest"
                waarde={i.vergoedingNa}
                onChange={(n) => zet('vergoedingNa')(n ?? 0)}
                status="officieel"
                bronwaarde={nascheiding.vergoeding2026}
                bronwaardeTekst={euro(nascheiding.vergoeding2026, 2)}
                bron={akkoordBron}
              />
              <BronVeld
                label="Teruggewonnen PMD"
                eenheid="kg/inw"
                waarde={i.teruggewonnenNa}
                onChange={zet('teruggewonnenNa')}
                status="aanname"
                toelichting={
                  breakEven === null || breakEven <= 0
                    ? 'Opgave van de nascheider.'
                    : breakEven <= i.restafvalNa
                      ? `Opgave van de nascheider. Bij ${getal(breakEven, 1)} kg per inwoner zijn beide routes even duur.`
                      : 'Opgave van de nascheider. Met deze kosten blijft nascheiding duurder dan bronscheiding, hoeveel PMD er ook wordt teruggewonnen.'
                }
              />
            </fieldset>
            <BronVeld
              label="Verbrandingstarief restafval, incl. afvalstoffenbelasting"
              eenheid="€/t"
              waarde={i.verbrandingstarief}
              onChange={(n) => zet('verbrandingstarief')(n ?? 0)}
              status="kental"
              bronwaarde={kentalVerbrandingstarief}
              bronwaardeTekst={euro(kentalVerbrandingstarief, 2)}
              bron={{ titel: 'Strategy& 2025 en Belastingdienst', url: pmdBronnen.strategy.url }}
              toelichting="Vermeden kosten: PMD dat niet wordt verbrand. Vul het tarief uit uw verwerkingscontract in."
            />
          </div>
        </Kaart>

        <Uitkomst
          label={<Badge soort="status-gegund">Vergoedingen 2026, CBS {cbsPmd.jaar}</Badge>}
          formule={FORMULE}
          toelichting="Bedragen per jaar, excl. btw. Een negatief bedrag is een netto opbrengst ten opzichte van de nulsituatie. Inzameling van restafval zelf telt in beide routes gelijk en staat er niet in."
          invoer={[
            { label: 'Gebied', waarde: gebied },
            { label: 'Inwoners', waarde: getal(i.inwoners) },
            { label: 'PMD bronscheiding', waarde: `${getal(i.responsBron, 1)} kg/inw` },
            { label: 'Staffelcategorie', waarde: `${categorie} (${euro(i.vergoedingBron)}/t)` },
            { label: 'Inzamelkosten + overig', waarde: `${euro(i.inzamelkostenBron)} + ${euro(i.overigeKostenBron)} per ton` },
            { label: 'Restafval naar nascheider', waarde: `${getal(i.restafvalNa, 1)} kg/inw` },
            { label: 'Nascheiding kosten / vergoeding', waarde: `${euro(i.nascheidingskosten, 2)} / ${euro(i.vergoedingNa, 2)} per ton` },
            { label: 'Teruggewonnen PMD', waarde: i.teruggewonnenNa === null ? 'niet ingevuld' : `${getal(i.teruggewonnenNa, 1)} kg/inw` },
            { label: 'Verbrandingstarief', waarde: `${euro(i.verbrandingstarief, 2)} per ton` },
          ]}
        >
          <div className="stapel">
            <div className="raster raster-2">
              {[bron, na].map((r) => (
                <RouteTegels key={r.naam} r={r} goedkoopst={verschil !== null && verschil !== 0 && (verschil > 0 ? r === bron : r === na)} />
              ))}
            </div>
            <Ontbreekt velden={ontbrekend} uitleg="Zonder deze opgave van de nascheider rekent de tool de nascheidingsroute niet af." />
            <p className="notitie info" role="status">
              {verschil === null
                ? `Bronscheiding ${kostOfLevert(bron.netto)} per jaar. Nascheiding kost ${euro(na.kosten - na.vergoeding)} per jaar vóór vermeden verbranding.`
                : verschil === 0
                  ? 'Beide routes kosten met deze invoer evenveel.'
                  : `Met deze invoer is ${verschil > 0 ? 'bronscheiding' : 'nascheiding'} ${euro(Math.abs(verschil))} per jaar goedkoper (${euro(
                      Math.abs(verschil) / Math.max(1, i.inwoners),
                      2,
                    )} per inwoner).`}
            </p>
            <div className="tabel-container" tabIndex={0} role="region" aria-label="Opbouw per route">
              <table>
                <caption>Euro per jaar. Vermeden verbranding verlaagt de kosten.</caption>
                <thead>
                  <tr>
                    <th scope="col">Post</th>
                    <th scope="col" className="num">
                      Bronscheiding
                    </th>
                    <th scope="col" className="num">
                      Nascheiding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      Grondslag
                    </th>
                    <td className="num">{metEenheid(bron.grondslagTon, 't PMD')}</td>
                    <td className="num">{metEenheid(na.grondslagTon, 't rest')}</td>
                  </tr>
                  <tr>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      Kosten
                    </th>
                    <td className="num">{euro(bron.kosten)}</td>
                    <td className="num">{euro(na.kosten)}</td>
                  </tr>
                  <tr>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      Vergoeding Verpact
                    </th>
                    <td className="num">− {euro(bron.vergoeding)}</td>
                    <td className="num">− {euro(na.vergoeding)}</td>
                  </tr>
                  <tr>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      Vermeden verbranding
                    </th>
                    <td className="num">− {euroOfStreep(bron.vermedenVerbranding)}</td>
                    <td className="num">{na.vermedenVerbranding === null ? 'onbekend' : `− ${euro(na.vermedenVerbranding)}`}</td>
                  </tr>
                  <tr>
                    <th scope="row">Netto</th>
                    <td className="num">
                      <strong>{euroOfStreep(bron.netto)}</strong>
                    </td>
                    <td className="num">
                      <strong>{euroOfStreep(na.netto)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {bron.netto !== null && na.netto !== null && (
              <div className="raster raster-2">
                <StaafGrafiek
                  titel="Netto kosten per jaar"
                  kop={<h4 className="klein">Netto per jaar</h4>}
                  formatY={(n) => euro(n)}
                  staven={[
                    { label: 'Bronscheiding', waarde: bron.netto, kleur: reeksKleuren[0] },
                    { label: 'Nascheiding', waarde: na.netto, kleur: reeksKleuren[1] },
                  ]}
                />
                <StaafGrafiek
                  titel="Netto kosten per inwoner"
                  kop={<h4 className="klein">Netto per inwoner</h4>}
                  formatY={(n) => euro(n, 2)}
                  staven={[
                    { label: 'Bronscheiding', waarde: bron.perInwoner ?? 0, kleur: reeksKleuren[0] },
                    { label: 'Nascheiding', waarde: na.perInwoner ?? 0, kleur: reeksKleuren[1] },
                  ]}
                />
              </div>
            )}

            <h3>Wat levert een hogere staffelcategorie op?</h3>
            <p className="klein muted">
              Inzamelvergoeding voor uw {metEenheid(bron.pmdTon ?? 0, 'ton')} PMD per jaar, per categorie en jaar. Bedragen voor 2027
              en 2028 zonder de nog onbekende indexatie.
            </p>
            <div className="tabel-container" tabIndex={0} role="region" aria-label="Inzamelvergoeding per staffelcategorie">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Categorie</th>
                    {staffelJaren.map((j) => (
                      <th key={j} scope="col" className="num">
                        {j}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffel.map((s) => (
                    <tr key={s.categorie} aria-current={s.categorie === categorie ? 'true' : undefined}>
                      <th scope="row" style={{ fontWeight: s.categorie === categorie ? 700 : 500 }}>
                        {s.categorie}
                        {s.categorie === categorie ? ' (uw keuze)' : ''}
                      </th>
                      {staffelJaren.map((j) => (
                        <td key={j} className="num">
                          {euro(vergoedingVoorTonnage(bron.pmdTon ?? 0, s.euroPerTon[j]))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ExportKnoppen
              naam="Rekenmodel PMD"
              csvRijen={csv}
              params={deelParams}
              pad={PAD}
              toelichting="De CSV bevat invoer met herkomst, de opbouw per route en de formule. De link bewaart gemeente, categorie en alle invoer."
            />
            <RapportKnop />
          </div>
        </Uitkomst>
      </div>
    </div>
  );
}

function RouteTegels({ r, goedkoopst }: { r: PmdRoute; goedkoopst: boolean }) {
  return (
    <div className="stapel" style={{ gap: 10 }}>
      <h3>
        {r.naam}
        {goedkoopst && <span className="badge status-gegund" style={{ marginLeft: 8 }}>Goedkoopst</span>}
      </h3>
      <Tegel
        label={r.netto !== null && r.netto < 0 ? 'Netto opbrengst per jaar' : 'Netto kosten per jaar'}
        waarde={r.netto === null ? '–' : euro(Math.abs(r.netto))}
        toelichting={r.netto === null ? 'vul teruggewonnen PMD in' : 'ten opzichte van alles verbranden'}
        hero={goedkoopst}
      />
      <Tegel
        label={r.perInwoner !== null && r.perInwoner < 0 ? 'Opbrengst per inwoner' : 'Kosten per inwoner'}
        waarde={r.perInwoner === null ? '–' : euro(Math.abs(r.perInwoner), 2)}
        toelichting="per jaar"
      />
      <Tegel
        label={r.naam === 'Bronscheiding' ? 'PMD ingezameld' : 'PMD teruggewonnen'}
        waarde={r.pmdTon === null ? '–' : metEenheid(r.pmdTon, 'ton')}
        toelichting={
          r.perTonPmd === null ? undefined : r.perTonPmd < 0 ? `netto opbrengst ${euro(-r.perTonPmd, 2)} per ton PMD` : `netto kosten ${euro(r.perTonPmd, 2)} per ton PMD`
        }
      />
    </div>
  );
}
