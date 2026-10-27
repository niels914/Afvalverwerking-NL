// Wat het platform biedt, voor de inlogpagina ("wat leden krijgen") en het ledendashboard op /account.
// Afgeleid van src/data/tools.ts, zodat een nieuwe of gewijzigde tool hier vanzelf meekomt.

import { tools } from '../data/tools';
import type { Toegang } from '../data/types';

export interface Onderdeel {
  titel: string;
  pad: string;
  toegang: Toegang;
  /** Wat het onderdeel doet, in één zin. */
  omschrijving: string;
  /** Wat alleen leden krijgen (bij gratis+pro het Pro-deel, bij leden de hele tool). */
  ledenDeel?: string;
}

const archief: Onderdeel = {
  titel: 'Aanbestedingsarchief',
  pad: '/aanbestedingsarchief',
  toegang: 'leden',
  omschrijving: 'Aanbestedingen over afval van TenderNed, elke ochtend bijgewerkt.',
  ledenDeel: 'Zoeken en filteren op afvalstroom, status, provincie en soort dienst, met de tijdlijn per aanbesteding.',
};

const toolOnderdelen: Onderdeel[] = tools.map((t) => ({
  titel: t.titel,
  pad: t.pad,
  toegang: t.toegang,
  omschrijving: t.omschrijving,
  ledenDeel: t.toegang === 'gratis+pro' ? t.proDeel : t.toegang === 'leden' ? t.omschrijving : undefined,
}));

const openOnderdelen: Onderdeel[] = [
  { titel: 'Restafvalkaart', pad: '/restafvalkaart', toegang: 'gratis', omschrijving: 'Restafval per inwoner en het deel gescheiden ingezameld afval, voor elke gemeente, uit CBS-cijfers.' },
  { titel: 'Kennisbank', pad: '/kennisbank', toegang: 'gratis', omschrijving: 'Rapporten, beleidsstukken en cijfers over afvalbeleid, met een korte samenvatting en de link naar het origineel.' },
  { titel: 'Nieuws', pad: '/nieuws', toegang: 'gratis', omschrijving: 'Berichten van Rijksoverheid, PIANOo en CBS over afval, verwerking en circulaire economie.' },
];

/** Alles op het platform: eerst ledenonderdelen, dan tools met een Pro-deel, dan de open onderdelen. */
export const alleOnderdelen: Onderdeel[] = [
  archief,
  ...toolOnderdelen.filter((o) => o.toegang === 'leden'),
  ...toolOnderdelen.filter((o) => o.toegang === 'gratis+pro'),
  ...toolOnderdelen.filter((o) => o.toegang === 'gratis'),
  ...openOnderdelen,
];

/** Onderdelen met iets wat alleen leden krijgen. */
export const ledenOnderdelen: Onderdeel[] = alleOnderdelen.filter((o) => o.ledenDeel);

/** Onderdelen die iedereen zonder account kan gebruiken (helemaal of het gratis deel). */
export const openVoorIedereen: Onderdeel[] = alleOnderdelen.filter((o) => o.toegang !== 'leden');
