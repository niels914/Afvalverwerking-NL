// Algemene gegevens van het platform: naam, navigatie en contact.

export const platform = {
  naam: 'Restafvalkaart · Ledenplatform',
  korteNaam: 'Ledenplatform Restafvalkaart',
  /** Titel van de homepage en de standaardtitel in het tabblad. */
  ondertitel: 'Heffingenscan restafval en afvalstromen',
  versie: 'stand oktober 2026',
};

export interface NavItem {
  pad: string;
  label: string;
  alleenLeden?: boolean;
}

/** Hoofdmenu. "Home" is het logo; "Over het platform" staat in de voet (voetOver). */
export const navigatie: NavItem[] = [
  { pad: '/heffingenscan', label: 'Heffingenscan' },
  { pad: '/stromen', label: 'Afvalstromen' },
  { pad: '/restafvalkaart', label: 'Restafvalkaart' },
  { pad: '/tools', label: 'Tools' },
  { pad: '/aanbestedingsarchief', label: 'Aanbestedingen' },
  { pad: '/kennisbank', label: 'Kennisbank' },
  { pad: '/nieuws', label: 'Nieuws' },
  { pad: '/lidmaatschap', label: 'Lidmaatschap' },
];

/** Pagina's die wel een titel krijgen maar niet in het hoofdmenu staan. */
export const voetOver: NavItem = { pad: '/over-het-platform', label: 'Over het platform' };

export const contact = {
  naam: 'Niels Ahsmann',
  functie: 'Partner en senior adviseur circulaire economie, KplusV',
  email: 'n.ahsmann@kplusv.nl',
  telefoon: '06 2708 5537',
};

/** Links in de voettekst (juridische pagina's). */
export const voetLinks: NavItem[] = [
  { pad: '/algemene-voorwaarden', label: 'Algemene voorwaarden' },
  { pad: '/privacy', label: 'Privacyverklaring' },
  { pad: '/cookies', label: 'Cookies' },
  { pad: '/toegankelijkheid', label: 'Toegankelijkheid' },
  { pad: '/disclaimer', label: 'Disclaimer' },
];
