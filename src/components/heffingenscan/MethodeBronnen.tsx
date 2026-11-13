import { BronRegels, type BronRegel } from '../rekenen/Bronnen';
import { heffingGemeentenBron } from '../../data/heffingen-gemeenten';
import {
  JAREN,
  NRF,
  PEILDATUM,
  PRIJSPEIL,
  PROCESEMISSIEFACTOR,
  aannames,
  heffingBronnen,
  heffingPaden,
  heffingenscanVersie,
  nietMeegenomen,
  heffingStandaard,
} from '../../data/heffingen-tarieven';
import { BASIS_FOSSIEL, fossielFijn } from '../../lib/calc/heffingen';
import { datum, euro, getal } from '../../lib/format';

const FORMULE = [
  'tonnage = inwoners × kg fijn restafval per inwoner ÷ 1.000',
  'afvalstoffenbelasting per ton = tarief × grondslag (standaard 75 %, na aftrek van bodemassen)',
  'CO2-heffing per ton = CO2-tarief × max(0, fossiele uitstoot − NRF × AVI-correctiefactor × procesemissiefactor × mediaan fossiele uitstoot 2019–2023)',
  'heffingen = tonnage × (afvalstoffenbelasting per ton + CO2-heffing per ton) × doorberekening',
  'Er wordt nergens tussentijds afgerond.',
].join('\n');

