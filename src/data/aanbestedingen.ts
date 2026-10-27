// Bron en voorwaarden van het aanbestedingsarchief.
//
// De aanbestedingen zelf staan niet meer in dit bestand maar in de Supabase-tabel public.aanbestedingen
// (alleen leesbaar voor leden). De Edge Function ververs-aanbestedingen vult die elke ochtend vanuit TenderNed.
// Zie docs/stukken/aanbestedingen.md voor onderhoud en de gebruiksvoorwaarden van de bron.

export interface BronVermelding {
  naam: string;
  url: string;
  licentie: string;
  licentieUrl: string;
  /** Datum waarop de voorwaarden en licentie zijn gecontroleerd (jjjj-mm-dd). */
  peildatum: string;
}

/** Bron van de aanbestedingen. */
export const aanbestedingenBron: BronVermelding = {
  naam: 'TenderNed, aankondigingenplatform',
  url: 'https://www.tenderned.nl/aankondigingen/overzicht',
  licentie: 'open data (CC0) volgens data.overheid.nl',
  licentieUrl: 'https://data.overheid.nl/dataset/26e6440b-1d39-4e28-8d18-57d987042622',
  peildatum: '2026-10-26',
};

/** Technische bron: de openbare publicatie-webservice (TNS) die data.overheid.nl noemt. Kan zonder aankondiging wijzigen. */
export const tendernedWebservice = 'https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties';

/** Gebruiksvoorwaarden van TenderNed (gecontroleerd op de peildatum hierboven). */
export const tendernedVoorwaarden = 'https://www.tenderned.nl/over-deze-site/gebruiksvoorwaarden';

/** Gemeente → provincie (CBS, Gebieden in Nederland 2013-2026), voor de provincie uit de naam van de opdrachtgever. */
export { GEMEENTEN_BRON as gemeentenBron } from '../../supabase/functions/ververs-aanbestedingen/gemeenten';

/** Indeling NUTS-codes naar provincie. */
export const nutsBron = {
  naam: 'Eurostat GISCO, NUTS 2021 en 2024',
  url: 'https://gisco-services.ec.europa.eu/distribution/v2/nuts/',
  peildatum: '2026-10-26',
};

export const cpvFilterUitleg = 'Opgenomen zijn publicaties met CPV-code 90500000 of een onderliggende code (afvalinzameling, -transport, -verwerking, recycling en stortplaatsen).';
