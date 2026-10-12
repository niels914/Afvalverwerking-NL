import type { Aanbesteding } from './types';

// FICTIEF: vijftien verzonnen aanbestedingen. Opdrachtgevers, data en titels zijn bedacht.
// De links gaan naar de homepage van TenderNed of Mercell, niet naar een echte aankondiging.

const TENDERNED = 'https://www.tenderned.nl';
const MERCELL = 'https://www.mercell.com';

export const aanbestedingen: Aanbesteding[] = [
  { id: 'a01', titel: 'Verwerking huishoudelijk restafval 2027–2032', opdrachtgever: 'Afvalsamenwerking Regio Noord', samenwerkingsverbandId: 'regio-noord', stroom: 'Restafval', procedure: 'Europees openbaar', regio: 'Noord', publicatie: '2026-09-02', sluiting: '2026-11-18', status: 'lopend', platform: 'TenderNed', url: TENDERNED },
  { id: 'a02', titel: 'Vergisting en compostering GFT', opdrachtgever: 'Reinigingsdienst Rivierenland', samenwerkingsverbandId: 'rivierenland', stroom: 'GFT', procedure: 'Europees openbaar', regio: 'Midden', publicatie: '2026-08-21', sluiting: '2026-10-30', status: 'lopend', platform: 'TenderNed', url: TENDERNED },
  { id: 'a03', titel: 'Nascheiding PMD uit restafval', opdrachtgever: 'Grondstoffenbedrijf Kustzone', samenwerkingsverbandId: 'kustzone', stroom: 'PMD', procedure: 'Concurrentiegerichte dialoog', regio: 'West', publicatie: '2026-07-14', sluiting: '2026-10-20', status: 'lopend', platform: 'Mercell', url: MERCELL },
  { id: 'a04', titel: 'Inzameling en vermarkting textiel', opdrachtgever: 'Milieusamenwerking Oostgrens', samenwerkingsverbandId: 'oostgrens', stroom: 'Textiel', procedure: 'Nationaal openbaar', regio: 'Oost', publicatie: '2026-09-15', sluiting: '2026-11-03', status: 'lopend', platform: 'TenderNed', url: TENDERNED },
  { id: 'a05', titel: 'Verwerking grof huishoudelijk afval', opdrachtgever: 'Gemeente Duinwijk', samenwerkingsverbandId: 'kustzone', stroom: 'Grof huishoudelijk afval', procedure: 'Meervoudig onderhands', regio: 'West', publicatie: '2026-08-04', sluiting: '2026-09-12', status: 'gesloten', platform: 'Mercell', url: MERCELL },
  { id: 'a06', titel: 'Verwerking restafval en bodemasverwerking', opdrachtgever: 'Afvalregio Zandgronden', samenwerkingsverbandId: 'zandgronden', stroom: 'Restafval', procedure: 'Niet-openbaar', regio: 'Zuid', publicatie: '2026-05-19', sluiting: '2026-08-28', status: 'gesloten', platform: 'TenderNed', url: TENDERNED },
  { id: 'a07', titel: 'Opwerking bodemas tot bouwstof', opdrachtgever: 'Afvalsamenwerking Maasvallei', samenwerkingsverbandId: 'maasvallei', stroom: 'Bodemas', procedure: 'Europees openbaar', regio: 'Zuid', publicatie: '2026-03-10', sluiting: '2026-05-06', status: 'gegund', platform: 'TenderNed', url: TENDERNED },
  { id: 'a08', titel: 'Overslag en transport papier en karton', opdrachtgever: 'Reinigingsbedrijf Merengebied', samenwerkingsverbandId: 'merengebied', stroom: 'Papier en karton', procedure: 'Nationaal openbaar', regio: 'Noord', publicatie: '2026-02-24', sluiting: '2026-04-09', status: 'gegund', platform: 'Mercell', url: MERCELL },
  { id: 'a09', titel: 'Verwerking GFT 2027–2031', opdrachtgever: 'Inzamelcoöperatie Deltagemeenten', samenwerkingsverbandId: 'deltagemeenten', stroom: 'GFT', procedure: 'Europees openbaar', regio: 'Zuid', publicatie: '2026-04-02', sluiting: '2026-06-11', status: 'gegund', platform: 'TenderNed', url: TENDERNED },
  { id: 'a10', titel: 'Sortering bronafgescheiden PMD', opdrachtgever: 'Afvalsamenwerking Veenstreek', samenwerkingsverbandId: 'veenstreek', stroom: 'PMD', procedure: 'Europees openbaar', regio: 'Noord', publicatie: '2026-06-23', sluiting: '2026-09-04', status: 'gesloten', platform: 'TenderNed', url: TENDERNED },
  { id: 'a11', titel: 'Verwerking restafval (raamovereenkomst)', opdrachtgever: 'Grondstoffendienst Polderland', samenwerkingsverbandId: 'polderland', stroom: 'Restafval', procedure: 'Concurrentiegerichte dialoog', regio: 'Midden', publicatie: '2026-01-13', sluiting: '2026-03-27', status: 'gegund', platform: 'Mercell', url: MERCELL },
  { id: 'a12', titel: 'Inzameling textiel via containers', opdrachtgever: 'Gemeente Plassenoord', samenwerkingsverbandId: 'groene-hart-west', stroom: 'Textiel', procedure: 'Meervoudig onderhands', regio: 'West', publicatie: '2026-09-29', sluiting: '2026-11-10', status: 'lopend', platform: 'Mercell', url: MERCELL },
  { id: 'a13', titel: 'Verwerking GFT en snoeiafval', opdrachtgever: 'Afvalschap Heuvelland-Zuid', samenwerkingsverbandId: 'heuvelland-zuid', stroom: 'GFT', procedure: 'Nationaal openbaar', regio: 'Zuid', publicatie: '2026-07-07', sluiting: '2026-08-21', status: 'gesloten', platform: 'TenderNed', url: TENDERNED },
  { id: 'a14', titel: 'Verwerking restafval 2027–2030', opdrachtgever: 'Milieudienst Groene Hart-West', samenwerkingsverbandId: 'groene-hart-west', stroom: 'Restafval', procedure: 'Europees openbaar', regio: 'West', publicatie: '2025-11-18', sluiting: '2026-02-05', status: 'gegund', platform: 'TenderNed', url: TENDERNED },
  { id: 'a15', titel: 'Vermarkting papier en karton', opdrachtgever: 'Gemeente Nieuwkavel', samenwerkingsverbandId: 'polderland', stroom: 'Papier en karton', procedure: 'Meervoudig onderhands', regio: 'Midden', publicatie: '2026-09-08', sluiting: '2026-10-24', status: 'lopend', platform: 'Mercell', url: MERCELL },
];

export const statusLabel: Record<Aanbesteding['status'], string> = {
  lopend: 'Lopend',
  gesloten: 'Gesloten',
  gegund: 'Gegund',
};
