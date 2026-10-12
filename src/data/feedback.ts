// Feedbackformulier: veldnamen en keuzes.
// Houd de veldnamen gelijk aan de verborgen statische kopie van het formulier in index.html,
// anders slaat Netlify die velden niet op.

export const FORMULIERNAAM = 'feedback';
export const LOKALE_OPSLAG = 'afvalplatform-feedback';

export const rolOpties = [
  { waarde: 'collega', label: 'Collega KplusV' },
  { waarde: 'samenwerkingsverband-gemeente', label: 'Samenwerkingsverband of gemeente' },
  { waarde: 'verwerker', label: 'Afvalverwerker' },
  { waarde: 'anders', label: 'Anders' },
];

export const jaNeeOpties = [
  { waarde: 'ja', label: 'Ja' },
  { waarde: 'misschien', label: 'Misschien' },
  { waarde: 'nee', label: 'Nee' },
];

export const onderdeelOpties = [
  'Restafvalkaart',
  'Nieuws',
  'Kennisbank',
  'Aanbestedingstool',
  'Indexcalculator',
  'CO2-heffingenscan',
  'Bodemassencalculator',
  'Rekenmodel bron- en nascheiding',
  'Aanbestedingsarchief',
];

export interface FeedbackAntwoorden {
  rol: string;
  organisatie: string;
  gebruiken: string;
  onderdelen: string[];
  mist: string;
  lid_worden: string;
  bedrag_redelijk: string;
  bedrag_te_duur: string;
  weerhoudt: string;
  collega_bijdrage: string;
  contact_toestemming: string;
  email: string;
}

export const legeAntwoorden: FeedbackAntwoorden = {
  rol: '',
  organisatie: '',
  gebruiken: '',
  onderdelen: [],
  mist: '',
  lid_worden: '',
  bedrag_redelijk: '',
  bedrag_te_duur: '',
  weerhoudt: '',
  collega_bijdrage: '',
  contact_toestemming: '',
  email: '',
};
