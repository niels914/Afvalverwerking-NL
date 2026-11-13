// Aanbod rond de Heffingenscan: wat het rapport kost, wat er na een aanvraag gebeurt en de velden van het
// aanvraagformulier. Prijzen en termijnen komen uit het marketingplan van Niels Ahsmann (5 november 2026):
// € 500 per rapport voor één gemeente, € 500 extra voor toelichting en sparringssessie, maatwerk voor een groep
// gemeenten; alles exclusief btw. Reactie binnen één werkdag, rapport binnen een week.
//
// Houd de veldnamen gelijk aan de verborgen statische kopie van het formulier "rapportaanvraag" in index.html
// (de test heffingen.test.ts bewaakt dat) en aan de kolommen van public.rapportaanvragen
// (supabase/migrations/20261113090000_rapportaanvragen.sql).

export const AANVRAAG_FORMULIER = 'rapportaanvraag';
/** Tabel in Supabase (project mnwynrioozcqqvhelqku). */
export const AANVRAAG_TABEL = 'rapportaanvragen';
/** Sleutel in sessionStorage waarin ?bron= voor deze sessie bewaard blijft. */
export const BRON_SLEUTEL = 'afvalplatform-heffingenscan-bron';
export const AANVRAAG_PAD = '/heffingenscan/aanvragen';

export type AanvraagKeuze = 'rapport' | 'rapport-toelichting' | 'groep';

export interface AanvraagOptie {
  id: AanvraagKeuze;
  label: string;
  /** Prijs in euro, exclusief btw; null = op aanvraag. */
  prijs: number | null;
  toelichting: string;
}

export const aanvraagOpties: AanvraagOptie[] = [
  {
    id: 'rapport',
    label: 'Rapport voor één gemeente',
    prijs: 500,
    toelichting: 'Uw cijfers doorgerekend en gecontroleerd, met de bronnen en de aannames erbij.',
  },
  {
    id: 'rapport-toelichting',
    label: 'Rapport met toelichting en sparringssessie',
    prijs: 1000,
    toelichting: 'Het rapport, plus een toelichting en een sparringssessie over begroting, bronscheiding of verwerkingscontract.',
  },
  {
    id: 'groep',
    label: 'Meerdere gemeenten, graag contact',
    prijs: null,
    toelichting: 'Maatwerk voor een groep gemeenten of een samenwerkingsverband.',
  },
];

export const aanbodPrijzen = {
  rapport: 500,
  toelichtingExtra: 500,
  btwTekst: 'exclusief btw',
};

/** Termijnen uit het plan van Niels Ahsmann. */
export const aanbodTermijnen = {
  reactie: 'binnen één werkdag',
  rapport: 'binnen een week nadat u de invoer hebt bevestigd',
};

/** Wat u bij de hand houdt voor een scherper rapport. */
export const aanbodBijDeHand = ['het werkelijk verbrande tonnage restafval van uw gemeente', 'het verwerkingscontract met de AVI'];

/** Alle velden die het formulier naar Netlify en Supabase stuurt (zonder form-name en bot-field). */
export const heffingAanvraagVelden = [
  'gemeente',
  'gemeentecode',
  'naam',
  'organisatie',
  'functie',
  'email',
  'telefoon',
  'keuze',
  'opmerking',
  'akkoord_privacy',
  'kerncijfers',
  'bron',
] as const;

export type AanvraagVeld = (typeof heffingAanvraagVelden)[number];

/** Grenzen die ook als check constraint in de database staan. */
export const aanvraagLengtes: Record<'gemeente' | 'naam' | 'organisatie' | 'functie' | 'email' | 'telefoon' | 'opmerking' | 'kerncijfers' | 'bron', number> = {
  gemeente: 100,
  naam: 120,
  organisatie: 160,
  functie: 120,
  email: 254,
  telefoon: 40,
  opmerking: 2000,
  kerncijfers: 1500,
  bron: 60,
};
