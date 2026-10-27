import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Lidmaatschap } from './authStatus';
import { domeinVan } from './authFouten';

// Sessiestatus voor het hele platform: wie is ingelogd en is die persoon lid?
//
// Lidmaatschap is per organisatie. Wie inlogt met een bevestigd e-mailadres op het domein van een
// actieve organisatie is lid. De database beslist dat (public.is_lid()); deze provider vraagt het alleen op.
// Let op: de betaalmuur in de browser is een weergavekeuze. Echte ledendata moet in Supabase staan,
// beschermd met RLS op public.is_lid().

export type SessieStatus = 'laden' | 'uit' | 'in';
export type LidStatus = 'laden' | 'klaar' | 'fout';

export interface AuthWaarde {
  /** 'laden' tot de opgeslagen sessie is gelezen. */
  status: SessieStatus;
  sessie: Session | null;
  email: string | null;
  domein: string;
  /** Stand van de controle op lidmaatschap (alleen zinvol als status 'in' is). */
  lidStatus: LidStatus;
  /** Uitkomst van rpc('is_lid'). False zolang niet bekend. */
  isLid: boolean;
  /** Organisatie en status uit rpc('mijn_lidmaatschap'), of null als er geen organisatie bij het domein hoort. */
  lidmaatschap: Lidmaatschap | null;
  /** True als de gebruiker binnenkwam via een link "wachtwoord vergeten". */
  herstelSessie: boolean;
  /** Vraag lidmaatschap opnieuw op (bijvoorbeeld na een fout). */
  verversLidmaatschap: () => void;
  /** Uitloggen op dit apparaat. Geeft de fout terug, of null. */
  uitloggen: () => Promise<unknown>;
}

interface LidData {
  voor: string;
  status: LidStatus;
  isLid: boolean;
  lidmaatschap: Lidmaatschap | null;
}

const AuthCtx = createContext<AuthWaarde | null>(null);

/** Na zo veel minuten in een ander tabblad controleren we het lidmaatschap opnieuw. */
const HERCONTROLE_MS = 5 * 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessieStatus>('laden');
  const [sessie, setSessie] = useState<Session | null>(null);
  const [herstelSessie, setHerstelSessie] = useState(false);
  // Uitkomst van de laatste controle, met de gebruiker voor wie die geldt.
  const [lidData, setLidData] = useState<LidData | null>(null);
  const [versie, setVersie] = useState(0);
  const laatsteControle = useRef(0);

  // Sessie volgen. Geen Supabase-aanroepen binnen de callback (kan vastlopen); die doen we in een effect.
  useEffect(() => {
    let actief = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!actief) return;
      setSessie(data.session);
      setStatus(data.session ? 'in' : 'uit');
    });
    const { data } = supabase.auth.onAuthStateChange((gebeurtenis, nieuweSessie) => {
      if (!actief) return;
      if (gebeurtenis === 'PASSWORD_RECOVERY') setHerstelSessie(true);
      if (gebeurtenis === 'SIGNED_OUT' || gebeurtenis === 'USER_UPDATED') setHerstelSessie(false);
      if (gebeurtenis === 'SIGNED_OUT') setLidData(null);
      setSessie(nieuweSessie);
      setStatus(nieuweSessie ? 'in' : 'uit');
      // Inloggen als een andere gebruiker start de controle al via gebruikerId (effect hieronder).
      // SIGNED_IN komt ook bij het laden en bij terugkeer naar het tabblad; daarop controleren we niet opnieuw,
      // anders gaan dezelfde aanvragen meerdere keren de deur uit.
      // Gewijzigde gegevens: altijd opnieuw. Ververst token (ongeveer elk uur): alleen als de laatste controle oud is.
      if (gebeurtenis === 'USER_UPDATED') setVersie((v) => v + 1);
      if (gebeurtenis === 'TOKEN_REFRESHED' && Date.now() - laatsteControle.current > HERCONTROLE_MS) setVersie((v) => v + 1);
    });
    return () => {
      actief = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const gebruikerId = sessie?.user.id ?? null;

  // Lidmaatschap opvragen bij de database. Bij een achtergrondcontrole (token ververst, tabblad weer actief)
  // blijft de vorige uitkomst zichtbaar tot de nieuwe binnen is, zodat de pagina niet knippert.
  useEffect(() => {
    if (!gebruikerId) return;
    let actief = true;
    Promise.all([supabase.rpc('is_lid'), supabase.rpc('mijn_lidmaatschap')]).then(([lid, info]) => {
      if (!actief) return;
      laatsteControle.current = Date.now();
      if (lid.error || info.error) {
        setLidData({ voor: gebruikerId, status: 'fout', isLid: false, lidmaatschap: null });
        return;
      }
      const rijen = (info.data ?? []) as Lidmaatschap[];
      setLidData({ voor: gebruikerId, status: 'klaar', isLid: lid.data === true, lidmaatschap: rijen[0] ?? null });
    });
    return () => {
      actief = false;
    };
  }, [gebruikerId, versie]);

  // Terug in dit tabblad na een tijd weg: opnieuw controleren (lidmaatschap kan intussen verlopen zijn).
  useEffect(() => {
    function zichtbaar() {
      if (document.visibilityState === 'visible' && gebruikerId && Date.now() - laatsteControle.current > HERCONTROLE_MS) {
        setVersie((v) => v + 1);
      }
    }
    document.addEventListener('visibilitychange', zichtbaar);
    return () => document.removeEventListener('visibilitychange', zichtbaar);
  }, [gebruikerId]);

  const verversLidmaatschap = useCallback(() => {
    setLidData(null);
    setVersie((v) => v + 1);
  }, []);

  const uitloggen = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    return error ?? null;
  }, []);

  const email = sessie?.user.email ?? null;
  const geldig = gebruikerId && lidData?.voor === gebruikerId ? lidData : null;
  const lidStatus: LidStatus = !gebruikerId ? 'klaar' : geldig ? geldig.status : 'laden';
  const isLid = status === 'in' && !!geldig?.isLid;
  const lidmaatschap = geldig?.lidmaatschap ?? null;
  const waarde = useMemo<AuthWaarde>(
    () => ({
      status,
      sessie,
      email,
      domein: email ? domeinVan(email) : '',
      lidStatus,
      isLid,
      lidmaatschap,
      herstelSessie,
      verversLidmaatschap,
      uitloggen,
    }),
    [status, sessie, email, lidStatus, isLid, lidmaatschap, herstelSessie, verversLidmaatschap, uitloggen],
  );

  return <AuthCtx.Provider value={waarde}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthWaarde {
  const waarde = useContext(AuthCtx);
  if (!waarde) throw new Error('useAuth moet binnen <AuthProvider> gebruikt worden');
  return waarde;
}

/** True zolang nog niet vaststaat of de bezoeker lid is (sessie lezen of lidmaatschap opvragen). */
export function isToegangOnbekend(a: Pick<AuthWaarde, 'status' | 'lidStatus'>): boolean {
  return a.status === 'laden' || (a.status === 'in' && a.lidStatus === 'laden');
}
