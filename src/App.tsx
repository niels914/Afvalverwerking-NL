import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Nieuws } from './pages/Nieuws';
import { Kennisbank } from './pages/Kennisbank';
import { Tools } from './pages/Tools';
import { Aanbestedingstool } from './pages/tools/Aanbestedingstool';
import { Indexcalculator } from './pages/tools/Indexcalculator';
import { Co2Heffingenscan } from './pages/tools/Co2Heffingenscan';
import { Bodemassencalculator } from './pages/tools/Bodemassencalculator';
import { PmdRekenmodel } from './pages/tools/PmdRekenmodel';
import { Aanbestedingsarchief } from './pages/Aanbestedingsarchief';
import { Lidmaatschap } from './pages/Lidmaatschap';
import { Over } from './pages/Over';
import { NietGevonden } from './pages/NietGevonden';
import { Aanmelden } from './pages/Aanmelden';
import { Inloggen } from './pages/Inloggen';
import { Account } from './pages/Account';
import { AlgemeneVoorwaarden } from './pages/juridisch/AlgemeneVoorwaarden';
import { Privacy } from './pages/juridisch/Privacy';
import { Cookies } from './pages/juridisch/Cookies';
import { Toegankelijkheid } from './pages/juridisch/Toegankelijkheid';
import { Disclaimer } from './pages/juridisch/Disclaimer';
import { navigatie, platform } from './data/site';

// De kaartpagina laadt Leaflet pas als je hem opent.
const Restafvalkaart = lazy(() => import('./pages/Restafvalkaart'));

/** Zet de paginatitel in het tabblad. */
function Paginatitel() {
  const { pathname } = useLocation();
  useEffect(() => {
    const item = [...navigatie].reverse().find((n) => (n.pad === '/' ? pathname === '/' : pathname.startsWith(n.pad)));
    document.title = item && item.pad !== '/' ? `${item.label} · ${platform.korteNaam}` : platform.korteNaam;
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <Paginatitel />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route
            path="restafvalkaart"
            element={
              <Suspense fallback={<p className="sectie muted">Kaart laden…</p>}>
                <Restafvalkaart />
              </Suspense>
            }
          />
          <Route path="nieuws" element={<Nieuws />} />
          <Route path="kennisbank" element={<Kennisbank />} />
          <Route path="tools" element={<Tools />} />
          <Route path="tools/aanbestedingstool" element={<Aanbestedingstool />} />
          <Route path="tools/indexcalculator" element={<Indexcalculator />} />
          <Route path="tools/co2-heffingenscan" element={<Co2Heffingenscan />} />
          <Route path="tools/bodemassencalculator" element={<Bodemassencalculator />} />
          <Route path="tools/pmd-rekenmodel" element={<PmdRekenmodel />} />
          <Route path="aanbestedingsarchief" element={<Aanbestedingsarchief />} />
          <Route path="lidmaatschap" element={<Lidmaatschap />} />
          <Route path="over-het-platform" element={<Over />} />
          <Route path="lidmaatschap/aanmelden" element={<Aanmelden />} />
          <Route path="inloggen" element={<Inloggen />} />
          <Route path="account" element={<Account />} />
          <Route path="algemene-voorwaarden" element={<AlgemeneVoorwaarden />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="cookies" element={<Cookies />} />
          <Route path="toegankelijkheid" element={<Toegankelijkheid />} />
          <Route path="disclaimer" element={<Disclaimer />} />
          <Route path="*" element={<NietGevonden />} />
        </Route>
      </Routes>
    </>
  );
}
