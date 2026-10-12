import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Demo-schakelaar voor de betaalmuur: "Bekijk als Bezoeker | Lid".
// Er is geen echte login; de keuze staat alleen in localStorage van deze browser.

export type Rol = 'bezoeker' | 'lid';

const OPSLAGSLEUTEL = 'afvalplatform-rol';

function leesRol(): Rol {
  try {
    return localStorage.getItem(OPSLAGSLEUTEL) === 'lid' ? 'lid' : 'bezoeker';
  } catch {
    return 'bezoeker';
  }
}

interface RolWaarde {
  rol: Rol;
  isLid: boolean;
  zetRol: (rol: Rol) => void;
}

const RolCtx = createContext<RolWaarde | null>(null);

export function RolProvider({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol>(leesRol);

  const zetRol = useCallback((nieuw: Rol) => {
    setRol(nieuw);
    try {
      localStorage.setItem(OPSLAGSLEUTEL, nieuw);
    } catch {
      // Opslaan mislukt (privévenster of geblokkeerde opslag): de keuze geldt dan alleen voor deze sessie.
    }
  }, []);

  return <RolCtx.Provider value={{ rol, isLid: rol === 'lid', zetRol }}>{children}</RolCtx.Provider>;
}

export function useRol(): RolWaarde {
  const waarde = useContext(RolCtx);
  if (!waarde) throw new Error('useRol moet binnen <RolProvider> gebruikt worden');
  return waarde;
}
