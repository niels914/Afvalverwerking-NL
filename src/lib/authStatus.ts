// Lidmaatschapsstatus in woorden, voor /account en de betaalmuur. Pure functies, zodat ze getest kunnen worden.
// De gegevens komen uit de databasefunctie public.mijn_lidmaatschap() (zie supabase/migrations/).

import { datum } from './format';
import { staffels } from '../data/lidmaatschap';

/** Eén rij uit public.mijn_lidmaatschap(). */
export interface Lidmaatschap {
  organisatie: string;
  organisatietype: string;
  /** Status zoals vastgelegd door KplusV: aangevraagd, actief, opgezegd of verlopen. */
  status: string;
  /** Status op dit moment: 'actief' wordt 'verlopen' zodra geldig_tot voorbij is. */
  effectieve_status: string;
  /** Laatste dag van het lidmaatschap (jjjj-mm-dd), of null bij doorlopend. */
  geldig_tot: string | null;
  domein: string;
  is_lid: boolean;
}

/** Zo veel dagen voor het einde waarschuwen we dat het lidmaatschap afloopt. */
export const WAARSCHUW_DAGEN = 30;

export type StatusSoort = 'actief' | 'let-op' | 'geen';

export interface StatusBeschrijving {
  /** Korte status, altijd als tekst zichtbaar (kleur is nooit de enige drager). */
  label: string;
  soort: StatusSoort;
  /** Wat de status betekent voor de gebruiker. */
  uitleg: string;
  /** Tekst voor "Geldig tot". */
  geldigTot: string;
}

const typeLabels: Record<string, string> = {
  'samenwerkingsverband-klein': 'Samenwerkingsverband (klein)',
  'samenwerkingsverband-groot': 'Samenwerkingsverband (groot)',
  gemeente: 'Gemeente',
  verwerker: 'Afvalverwerker',
  overig: 'Overig, eigen afspraak met KplusV',
};

const overigUitleg =
  'Valt niet onder een van de tariefgroepen op de pagina Lidmaatschap. De voorwaarden zijn apart met KplusV afgesproken.';

/** Soort organisatie zoals KplusV die heeft vastgelegd; bepaalt de tariefgroep. */
export function organisatietypeLabel(type: string): string {
  return typeLabels[type] ?? type;
}

/** Korte uitleg bij de soort organisatie, of '' als die er niet is. */
export function organisatietypeUitleg(type: string): string {
  if (type === 'overig') return overigUitleg;
  const staffel = staffels.find((st) => st.id === type);
  return staffel ? `Tariefgroep ${staffel.naam}: ${staffel.voorWie}.` : '';
}

/** Aantal dagen van vandaag tot en met een datum (beide jjjj-mm-dd). Negatief als de datum voorbij is. */
export function dagenTot(totIso: string, vandaagIso: string): number {
  const tot = Date.UTC(+totIso.slice(0, 4), +totIso.slice(5, 7) - 1, +totIso.slice(8, 10));
  const nu = Date.UTC(+vandaagIso.slice(0, 4), +vandaagIso.slice(5, 7) - 1, +vandaagIso.slice(8, 10));
  return Math.round((tot - nu) / 86_400_000);
}

/** Vandaag als jjjj-mm-dd in de tijdzone van de gebruiker. */
export function vandaagIso(nu = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${nu.getFullYear()}-${p(nu.getMonth() + 1)}-${p(nu.getDate())}`;
}

/**
 * Beschrijft het lidmaatschap van de ingelogde gebruiker.
 * @param lm rij uit mijn_lidmaatschap(), of null als er geen organisatie bij het domein hoort
 * @param domein domein van het e-mailadres, voor de uitleg als er geen organisatie is
 */
export function beschrijfLidmaatschap(lm: Lidmaatschap | null, domein: string, vandaag = vandaagIso()): StatusBeschrijving {
  if (!lm) {
    return {
      label: 'Geen lidmaatschap',
      soort: 'geen',
      uitleg: `Er is geen organisatie met een lidmaatschap bekend voor het e-maildomein ${domein || '(onbekend)'}. U kunt de gratis onderdelen gebruiken. Wilt u toegang tot de ledenonderdelen, meld uw organisatie dan aan als lid. Heeft uw organisatie een lidmaatschap onder een ander domein, laat het ons dan weten.`,
      geldigTot: 'Niet van toepassing',
    };
  }

  const org = lm.organisatie;
  const tot = lm.geldig_tot ? datum(lm.geldig_tot) : null;

  switch (lm.effectieve_status) {
    case 'actief': {
      if (!lm.geldig_tot) {
        return {
          label: 'Actief',
          soort: 'actief',
          uitleg: `U heeft als medewerker van ${org} toegang tot alle ledenonderdelen.`,
          geldigTot: 'Doorlopend, zonder einddatum',
        };
      }
      const dagen = dagenTot(lm.geldig_tot, vandaag);
      if (dagen <= WAARSCHUW_DAGEN) {
        const wanneer = dagen === 0 ? 'vandaag' : dagen === 1 ? 'morgen' : `over ${dagen} dagen`;
        return {
          label: `Actief, loopt ${wanneer} af`,
          soort: 'let-op',
          uitleg: `U heeft als medewerker van ${org} toegang tot alle ledenonderdelen tot en met ${tot}. Daarna vervalt de toegang voor iedereen met een e-mailadres op ${lm.domein}, tenzij het lidmaatschap is verlengd.`,
          geldigTot: tot!,
        };
      }
      return {
        label: 'Actief',
        soort: 'actief',
        uitleg: `U heeft als medewerker van ${org} toegang tot alle ledenonderdelen tot en met ${tot}.`,
        geldigTot: tot!,
      };
    }
    case 'verlopen':
      return {
        label: 'Verlopen',
        soort: 'let-op',
        uitleg: `Het lidmaatschap van ${org} is verlopen${tot ? ` (geldig tot en met ${tot})` : ''}. De ledenonderdelen zijn niet meer beschikbaar. Uw account blijft bestaan: na verlenging heeft u direct weer toegang, zonder nieuwe registratie.`,
        geldigTot: tot ?? 'Onbekend',
      };
    case 'aangevraagd':
      return {
        label: 'Aangevraagd, nog niet actief',
        soort: 'let-op',
        uitleg: `De aanmelding van ${org} is ontvangen. U krijgt toegang zodra KplusV het lidmaatschap heeft geactiveerd. U hoeft daarvoor niets te doen: na activering ziet u de ledenonderdelen bij de volgende keer inloggen of na het vernieuwen van de pagina.`,
        geldigTot: 'Nog niet bekend',
      };
    case 'opgezegd':
      return {
        label: 'Opgezegd',
        soort: 'geen',
        uitleg: `Het lidmaatschap van ${org} is opgezegd. De ledenonderdelen zijn niet meer beschikbaar. Uw account blijft bestaan; als uw organisatie opnieuw lid wordt, heeft u direct weer toegang.`,
        geldigTot: tot ?? 'Beëindigd',
      };
    default:
      return {
        label: lm.effectieve_status,
        soort: 'geen',
        uitleg: `De status van het lidmaatschap van ${org} is onbekend. Neem contact met ons op.`,
        geldigTot: tot ?? 'Onbekend',
      };
  }
}
