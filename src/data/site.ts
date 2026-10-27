// Algemene gegevens van het platform: naam, navigatie en contact.

export const platform = {
  naam: 'Restafvalkaart · Ledenplatform',
  korteNaam: 'Ledenplatform Restafvalkaart',
  versie: 'stand oktober 2026',
};

export interface NavItem {
  pad: string;
  label: string;
  alleenLeden?: boolean;
}

export const navigatie: NavItem[] = [
  { pad: '/', label: 'Home' },
  { pad: '/restafvalkaart', label: 'Restafvalkaart' },
  { pad: '/nieuws', label: 'Nieuws' },
  { pad: '/kennisbank', label: 'Kennisbank' },
  { pad: '/tools', label: 'Tools' },
  { pad: '/aanbestedingsarchief', label: 'Aanbestedingsarchief' },
  { pad: '/lidmaatschap', label: 'Lidmaatschap' },
  { pad: '/over-het-platform', label: 'Over het platform' },
];

export const contact = {
  naam: 'Niels Ahsmann',
  functie: 'Partner en senior adviseur circulaire economie, KplusV',
  email: 'n.ahsmann@kplusv.nl',
  telefoon: '06 2708 5537',
  foto: '/foto-niels.jpg',
};

/** Links in de voettekst (juridische pagina's). */
export const voetLinks: NavItem[] = [
  { pad: '/algemene-voorwaarden', label: 'Algemene voorwaarden' },
  { pad: '/privacy', label: 'Privacyverklaring' },
  { pad: '/cookies', label: 'Cookies' },
  { pad: '/toegankelijkheid', label: 'Toegankelijkheid' },
  { pad: '/disclaimer', label: 'Disclaimer' },
];
