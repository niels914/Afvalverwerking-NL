// Voorbeeld voor bezoekers op /inloggen: een echte uitsnede uit het aanbestedingsarchief, met bron en peildatum.
//
// Waarom een vaste uitsnede en geen live gegevens: het archief is alleen voor leden (RLS op public.is_lid()).
// Bezoekers krijgen daarom geen toegang tot de database; ze zien deze momentopname.
//
// Herkomst (peildatum 27 oktober 2026):
// - regels: public.aanbestedingen_overzicht, status 'open', afval als hoofdopdracht, nieuwste publicatie eerst;
//   per regel gecontroleerd tegen de TenderNed-API (https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties/<id>).
// - telling: select status, count(*) from public.aanbestedingen_overzicht group by status (totaal 1.435, open 40);
//   oudste publicatiedatum 28 maart 2013.
// - afvalstroom: indeling van het platform (supabase/functions/ververs-aanbestedingen/afleiding.ts), niet van TenderNed.
// Bijwerken: zie docs/stukken/toegang.md, paragraaf "Voorbeeld op de inlogpagina".

export interface VoorbeeldAanbesteding {
  kenmerk: number;
  titel: string;
  opdrachtgever: string;
  procedure: string;
  /** jjjj-mm-dd */
  publicatiedatum: string;
  /** jjjj-mm-ddTuu:mm, Nederlandse tijd */
  sluitingsdatum: string;
  stromen: string[];
  tenderned_url: string;
}

export const archiefVoorbeeld = {
  peildatum: '2026-10-27',
  bron: {
    titel: 'TenderNed, aankondigingen',
    url: 'https://www.tenderned.nl/aankondigingen/overzicht',
  },
  telling: {
    totaal: 1435,
    open: 40,
    /** Oudste publicatiedatum in het archief. */
    sinds: '2013-03-28',
  },
  regels: [
    {
      kenmerk: 616612,
      titel: 'Ontvangst en verwerking van fijn huishoudelijk restafval (HRA) NV BAR Afvalbeheer',
      opdrachtgever: 'De BedrijfsvoeringsPartner (Barendrecht, Albrandswaard, Ridderkerk, De BedrijfsvoeringsPartner, NV BAR Afvalbeheer)',
      procedure: 'Openbaar',
      publicatiedatum: '2026-10-20',
      sluitingsdatum: '2026-12-07T11:00',
      stromen: ['Huishoudelijk afval (algemeen)', 'Restafval', 'PMD en kunststof'],
      tenderned_url: 'https://www.tenderned.nl/aankondigingen/overzicht/445210',
    },
    {
      kenmerk: 601374,
      titel: 'Afvalinzameling en - verwerking',
      opdrachtgever: 'Veiligheids- en Gezondheidsregio Gelderland-Midden',
      procedure: 'Openbaar',
      publicatiedatum: '2026-10-23',
      sluitingsdatum: '2026-12-10T10:00',
      stromen: ['Restafval', 'Bedrijfsafval'],
      tenderned_url: 'https://www.tenderned.nl/aankondigingen/overzicht/445787',
    },
    {
      kenmerk: 620579,
      titel: '2026.0006 Afvalverzameling en -verwerking',
      opdrachtgever: 'N.V. Waterbedrijf Groningen',
      procedure: 'Openbaar',
      publicatiedatum: '2026-10-25',
      sluitingsdatum: '2026-12-15T12:00',
      stromen: ['Gevaarlijk afval', 'Bedrijfsafval'],
      tenderned_url: 'https://www.tenderned.nl/aankondigingen/overzicht/446087',
    },
  ] satisfies VoorbeeldAanbesteding[],
};

/**
 * Stand van een voorbeeldregel op een gegeven dag (jjjj-mm-dd). Na de sluitingsdatum zeggen we niet meer "open",
 * zodat de momentopname nooit iets beweert wat niet meer klopt.
 */
export function voorbeeldStand(sluitingsdatum: string, vandaag: string): 'open' | 'gesloten' {
  return vandaag <= sluitingsdatum.slice(0, 10) ? 'open' : 'gesloten';
}

/** Vandaag als jjjj-mm-dd in Nederlandse tijd. */
export function vandaagInNederland(nu = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nu);
}
