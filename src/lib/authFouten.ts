// Foutmeldingen van Supabase Auth in gewoon Nederlands, plus kleine hulpfuncties voor de inlogpagina.
// Supabase geeft een foutcode (error.code) en een Engelse tekst. We vertalen op code; de Engelse tekst
// tonen we nooit aan de gebruiker. Lijst met codes: https://supabase.com/docs/guides/auth/debugging/error-codes

import { contact } from '../data/site';

/** Minimale lengte van een nieuw wachtwoord. Zet in Supabase dezelfde of een lagere waarde. */
export const MIN_WACHTWOORD = 10;

interface AuthFoutLike {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

const hulp = `Lukt het niet? Mail ${contact.email}.`;

/** Zet een fout van Supabase Auth om in een melding voor de gebruiker. */
export function authFoutmelding(fout: unknown): string {
  const f = (fout ?? {}) as AuthFoutLike;
  const code = f.code ?? '';
  const bericht = f.message ?? '';

  // Geen verbinding (offline, DNS, geblokkeerd door netwerk).
  if (f.name === 'AuthRetryableFetchError' || f.status === 0 || /failed to fetch|networkerror|load failed/i.test(bericht)) {
    return 'Er is geen verbinding met de inlogdienst. Controleer uw internetverbinding en probeer het opnieuw.';
  }

  switch (code) {
    case 'invalid_credentials':
      return 'Het e-mailadres of het wachtwoord klopt niet. Controleer uw invoer, of vraag een inloglink per e-mail aan.';
    case 'email_not_confirmed':
      return 'Uw e-mailadres is nog niet bevestigd. Open de link in de bevestigingsmail, of vraag hieronder een inloglink aan: daarmee bevestigt u het adres meteen.';
    case 'over_email_send_rate_limit': {
      const sec = /after (\d+) seconds?/i.exec(bericht)?.[1];
      return sec
        ? `U heeft net al een e-mail aangevraagd. Wacht ${sec} seconden en probeer het dan opnieuw.`
        : 'Er zijn kort na elkaar te veel e-mails aangevraagd. Wacht een paar minuten en probeer het dan opnieuw.';
    }
    case 'over_request_rate_limit':
      return 'Er zijn te veel pogingen gedaan vanaf dit netwerk. Wacht een paar minuten en probeer het dan opnieuw.';
    case 'otp_expired':
      return 'Deze link is verlopen of al gebruikt. Vraag een nieuwe link aan.';
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'bad_code_verifier':
      return 'Deze link kan niet meer worden gebruikt. Vraag een nieuwe link aan en open die in dezelfde browser.';
    case 'weak_password':
      return `Dit wachtwoord is niet sterk genoeg. Kies minimaal ${MIN_WACHTWOORD} tekens; een zin van een paar woorden werkt goed. Een wachtwoord dat in een bekend datalek voorkomt, wordt geweigerd.`;
    case 'same_password':
      return 'Het nieuwe wachtwoord is hetzelfde als het huidige. Kies een ander wachtwoord.';
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return 'Om uw wachtwoord te wijzigen moet u opnieuw inloggen. Log uit, log weer in en probeer het nog eens.';
    case 'email_address_invalid':
      return 'Dit e-mailadres wordt niet geaccepteerd. Controleer de spelling of gebruik uw werk-e-mailadres.';
    case 'email_address_not_authorized':
      return `Het platform kan op dit moment geen e-mail sturen naar dit adres. Log in met uw wachtwoord, of mail ${contact.email}.`;
    case 'signup_disabled':
    case 'otp_disabled':
      return `Er kunnen nu geen nieuwe accounts worden aangemaakt. Heeft u nog geen account, mail dan ${contact.email}.`;
    case 'email_provider_disabled':
    case 'provider_disabled':
      return `Inloggen met e-mail staat tijdelijk uit. ${hulp}`;
    case 'user_banned':
      return `Dit account is geblokkeerd. ${hulp}`;
    case 'user_not_found':
      return 'Er is geen account met dit e-mailadres.';
    case 'session_not_found':
    case 'session_expired':
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
    case 'bad_jwt':
      return 'Uw sessie is verlopen. Log opnieuw in.';
    case 'request_timeout':
    case 'hook_timeout':
    case 'hook_timeout_after_retry':
      return 'De inlogdienst reageert te traag. Probeer het over een minuut opnieuw.';
    case 'validation_failed':
      return 'De invoer is niet compleet of niet geldig. Controleer het e-mailadres en het wachtwoord.';
    default:
      if (f.status === 429) return 'Er zijn te veel pogingen gedaan. Wacht een paar minuten en probeer het dan opnieuw.';
      if (f.status && f.status >= 500) return `De inlogdienst heeft een storing. Probeer het later opnieuw. ${hulp}`;
      return `Er ging iets mis${code ? ` (code: ${code})` : ''}. Probeer het opnieuw. ${hulp}`;
  }
}

/** Fout uit de adresbalk na een e-maillink, bijvoorbeeld #error=access_denied&error_code=otp_expired. */
export function leesUrlFout(hash: string, zoek: string): string | null {
  for (const deel of [hash.replace(/^#/, ''), zoek.replace(/^\?/, '')]) {
    const p = new URLSearchParams(deel);
    const code = p.get('error_code');
    if (code || p.get('error')) {
      return authFoutmelding({ code: code ?? p.get('error') ?? '', message: p.get('error_description') ?? '' });
    }
  }
  return null;
}

/** Eenvoudige controle op de vorm van een e-mailadres. De server controleert daarna nog eens. */
export function isEmailadres(waarde: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(waarde.trim());
}

/** Domein van een e-mailadres in kleine letters, of '' als het geen adres is. */
export function domeinVan(email: string): string {
  const i = email.lastIndexOf('@');
  return i < 0 ? '' : email.slice(i + 1).trim().toLowerCase();
}

/**
 * Pad om na het inloggen naartoe te gaan. Alleen paden binnen deze site (begint met één '/'),
 * zodat een link als ?terug=https://elders.nl niet naar een andere site leidt.
 */
export function veiligTerugpad(waarde: string | null | undefined, standaard = '/account'): string {
  if (!waarde || !waarde.startsWith('/') || waarde.startsWith('//') || waarde.startsWith('/\\')) return standaard;
  if (waarde.startsWith('/inloggen')) return standaard;
  return waarde;
}

/** Controle van een nieuw wachtwoord vóór het naar de server gaat. Geeft een melding of null. */
export function controleerNieuwWachtwoord(wachtwoord: string, herhaling: string): { veld: 'nieuw' | 'herhaal'; melding: string } | null {
  if (wachtwoord.length === 0) return { veld: 'nieuw', melding: 'Vul een nieuw wachtwoord in.' };
  if (wachtwoord.length < MIN_WACHTWOORD) {
    return { veld: 'nieuw', melding: `Het wachtwoord is te kort: minimaal ${MIN_WACHTWOORD} tekens (nu ${wachtwoord.length}).` };
  }
  if (wachtwoord !== herhaling) return { veld: 'herhaal', melding: 'De twee wachtwoorden zijn niet gelijk.' };
  return null;
}
