// Bronnen voor de Bodemassencalculator, het Rekenmodel PMD en de Aanbestedingstool (onderdeel tools-b).
// Elke bron is op de peildatum opgehaald en gelezen. Werk PEILDATUM bij als u de cijfers opnieuw controleert.
// Onderhoud: zie docs/stukken/tools-b.md.

export const PEILDATUM = '2026-10-27';

export interface Bron {
  titel: string;
  uitgever: string;
  /** Publicatiedatum of -jaar zoals de bron die noemt. */
  datum: string;
  url: string;
}

export const bronnen = {
  war2024: {
    titel: 'Afvalverwerking in Nederland, gegevens 2024 (tabel 9, 10 en 13)',
    uitgever: 'Rijkswaterstaat, Werkgroep Afvalregistratie',
    datum: 'juni 2026',
    url: 'https://verenigingafvalbedrijven.nl/public/News/540/download/Afvalverwerking%20in%20Nederland%20gegevens%202024.pdf',
  },
  strategyVa2025: {
    titel: 'Gevolgen van fiscale maatregelen voor concurrentiepositie afvalverwerkingssector (p. 31 en 78)',
    uitgever: 'Strategy& (PwC) in opdracht van de Vereniging Afvalbedrijven',
    datum: '11 september 2025',
    url: 'https://verenigingafvalbedrijven.nl/public/News/507/download/25.09.10%20-%20PwC%20-%20Gevolgen%20fiscale%20maatregelen%20afvalsector.pdf',
  },
  asb: {
    titel: 'Tarief afvalstoffenbelasting',
    uitgever: 'Belastingdienst',
    datum: '2026',
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/overige_belastingen/belastingen_op_milieugrondslag/afvalstoffenbelasting/tarief_afvalstoffenbelasting',
  },
  verpactAkkoord: {
    titel: 'Onderhandelingsresultaat Verpact, VNG en NVRD over inzamelen PMD-verpakkingen (aanbiedingsbrief, par. 6.2 en 7)',
    uitgever: 'Procesbegeleider namens ministerie van IenW, gepubliceerd door NVRD',
    datum: '28 mei 2025, ingestemd door ALV VNG en NVRD op 18 en 19 juni 2025',
    url: 'https://www.nvrd.nl/wp-content/uploads/2025/06/Aanbiedingsbrief-nieuwe-afspraken-verpakkingsafval.pdf',
  },
  nvrdVragen: {
    titel: '11 vragen over de nieuwe afspraken met Verpact',
    uitgever: 'NVRD',
    datum: '11 juni 2025',
    url: 'https://www.nvrd.nl/nieuws/11-vragen-over-de-nieuwe-afspraken-met-verpact/',
  },
  mviAfval: {
    titel: 'MVI-criteriatool, productgroep Verwerking huishoudelijk afval (criteria 049.001 tot 049.015, versie 24 juli 2026)',
    uitgever: 'Rijksoverheid (PIANOo, RVO)',
    datum: '24 juli 2026',
    url: 'https://www.mvicriteria.nl/nl/webtool?product_group=54&cluster=5',
  },
  mviZwareVoertuigen: {
    titel: 'MVI-criteriatool, productgroep Zware voertuigen – aanschaf (criteria 042.001 tot 042.014)',
    uitgever: 'Rijksoverheid (PIANOo, RVO)',
    datum: '30 november 2025',
    url: 'https://www.mvicriteria.nl/nl/webtool?product_group=46&cluster=3',
  },
  pianooDrempels: {
    titel: 'Drempelbedragen Europees aanbesteden 2026 en 2027',
    uitgever: 'PIANOo',
    datum: 'geldig 1 januari 2026 tot en met 31 december 2027',
    url: 'https://www.pianoo.nl/nl/regelgeving/drempelbedragen-europees-aanbesteden',
  },
  pianooGunning: {
    titel: 'Keuze gunningscriterium en opstellen (sub)gunningscriteria',
    uitgever: 'PIANOo',
    datum: 'geraadpleegd op peildatum',
    url: 'https://www.pianoo.nl/nl/inkoopproces/fase-1-voorbereiden/keuze-gunningscriterium-en-opstellen-subgunningscriteria',
  },
  pianooBpkv: {
    titel: 'Handreiking Beste prijs-kwaliteitverhouding: de basis',
    uitgever: 'PIANOo',
    datum: 'december 2023',
    url: 'https://www.pianoo.nl/sites/default/files/media/documents/2023-12/PIANOo%20Handreiking%20Beste%20prijs-kwaliteitverhouding%20de%20basis%20dec2023_0.pdf',
  },
  pianooPlicht: {
    titel: 'Aanbestedingsplicht',
    uitgever: 'PIANOo',
    datum: 'geraadpleegd op peildatum',
    url: 'https://www.pianoo.nl/nl/inkoopproces/fase-1-voorbereiden/aanbestedingsplicht',
  },
  stb2021bodemas: {
    titel: 'Besluit van 2021 over vrijstelling van het stortverbod voor AVI-bodemas, nota van toelichting (kosten opwerking en storten)',
    uitgever: 'Staatsblad 2021, 235 (Officiële bekendmakingen)',
    datum: '2021',
    url: 'https://zoek.officielebekendmakingen.nl/stb-2021-235.html',
  },
  cbsCpi: {
    titel: 'Consumentenprijzen; prijsindex 2015=100 (tabel 83131NED), jaarcijfers alle bestedingen',
    uitgever: 'CBS',
    datum: 'gewijzigd 12 februari 2026',
    url: 'https://opendata.cbs.nl/statline/#/CBS/nl/dataset/83131NED/table',
  },
  iprMarn2021: {
    titel: 'Onderzoek bron- en nascheiden Plastic+ in de MARN-gemeenten (par. 3.3)',
    uitgever: 'IPR Normag in opdracht van MARN (regio Nijmegen)',
    datum: '27 juli 2021',
    url: 'https://nijmegen.bestuurlijkeinformatie.nl/Document/View/766b277b-ba1e-457d-96bf-331e7fafec0a',
  },
  pianooMvi: {
    titel: 'Maatschappelijk verantwoord opdrachtgeven en inkopen',
    uitgever: 'PIANOo',
    datum: 'geraadpleegd op peildatum',
    url: 'https://www.pianoo.nl/nl/themas/maatschappelijk-verantwoord-opdrachtgeven-en-inkopen',
  },
} satisfies Record<string, Bron>;

export type BronId = keyof typeof bronnen;
