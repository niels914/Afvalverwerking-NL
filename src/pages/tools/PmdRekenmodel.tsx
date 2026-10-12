import { useState } from 'react';
import { Vergrendeld } from '../../components/betaalmuur/Vergrendeld';
import { reeksKleuren, StaafGrafiek } from '../../components/grafiek/Grafieken';
import { RapportKnop, RapportKop, RapportVoet, Uitkomst } from '../../components/rekenen/Uitkomst';
import { GetalVeld, Kaart, PaginaKop, Tegel, ToegangBadge } from '../../components/ui';
import { pmdStandaard } from '../../data/standaardwaarden';
import { pmdVergelijking, type PmdInvoer } from '../../lib/calc/pmd';
import { euro, getal, metEenheid } from '../../lib/format';

const FORMULE = `tonnage = inwoners × respons (kg/inw) / 1000
bronscheiding: kosten = tonnage × (inzameling + sortering − vergoeding)
nascheiding:   kosten = tonnage × (nascheiding − vergoeding)
per inwoner = kosten / inwoners`;

export function PmdRekenmodel() {
  return (
    <>
      <RapportKop titel="Rekenmodel bron- en nascheiding PMD" />
      <PaginaKop titel="Rekenmodel bron- en nascheiding PMD" badges={<ToegangBadge toegang="leden" />}>
        Vergelijk de kosten van bronscheiding en nascheiding van PMD voor uw gebied: totale kosten, kosten per inwoner en
        ingezameld tonnage. Alle standaardwaarden zijn fictief.
      </PaginaKop>
      <Vergrendeld
        titel="Rekenmodel bron- en nascheiding PMD"
        ledenKrijgen={['Twee scenario’s naast elkaar met eigen invoer', 'Totale kosten, kosten per inwoner en tonnage', 'Grafiek en rapport']}
      >
        <PmdModel />
      </Vergrendeld>
      <RapportVoet />
    </>
  );
}

function PmdModel() {
  const [i, setI] = useState<PmdInvoer>(pmdStandaard);
  const zet = (sleutel: keyof PmdInvoer) => (n: number) => setI((v) => ({ ...v, [sleutel]: n }));
  const { bron, na, verschil } = pmdVergelijking(i);
  const goedkoopste = verschil > 0 ? bron : na;

  return (
    <div className="raster raster-tool">
      <Kaart titel="Invoer" className="invoerkaart">
        <div className="velden">
          <GetalVeld label="Aantal inwoners" eenheid="inw" waarde={i.inwoners} onChange={zet('inwoners')} />
          <GetalVeld label="PMD-respons bij bronscheiding" eenheid="kg/inw" waarde={i.responsBron} onChange={zet('responsBron')} />
          <GetalVeld label="PMD-respons bij nascheiding" eenheid="kg/inw" waarde={i.responsNa} onChange={zet('responsNa')} />
          <GetalVeld label="Kosten inzameling (bronscheiding)" eenheid="€/ton" waarde={i.kostenInzameling} onChange={zet('kostenInzameling')} />
          <GetalVeld label="Kosten sortering (bronscheiding)" eenheid="€/ton" waarde={i.kostenSortering} onChange={zet('kostenSortering')} />
          <GetalVeld label="Kosten nascheiding, incl. sortering" eenheid="€/ton" waarde={i.kostenNascheiding} onChange={zet('kostenNascheiding')} />
          <GetalVeld label="Vergoeding" eenheid="€/ton" waarde={i.vergoeding} onChange={zet('vergoeding')} hint="Voor beide routes gelijk." />
        </div>
      </Kaart>
      <Uitkomst
        formule={FORMULE}
        toelichting="Aannames: nascheidingskosten zijn inclusief sortering; de inzameling van restafval loopt al en telt niet mee; de vergoeding per ton is voor beide routes gelijk. Een negatief bedrag is een netto opbrengst."
        invoer={[
          { label: 'Inwoners', waarde: getal(i.inwoners) },
          { label: 'Respons bron / na', waarde: `${getal(i.responsBron, 1)} / ${getal(i.responsNa, 1)} kg/inw` },
          { label: 'Inzameling', waarde: `${euro(i.kostenInzameling)}/t` },
          { label: 'Sortering', waarde: `${euro(i.kostenSortering)}/t` },
          { label: 'Nascheiding', waarde: `${euro(i.kostenNascheiding)}/t` },
          { label: 'Vergoeding', waarde: `${euro(i.vergoeding)}/t` },
        ]}
      >
        <div className="stapel">
          <div className="raster raster-2">
            {[bron, na].map((s) => (
              <div key={s.naam} className="stapel" style={{ gap: 10 }}>
                <h3>{s.naam}</h3>
                <Tegel label="Totale kosten" waarde={euro(s.totaleKosten)} toelichting="per jaar" hero={s === goedkoopste} />
                <Tegel label="Per inwoner" waarde={euro(s.perInwoner, 2)} />
                <Tegel label="Ingezameld" waarde={metEenheid(s.tonnage, 'ton')} toelichting={`netto ${euro(s.kostenPerTon)}/ton`} />
              </div>
            ))}
          </div>
          <p className="notitie info">
            {verschil === 0
              ? 'Beide routes kosten in deze dummyberekening evenveel.'
              : `In deze dummyberekening is ${goedkoopste.naam.toLowerCase()} ${euro(Math.abs(verschil))} per jaar goedkoper (paarse tegel).`}
          </p>
          <div className="raster raster-3">
            <StaafGrafiek
              titel="Totale kosten per jaar"
              kop={<h4 className="klein">Totale kosten</h4>}
              formatY={(n) => euro(n)}
              staven={[
                { label: 'Bron', waarde: bron.totaleKosten, kleur: reeksKleuren[0] },
                { label: 'Na', waarde: na.totaleKosten, kleur: reeksKleuren[1] },
              ]}
            />
            <StaafGrafiek
              titel="Kosten per inwoner"
              kop={<h4 className="klein">Per inwoner</h4>}
              formatY={(n) => euro(n, 2)}
              staven={[
                { label: 'Bron', waarde: bron.perInwoner, kleur: reeksKleuren[0] },
                { label: 'Na', waarde: na.perInwoner, kleur: reeksKleuren[1] },
              ]}
            />
            <StaafGrafiek
              titel="Ingezameld tonnage"
              kop={<h4 className="klein">Ingezameld (ton)</h4>}
              formatY={(n) => getal(n)}
              staven={[
                { label: 'Bron', waarde: bron.tonnage, kleur: reeksKleuren[0] },
                { label: 'Na', waarde: na.tonnage, kleur: reeksKleuren[1] },
              ]}
            />
          </div>
          <RapportKnop />
        </div>
      </Uitkomst>
    </div>
  );
}
