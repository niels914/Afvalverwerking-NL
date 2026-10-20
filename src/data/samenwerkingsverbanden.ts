// Samenwerkingsverbanden staan bewust (nog) niet op de kaart.
//
// Er is geen openbare, onderhouden bron met de indeling van gemeenten in afvalsamenwerkingsverbanden
// (gemeenschappelijke regelingen, NV's en dienstverleningsovereenkomsten lopen door elkaar en
// veranderen regelmatig). Een zelf samengestelde lijst zou als feitelijk overkomen zonder dat we de
// juistheid kunnen garanderen. De kaart toont daarom cijfers per gemeente.
//
// Komt er een betrouwbare bron (bijvoorbeeld een register van gemeenschappelijke regelingen met
// afvaltaken), vul dan deze lijst met per verband de CBS-gemeentecodes. De kerncijfers per verband
// rekent src/lib/kaartdata.ts (functie kerncijfers) dan uit de gemeentecijfers.

export interface Samenwerkingsverband {
  id: string;
  naam: string;
  /** CBS-gemeentecodes (GMxxxx) van de deelnemende gemeenten. */
  gemeenteCodes: string[];
  /** Openbare bron van de indeling, met peildatum. */
  bron: { url: string; peildatum: string };
}

export const samenwerkingsverbanden: Samenwerkingsverband[] = [];
