import { Link } from 'react-router-dom';
import { platform } from '../../data/site';
import { aanbieder, bronnen, externeDiensten, supabaseGebruik } from './gegevens';
import { BronRegel, ContactBlok, JuridischDocument, Toetspunt, type Sectie } from './JuridischDocument';

// Privacyverklaring. De lijsten met diensten en databasefuncties komen uit gegevens.ts;
// opslag.test.ts controleert dat die lijsten de code volgen.

interface Verwerking {
  id: string;
  titel: string;
  gegevens: string;
  doel: string;
  grondslag: string;
  bewaartermijn: string;
  wie: string;
}

const verwerkingen: Verwerking[] = [
  {
    id: 'account',
    titel: 'Account en inloggen',
    gegevens:
      'E-mailadres, een versleuteld wachtwoord als u dat instelt, tijdstippen van aanmaken, bevestigen en laatste inlog. Bij elke inlog legt Supabase technische gegevens vast: IP-adres, tijdstip en browsertype.',
    doel: 'U laten inloggen en vaststellen of uw organisatie lid is. Dat gebeurt aan de hand van het domein van uw bevestigde e-mailadres.',
    grondslag:
      'Gerechtvaardigd belang van KplusV en uw organisatie om het lidmaatschap uit te voeren (artikel 6 lid 1 onder f AVG). U bent zelf geen partij bij het lidmaatschap; uw organisatie wel.',
    bewaartermijn:
      'Zolang uw account bestaat. U kunt uw account altijd laten verwijderen. Een vaste termijn voor het opruimen van ongebruikte accounts wordt nog vastgesteld (voorstel: 24 maanden na de laatste inlog). Technische logboeken bewaart Supabase volgens de termijnen van het abonnement van KplusV.',
    wie: 'De beheerder van het platform bij KplusV en Supabase als verwerker.',
  },
  {
    id: 'ledenadministratie',
    titel: 'Ledenadministratie',
    gegevens:
      'Naam en soort organisatie, de e-maildomeinen die toegang geven, de status en de einddatum van het lidmaatschap. Dit zijn gegevens over organisaties, geen persoonsgegevens.',
    doel: 'Bepalen welke e-maildomeinen toegang hebben tot de ledenonderdelen.',
    grondslag: 'Uitvoering van het lidmaatschap met uw organisatie.',
    bewaartermijn: 'Zolang het lidmaatschap loopt en daarna zolang de fiscale bewaarplicht geldt (zeven jaar).',
    wie: 'De beheerder van het platform bij KplusV en Supabase als verwerker.',
  },
  {
    id: 'aanmelding',
    titel: 'Aanmelding voor een lidmaatschap',
    gegevens:
      'Naam, functie, e-mailadres en telefoonnummer van de contactpersoon; factuuradres, ter attentie van, e-mailadres van de crediteurenadministratie; gegevens van de organisatie zoals KVK-nummer, btw-nummer, OIN en inkoopordernummer.',
    doel: 'Uw aanmelding beoordelen, het lidmaatschap vastleggen, factureren en contact houden over het lidmaatschap.',
    grondslag:
      'Uitvoering van de overeenkomst met uw organisatie en het gerechtvaardigd belang om met de contactpersoon te communiceren. Voor de factuurgegevens: de wettelijke bewaarplicht (artikel 6 lid 1 onder c AVG).',
    bewaartermijn:
      'Factuurgegevens zeven jaar, vanwege de fiscale bewaarplicht. Contactgegevens tot twee jaar na het einde van het lidmaatschap. Een aanmelding die niet tot een lidmaatschap leidt, verwijdert KplusV binnen drie maanden. De kopie bij Netlify verwijdert KplusV nadat de aanmelding in de eigen administratie staat.',
    wie: 'Medewerkers van KplusV die het lidmaatschap en de facturering verzorgen, en Netlify als verwerker.',
  },
  {
    id: 'feedback',
    titel: 'Feedbackformulier',
    gegevens:
      'Uw rol, eventueel de naam van uw organisatie en uw antwoorden. Uw e-mailadres alleen als u aangeeft dat KplusV contact met u mag opnemen.',
    doel: 'Het platform verbeteren en, als u dat wilt, u benaderen met een vervolgvraag.',
    grondslag: 'Toestemming (artikel 6 lid 1 onder a AVG). U kunt die altijd intrekken.',
    bewaartermijn: 'Twaalf maanden na ontvangst. Daarna bewaart KplusV alleen een samenvatting zonder namen en e-mailadressen.',
    wie: 'Medewerkers van KplusV die aan het platform werken, en Netlify als verwerker.',
  },
  {
    id: 'email',
    titel: 'Contact per e-mail of telefoon',
    gegevens: 'Uw naam, e-mailadres of telefoonnummer en de inhoud van uw bericht.',
    doel: 'Uw vraag beantwoorden.',
    grondslag: 'Gerechtvaardigd belang om vragen te beantwoorden.',
    bewaartermijn: 'Tot twee jaar nadat uw vraag is afgehandeld, tenzij het bericht deel uitmaakt van de administratie van een lidmaatschap.',
    wie: 'Medewerkers van KplusV.',
  },
  {
    id: 'bezoek',
    titel: 'Bezoek aan de website',
    gegevens: 'IP-adres, opgevraagde pagina, tijdstip, browsertype en de pagina waar u vandaan kwam, in de serverlogboeken van Netlify.',
    doel: 'De website leveren, storingen oplossen en misbruik tegengaan.',
    grondslag: 'Gerechtvaardigd belang om een veilige en werkende website aan te bieden.',
    bewaartermijn: 'Volgens de termijnen van Netlify. KplusV gebruikt deze logboeken niet voor statistieken.',
    wie: 'Netlify als verwerker; KplusV alleen bij een storing of misbruik.',
  },
];

