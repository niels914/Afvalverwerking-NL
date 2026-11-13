import { GetalVeld, KeuzeVeld } from '../ui';
import { ExportKnoppen } from '../rekenen/Export';
import { OngeldigeInvoer, useOngeldigeInvoer } from '../rekenen/Inklap';
import type { CsvCel } from '../rekenen/csv';
import { heffingPaden, type HeffingPadId } from '../../data/heffingen-tarieven';
import { veldRegels, type HeffingGemeente, type HeffingInvoer } from '../../lib/calc/heffingen';
import { getal } from '../../lib/format';

interface Props {
  gemeente: HeffingGemeente;
  invoer: HeffingInvoer;
  /** Zet één veld; de pagina zet de wijziging in de URL. */
  zet: <K extends keyof HeffingInvoer>(veld: K, waarde: HeffingInvoer[K]) => void;
  terugzetten: () => void;
  aangepast: boolean;
  csvRijen: () => CsvCel[][];
  params: URLSearchParams;
  pad: string;
}

const regel = (veld: keyof typeof veldRegels) => ({ min: veldRegels[veld].min, max: veldRegels[veld].max });

/** Invoervelden voor "Rekenen met eigen cijfers", met CSV, deellink en printknop. */
export function EigenCijfers({ gemeente: g, invoer, zet, terugzetten, aangepast, csvRijen, params, pad }: Props) {
  const [ref, ongeldig] = useOngeldigeInvoer<HTMLDivElement>();
  return (
    <div className="stapel" ref={ref}>
      <p>
        U ziet standaard de CBS-cijfers van {g.naam}: alleen fijn restafval, alles verbrand. Pas hieronder de cijfers aan met wat u zelf weet, bijvoorbeeld het werkelijk verbrande tonnage uit uw verwerkingscontract. De pagina rekent direct
        opnieuw en zet uw invoer in de link, zodat u die kunt delen.
      </p>
      <OngeldigeInvoer velden={ongeldig} />
      {aangepast && (
        <div className="knoppen geen-print">
          <button type="button" onClick={terugzetten}>
            Terug naar de CBS-cijfers
          </button>
        </div>
      )}
      <fieldset className="hs-fieldset">
        <legend>Gemeente</legend>
        <div className="velden-2">
          <GetalVeld label="Inwoners" eenheid="inwoners" waarde={invoer.inwoners} onChange={(n) => zet('inwoners', n)} {...regel('inwoners')} hint={`CBS: ${getal(g.inwoners)}.`} />
          <GetalVeld label="Huishoudens" eenheid="huishoudens" waarde={invoer.huishoudens} onChange={(n) => zet('huishoudens', n)} {...regel('huishoudens')} hint={`CBS: ${getal(g.huishoudens)}.`} />
        </div>
      </fieldset>
      <fieldset className="hs-fieldset">
        <legend>Restafval</legend>
        <div className="velden-2">
          <GetalVeld
            label="Fijn restafval per inwoner"
            eenheid="kg"
            waarde={invoer.fijnKg}
            onChange={(n) => zet('fijnKg', n)}
            {...regel('fijnKg')}
            hint={`CBS: ${getal(g.fijn, 1)} kg per inwoner per jaar.`}
          />
          <GetalVeld
            label="Deel van het fijne restafval dat wordt verbrand"
            eenheid="%"
            waarde={invoer.verbrandPct}
            onChange={(n) => zet('verbrandPct', n)}
            {...regel('verbrandPct')}
            hint={
              g.nascheiding !== null
                ? `CBS meldt ${getal(g.nascheiding, 1)} kg per inwoner via nascheiding. Daarvan wordt een deel niet verbrand; vul het werkelijke deel in.`
                : 'Standaard 100 %: al het fijne restafval wordt verbrand.'
            }
          />
          <GetalVeld
            label="Grof restafval per inwoner dat u meerekent"
            eenheid="kg"
            waarde={invoer.grofKg}
            onChange={(n) => zet('grofKg', n)}
            {...regel('grofKg')}
            hint={g.grof !== null ? `Standaard 0: niet meegerekend. CBS meldt ${getal(g.grof, 1)} kg grof restafval per inwoner.` : 'Standaard 0: niet meegerekend.'}
          />
          <GetalVeld
            label="Deel van het grove restafval dat wordt verbrand"
            eenheid="%"
            waarde={invoer.grofVerbrandPct}
            onChange={(n) => zet('grofVerbrandPct', n)}
            {...regel('grofVerbrandPct')}
            hint="Aanname KplusV: 70 %. Vraag het werkelijke aandeel na bij de sorteerder."
          />
          <GetalVeld
            label="Overig verbrand afval"
            eenheid="ton per jaar"
            waarde={invoer.overigTon}
            onChange={(n) => zet('overigTon', n)}
            {...regel('overigTon')}
            hint="Bijvoorbeeld bedrijfsafval of veegvuil dat de gemeente zelf laat verbranden. Standaard 0."
          />
          <GetalVeld
            label="Ontwikkeling restafval per jaar"
            eenheid="% per jaar"
            waarde={invoer.trendPct}
            onChange={(n) => zet('trendPct', n)}
            {...regel('trendPct')}
            hint="Negatief als het restafval afneemt, bijvoorbeeld −3. Standaard 0."
          />
        </div>
      </fieldset>
      <fieldset className="hs-fieldset">
        <legend>Heffingen en tarieven</legend>
        <div className="velden-2">
          <GetalVeld
            label="Grondslag afvalstoffenbelasting"
            eenheid="%"
            waarde={invoer.asbGrondslagPct}
            onChange={(n) => zet('asbGrondslagPct', n)}
            {...regel('asbGrondslagPct')}
            hint="Aanname KplusV: 75 % na aftrek van bodemassen. Het werkelijke percentage verschilt per AVI."
          />
          <GetalVeld
            label="Doorberekening door de AVI"
            eenheid="%"
            waarde={invoer.doorberekeningPct}
            onChange={(n) => zet('doorberekeningPct', n)}
            {...regel('doorberekeningPct')}
            hint="Standaard 100 %: de AVI berekent beide heffingen volledig door. Zie uw verwerkingscontract."
          />
          <GetalVeld
            label="Indexatie van de tarieven per jaar"
            eenheid="% per jaar"
            waarde={invoer.indexatiePct}
            onChange={(n) => zet('indexatiePct', n)}
            {...regel('indexatiePct')}
            hint="Standaard 0: prijspeil 2026. Een percentage is uw eigen aanname."
          />
          <KeuzeVeld<HeffingPadId>
            label="Tariefpad"
            waarde={invoer.pad}
            opties={(['bp2027', 'bp2026'] as HeffingPadId[]).map((id) => ({ waarde: id, label: `${heffingPaden[id].naam} (${heffingPaden[id].status})` }))}
            onChange={(v) => zet('pad', v)}
            hint="Het andere pad staat als gestreepte lijn in de grafiek."
          />
        </div>
      </fieldset>
      <div className="stapel geen-print" style={{ gap: 10 }}>
        <ExportKnoppen
          naam={`Heffingenscan ${g.naam}`}
          csvRijen={csvRijen}
          params={params}
          pad={pad}
          linkInklappen
          toelichting={aangepast ? 'De link bevat uw aangepaste cijfers; wie hem opent, ziet dezelfde berekening.' : 'De link bevat alleen de cijfers die u aanpast.'}
        />
        <div className="knoppen">
          <button type="button" onClick={() => window.print()}>
            Afdrukken of opslaan als pdf
          </button>
          <span className="klein muted">Opent het printvenster. Kies “Opslaan als PDF” voor een bestand.</span>
        </div>
      </div>
    </div>
  );
}