/** Methode, tarieventabel, aannames en bronnen van de Heffingenscan. Staat ingeklapt op de gemeentepagina's. */
export function MethodeBronnen() {
  const b = heffingGemeentenBron.bronnen;
  const p27 = heffingPaden.bp2027;
  const p26 = heffingPaden.bp2026;

  const bronRegels: BronRegel[] = [
    {
      onderwerp: 'Tarieven afvalstoffenbelasting en CO2-heffing 2027–2035',
      status: 'voorstel',
      bron: heffingBronnen.mvtBp2027.titel,
      url: heffingBronnen.mvtBp2027.url,
      peildatum: PEILDATUM,
      toelichting: 'Het Belastingplan 2026 bevat het geldende pad; het Belastingplan 2027 het voorgestelde pad. Beide staan hierboven.',
    },
    {
      onderwerp: 'Status van het wetsvoorstel Belastingplan 2027',
      status: 'officieel',
      bron: heffingBronnen.eersteKamer.titel,
      url: heffingBronnen.eersteKamer.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Stemming in de Tweede Kamer, 12 november 2026',
      status: 'officieel',
      bron: heffingBronnen.stemmingTweedeKamer.titel,
      url: heffingBronnen.stemmingTweedeKamer.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Afvalstoffenbelasting 2026: € 40,85 per ton',
      status: 'officieel',
      bron: heffingBronnen.iploAsb2026.titel,
      url: heffingBronnen.iploAsb2026.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'CO2-tarief AVI 2026: € 103,66 per ton CO2',
      status: 'officieel',
      bron: heffingBronnen.neaTarieven.titel,
      url: heffingBronnen.neaTarieven.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'AVI-correctiefactor, nationale reductiefactor en procesemissiefactor',
      status: 'officieel',
      bron: `${heffingBronnen.neaAvi.titel}; ${heffingBronnen.neaDpr.titel}`,
      url: heffingBronnen.neaAvi.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: 'Emissiefactor en biomassafractie van huishoudelijk afval',
      status: 'officieel',
      bron: heffingBronnen.neaFactoren.titel,
      url: heffingBronnen.neaFactoren.url,
      peildatum: PEILDATUM,
    },
    {
      onderwerp: `Fijn en grof restafval per inwoner, peiljaar ${b.afval.peiljaar}`,
      status: 'officieel',
      bron: `CBS ${b.afval.tabelId}, ${b.afval.titel} (${b.afval.status.label}; tabel gewijzigd ${datum(b.afval.gewijzigd)})`,
      url: b.afval.url,
      peildatum: heffingGemeentenBron.opgehaald,
      toelichting: b.afval.status.tekst,
    },
    {
      onderwerp: `Restafval via nascheiding, peiljaar ${b.nascheiding.peiljaar}`,
      status: 'officieel',
      bron: `CBS ${b.nascheiding.tabelId}, ${b.nascheiding.titel} (${b.nascheiding.status.label}; tabel gewijzigd ${datum(b.nascheiding.gewijzigd)})`,
      url: b.nascheiding.url,
      peildatum: heffingGemeentenBron.opgehaald,
      toelichting: b.nascheiding.status.tekst,
    },
    {
      onderwerp: `Inwoners en huishoudens op ${datum(b.kerncijfers.peildatum)}`,
      status: 'officieel',
      bron: `CBS ${b.kerncijfers.tabelId}, ${b.kerncijfers.titel}`,
      url: b.kerncijfers.url,
      peildatum: heffingGemeentenBron.opgehaald,
      toelichting: b.kerncijfers.nieuwer ? `CBS heeft inmiddels cijfers per ${datum(b.kerncijfers.nieuwer.peildatum)}; de scan rekent nog met die van ${datum(b.kerncijfers.peildatum)}.` : undefined,
    },
    ...aannames.map(
      (a): BronRegel => ({
        onderwerp: a.onderwerp,
        status: 'aanname',
        waarde: a.waarde,
        toelichting: a.toelichting,
      }),
    ),
  ];

  return (
    <div className="stapel hs-methode">
      <section aria-labelledby="hs-m-rekenwijze" className="stapel" style={{ gap: 8 }}>
        <h3 id="hs-m-rekenwijze">Rekenwijze</h3>
        <pre className="formule">{FORMULE}</pre>
        <p className="klein">
          Fossiele uitstoot per ton fijn restafval: 2026 {getal(fossielFijn(2026), 4)}, vanaf 2027 {getal(fossielFijn(2027), 4)} ton CO2 (emissiefactor × (1 − biomassafractie)).
          Vrijgestelde basis: mediaan 2019–2023, {getal(BASIS_FOSSIEL.fijn, 4)} ton CO2 per ton. Nationale reductiefactor {getal(NRF, 3)}; procesemissiefactor{' '}
          {getal(PROCESEMISSIEFACTOR[0], 2)} in 2026 en 2027 en {getal(PROCESEMISSIEFACTOR[2], 2)} vanaf 2028. Alle bedragen zijn indicatief, prijspeil {PRIJSPEIL}.
        </p>
      </section>

      <section aria-labelledby="hs-m-tarieven" className="stapel" style={{ gap: 8 }}>
        <h3 id="hs-m-tarieven">Tarieven per jaar</h3>
        <div className="tabel-container" tabIndex={0} role="region" aria-label="Tarieventabel, horizontaal scrollbaar">
          <table>
            <caption>
              Afvalstoffenbelasting in euro per ton afval en CO2-heffing in euro per ton CO2, prijspeil {PRIJSPEIL}. Correctiefactor: AVI-correctiefactor voor dispensatierechten. BP2027 is het wetsvoorstel,
              BP2026 het pad uit het Belastingplan 2026. Peildatum {datum(PEILDATUM)}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Jaar</th>
                <th scope="col" className="num">ASB BP2027</th>
                <th scope="col" className="num">ASB BP2026</th>
                <th scope="col" className="num">CO2 BP2027</th>
                <th scope="col" className="num">CO2 BP2026</th>
                <th scope="col" className="num">Corr. BP2027</th>
                <th scope="col" className="num">Corr. BP2026</th>
              </tr>
            </thead>
            <tbody>
              {JAREN.map((jaar, i) => (
                <tr key={jaar}>
                  <th scope="row">{jaar}</th>
                  <td className="num">{euro(p27.asb[i], 2)}</td>
                  <td className="num">{euro(p26.asb[i], 2)}</td>
                  <td className="num">{euro(p27.co2[i], 2)}</td>
                  <td className="num">{euro(p26.co2[i], 2)}</td>
                  <td className="num">{getal(p27.correctiefactor[i], 2)}</td>
                  <td className="num">{getal(p26.correctiefactor[i], 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="hs-m-bronnen" className="stapel" style={{ gap: 8 }}>
        <h3 id="hs-m-bronnen">Bronnen, aannames en peildatum</h3>
        <p className="klein">
          Tarieven en regels per {datum(PEILDATUM)}; CBS-cijfers opgehaald op {datum(heffingGemeentenBron.opgehaald)}. Wat geen officiële bron heeft, is hieronder als aanname gelabeld.
        </p>
        <BronRegels regels={bronRegels} />
      </section>

      <section aria-labelledby="hs-m-niet" className="stapel" style={{ gap: 8 }}>
        <h3 id="hs-m-niet">Wat de scan niet meerekent</h3>
        <ul className="opsomming">
          {nietMeegenomen.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="klein muted">
          Grof restafval ({heffingStandaard.grofVerbrandPct} % verbrand, aanname KplusV) en overig verbrand afval rekent u mee onder “Rekenen met eigen cijfers”. Versie {heffingenscanVersie.versie}, {datum(heffingenscanVersie.datum)}.
        </p>
      </section>
    </div>
  );
}