const secties: Sectie[] = [
  {
    id: 'in-het-kort',
    titel: 'In het kort',
    inhoud: (
      <ul>
        <li>KplusV is verantwoordelijk voor de persoonsgegevens op dit platform.</li>
        <li>Wij verwerken alleen wat nodig is voor inloggen, het lidmaatschap, facturen en uw vragen.</li>
        <li>Er zijn geen trackers, geen advertenties en geen bezoekersstatistieken.</li>
        <li>Wat u invult in de rekentools, blijft in uw browser. Het gaat niet naar KplusV.</li>
        <li>De database staat in de Europese Unie. Hosting en formulieren lopen via Netlify, een Amerikaans bedrijf.</li>
        <li>U kunt uw gegevens inzien, laten verbeteren of laten verwijderen. Mail daarvoor naar {aanbieder.contact.email}.</li>
      </ul>
    ),
  },
  {
    id: 'wie',
    titel: 'Wie is verantwoordelijk',
    inhoud: (
      <>
        <p>
          {aanbieder.naam} is verwerkingsverantwoordelijke in de zin van de Algemene verordening gegevensbescherming (AVG)
          voor de gegevens op het {platform.korteNaam}.
        </p>
        <p>
          {aanbieder.naam}, {aanbieder.straat}, {aanbieder.postcode} {aanbieder.plaats}, KVK-nummer {aanbieder.kvk}.
        </p>
        <p>
          Aanspreekpunt voor privacy op dit platform: {aanbieder.contact.naam},{' '}
          <a href={`mailto:${aanbieder.contact.email}`}>{aanbieder.contact.email}</a>.
        </p>
        <BronRegel sleutel="kvk" />
        <Toetspunt>
          Ga na of KplusV een functionaris gegevensbescherming heeft of een algemeen privacyadres. Zo ja, vermeld die hier
          naast of in plaats van de contactpersoon van het platform.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'welke-gegevens',
    titel: 'Welke gegevens, waarvoor en hoe lang',
    inhoud: (
      <>
        <p>Per onderdeel van het platform staat hieronder welke gegevens wij verwerken, waarom, op welke grond en hoe lang.</p>
        <div className="jd-blokken">
          {verwerkingen.map((v) => (
            <section key={v.id} className="jd-blok" id={`verwerking-${v.id}`} aria-labelledby={`verwerking-${v.id}-kop`}>
              <h3 id={`verwerking-${v.id}-kop`}>{v.titel}</h3>
              <dl className="jd-gegevens">
                <dt>Gegevens</dt>
                <dd>{v.gegevens}</dd>
                <dt>Doel</dt>
                <dd>{v.doel}</dd>
                <dt>Grondslag</dt>
                <dd>{v.grondslag}</dd>
                <dt>Bewaartermijn</dt>
                <dd>{v.bewaartermijn}</dd>
                <dt>Wie ziet het</dt>
                <dd>{v.wie}</dd>
              </dl>
            </section>
          ))}
        </div>
        <BronRegel sleutel="bewaarplicht" voorvoegsel="Fiscale bewaarplicht" />
        <Toetspunt>
          De bewaartermijnen voor contactgegevens, afgewezen aanmeldingen, feedback en e-mail zijn voorstellen. Stel ze vast
          en richt het opruimen in (Netlify Forms en Supabase verwijderen niets vanzelf).
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'niet',
    titel: 'Wat wij niet doen',
    inhoud: (
      <ul>
        <li>Geen cookies of andere opslag voor statistieken, advertenties of het volgen van bezoekers. Zie de <Link to="/cookies">cookieverklaring</Link>.</li>
        <li>Geen verkoop of verhuur van gegevens.</li>
        <li>Geen profielen van gebruikers.</li>
        <li>
          Geen besluiten over u die alleen door een computer worden genomen en die rechtsgevolgen hebben. Het platform bepaalt
          wel automatisch of uw e-maildomein toegang geeft. Klopt dat niet, neem dan contact op; dan kijkt een medewerker ernaar.
        </li>
        <li>Geen opslag van wat u invult in de rekentools. Die invoer verdwijnt als u de pagina sluit of vernieuwt.</li>
      </ul>
    ),
  },
  {
    id: 'database',
    titel: 'Wat de site in de database opvraagt',
    inhoud: (
      <>
        <p>
          Naast het inloggen zelf roept de site deze functies in de database aan. Elke functie geeft alleen gegevens over uw
          eigen account of organisatie; de database dwingt dat af met beveiliging op rijniveau (Row Level Security).
        </p>
        <dl className="jd-gegevens">
          {supabaseGebruik.map((s) => (
            <div key={s.naam} style={{ display: 'contents' }}>
              <dt>
                <code>{s.naam}</code> ({s.soort})
              </dt>
              <dd>{s.wat}</dd>
            </div>
          ))}
        </dl>
      </>
    ),
  },
  {
    id: 'ontvangers',
    titel: 'Wie de gegevens nog meer verwerkt',
    inhoud: (
      <>
        <p>
          KplusV gebruikt de volgende diensten. Met verwerkers sluit KplusV een verwerkersovereenkomst; bij Supabase en Netlify
          maakt die deel uit van hun voorwaarden.
        </p>
        <div className="jd-blokken">
          {externeDiensten.map((d) => (
            <section key={d.naam} className="jd-blok" aria-labelledby={`dienst-${d.naam}`}>
              <h3 id={`dienst-${d.naam}`}>{d.naam}</h3>
              <dl className="jd-gegevens">
                <dt>Partij</dt>
                <dd>{d.partij}</dd>
                <dt>Rol</dt>
                <dd>{d.rol}</dd>
                <dt>Waarvoor</dt>
                <dd>{d.waarvoor}</dd>
                <dt>Gegevens</dt>
                <dd>{d.gegevens}</dd>
                <dt>Waar</dt>
                <dd>{d.waar}</dd>
                <dt>Buiten de EU</dt>
                <dd>{d.doorgifte}</dd>
              </dl>
              {d.bron.map((b) => (
                <BronRegel key={b} sleutel={b} />
              ))}
            </section>
          ))}
        </div>
        <p>
          Daarnaast gebruikt KplusV voor e-mail en de financiële administratie haar eigen systemen. Facturen en gegevens die
          daarvoor nodig zijn, kunnen bij een controle worden ingezien door de Belastingdienst of een accountant.
        </p>
        <Toetspunt>
          Leg de verwerkersovereenkomsten (DPA) van Supabase en Netlify vast in de administratie van KplusV. Supabase verstuurt
          nu ook de e-mails met inloglinks; zodra een eigen mailserver is ingesteld, moet die dienst hier worden toegevoegd.
          Vermeld ook welke systemen KplusV gebruikt voor e-mail en facturen, als die buiten de EU verwerken.
        </Toetspunt>
      </>
    ),
  },
  {
    id: 'doorgifte',
    titel: 'Gegevens buiten de Europese Unie',
    inhoud: (
      <>
        <p>Op drie punten kunnen gegevens buiten de Europese Unie komen:</p>
        <ul>
          <li>
            <strong>Netlify</strong> (hosting en formulieren) is gevestigd in de Verenigde Staten en bewaart formulierinzendingen
            daar. Netlify neemt deel aan het EU-US Data Privacy Framework. Daarvoor geldt een adequaatheidsbesluit van de
            Europese Commissie.
          </li>
          <li>
            <strong>Supabase</strong> bewaart de database in Frankfurt, maar is een Amerikaans bedrijf. Voor toegang vanuit de
            Verenigde Staten, bijvoorbeeld bij beheer en support, gebruikt Supabase de standaardcontractbepalingen van de
            Europese Commissie.
          </li>
          <li>
            <strong>OpenStreetMap</strong> levert de kaarttegels via een wereldwijd netwerk. Uw IP-adres gaat naar de server die
            de tegel levert. Dat gebeurt alleen op de pagina Restafvalkaart.
          </li>
        </ul>
        <BronRegel sleutel="adequaatheid" />
        <BronRegel sleutel="netlifyPrivacy" />
        <BronRegel sleutel="supabasePrivacy" />
      </>
    ),
  },
  {
    id: 'beveiliging',
    titel: 'Beveiliging',
    inhoud: (
      <ul>
        <li>Alle verbindingen lopen via https.</li>
        <li>Wachtwoorden slaat Supabase versleuteld op; KplusV kan ze niet inzien.</li>
        <li>Een account geeft pas toegang nadat het e-mailadres is bevestigd via een link in de mailbox.</li>
        <li>De database geeft elke gebruiker alleen gegevens over het eigen account en de eigen organisatie (Row Level Security).</li>
        <li>Alleen de beheerder van het platform bij KplusV kan de ledenadministratie wijzigen.</li>
        <li>Het lettertype staat op de eigen server. Er gaat geen verbinding naar Google of andere lettertypediensten.</li>
      </ul>
    ),
  },
  {
    id: 'rechten',
    titel: 'Uw rechten',
    inhoud: (
      <>
        <p>U hebt het recht om:</p>
        <ul>
          <li>uw gegevens in te zien;</li>
          <li>onjuiste gegevens te laten verbeteren;</li>
          <li>uw gegevens te laten verwijderen, bijvoorbeeld uw account;</li>
          <li>de verwerking te laten beperken;</li>
          <li>bezwaar te maken tegen een verwerking op grond van gerechtvaardigd belang;</li>
          <li>uw gegevens in een gangbaar bestandsformaat te ontvangen;</li>
          <li>een gegeven toestemming in te trekken.</li>
        </ul>
        <p>
          Stuur uw verzoek naar <a href={`mailto:${aanbieder.contact.email}?subject=Privacyverzoek`}>{aanbieder.contact.email}</a>.
          Wij reageren binnen een maand. Om te voorkomen dat iemand anders uw gegevens opvraagt, vragen wij u het verzoek te
          sturen vanaf het e-mailadres van uw account. Een kopie van een identiteitsbewijs vragen wij niet.
        </p>
        <p>
          Bent u het niet eens met hoe wij met uw gegevens omgaan? Laat het ons eerst weten. U kunt ook een klacht indienen bij de{' '}
          <a href={bronnen.apKlacht.url}>Autoriteit Persoonsgegevens</a>.
        </p>
        <BronRegel sleutel="avg" />
      </>
    ),
  },
  {
    id: 'wijzigingen',
    titel: 'Wijzigingen',
    inhoud: (
      <p>
        Verandert er iets in hoe wij gegevens verwerken, bijvoorbeeld door een nieuwe dienst, dan passen wij deze verklaring aan.
        Bovenaan staan het versienummer en de datum van de laatste wijziging. Bij een belangrijke wijziging informeren wij de
        contactpersonen van leden per e-mail.
      </p>
    ),
  },
  {
    id: 'contact',
    titel: 'Contact',
    inhoud: <ContactBlok onderwerp="Vraag over privacy" />,
  },
];

export function Privacy() {
  return (
    <JuridischDocument
      id="privacy"
      intro={
        <>
          Hoe KplusV omgaat met persoonsgegevens op het {platform.korteNaam}: welke gegevens, waarvoor, hoe lang, wie ze nog meer
          ziet en welke rechten u hebt.
        </>
      }
      secties={secties}
    />
  );
}
