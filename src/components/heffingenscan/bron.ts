import { BRON_SLEUTEL } from '../../data/heffingen-aanbod';

// De code uit ?bron= (bijvoorbeeld "linkedin-1") blijft voor deze sessie bewaard in sessionStorage, zodat het
// aanvraagformulier weet via welke uiting iemand kwam. Geen tracker: de code gaat alleen mee met een aanvraag.

/** Maakt van een ruwe waarde een veilige code: kleine letters, cijfers, punt, koppelteken, underscore; hooguit 60 tekens. */
export function schoneBron(ruw: string | null | undefined): string {
  return (ruw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 60);
}

/** Leest ?bron= uit de adresbalk en bewaart die; geeft de bewaarde bron terug (leeg als er geen is). */
export function bewaarBronUitUrl(zoekdeel: string): string {
  const uitUrl = schoneBron(new URLSearchParams(zoekdeel).get('bron'));
  try {
    if (uitUrl) sessionStorage.setItem(BRON_SLEUTEL, uitUrl);
    return uitUrl || schoneBron(sessionStorage.getItem(BRON_SLEUTEL));
  } catch {
    return uitUrl;
  }
}
