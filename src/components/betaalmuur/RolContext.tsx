import { AuthProvider, isToegangOnbekend, useAuth } from '../../lib/auth';

// Compatibele hook voor de rest van het platform. Vroeger was dit een demo-schakelaar "Bekijk als";
// nu komt alles uit de echte sessie (Supabase Auth) en isLid uit rpc('is_lid'). Zie src/lib/auth.tsx.

export type Rol = 'bezoeker' | 'ingelogd' | 'lid';

export interface RolWaarde {
  /** 'bezoeker' (niet ingelogd), 'ingelogd' (wel ingelogd, geen lid) of 'lid'. */
  rol: Rol;
  /** True als de ingelogde gebruiker via een actieve organisatie lid is. */
  isLid: boolean;
  /** True zolang sessie of lidmaatschap nog wordt gecontroleerd. */
  laden: boolean;
}

/** @deprecated Gebruik AuthProvider uit src/lib/auth.tsx. Blijft bestaan voor oude imports. */
export const RolProvider = AuthProvider;

export function useRol(): RolWaarde {
  const auth = useAuth();
  const rol: Rol = auth.isLid ? 'lid' : auth.status === 'in' ? 'ingelogd' : 'bezoeker';
  return { rol, isLid: auth.isLid, laden: isToegangOnbekend(auth) };
}
