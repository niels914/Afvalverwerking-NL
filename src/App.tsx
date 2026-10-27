import { lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { NietGevonden } from './pages/NietGevonden';
import { navigatie, platform } from './data/site';

// Elke pagina behalve de homepage laadt pas als je hem opent.
const Restafvalkaart = lazy(() => import('./pages/Restafvalkaart'));
const Nieuws = lazy(() => import('./pages/Nieuws').then((m) => ({ default: m.Nieuws })));
const Kennisbank = lazy(() => import('./pages/Kennisbank').then((m) => ({ default: m.Kennisbank })));
const Tools = lazy(() => import('./pages/Tools').then((m) => ({ default: m.Tools })));
const Aanbestedingstool = lazy(() => import('./pages/tools/Aanbestedingstool').then((m) => ({ default: m.Aanbestedingstool })));
const Indexcalculator = lazy(() => import('./pages/tools/Indexcalculator').then((m) => ({ default: m.Indexcalculator })));
const Co2Heffingenscan = lazy(() => import('./pages/tools/Co2Heffingenscan').then((m) => ({ default: m.Co2Heffingenscan })));
const Bodemassencalculator = lazy(() => import('./pages/tools/Bodemassencalculator').then((m) => ({ default: m.Bodemassencalculator })));
const PmdRekenmodel = lazy(() => import('./pages/tools/PmdRekenmodel').then((m) => ({ default: m.PmdRekenmodel })));
const Aanbestedingsarchief = lazy(() => import('./pages/Aanbestedingsarchief').then((m) => ({ default: m.Aanbestedingsarchief })));
const Lidmaatschap = lazy(() => import('./pages/Lidmaatschap').then((m) => ({ default: m.Lidmaatschap })));
const Over = lazy(() => import('./pages/Over').then((m) => ({ default: m.Over })));
const Aanmelden = lazy(() => import('./pages/Aanmelden').then((m) => ({ default: m.Aanmelden })));
const Inloggen = lazy(() => import('./pages/Inloggen').then((m) => ({ default: m.Inloggen })));
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })));
const AlgemeneVoorwaarden = lazy(() => import('./pages/juridisch/AlgemeneVoorwaarden').then((m) => ({ default: m.AlgemeneVoorwaarden })));
const Privacy = lazy(() => import('./pages/juridisch/Privacy').then((m) => ({ default: m.Privacy })));
const Cookies = lazy(() => import('./pages/juridisch/Cookies').then((m) => ({ default: m.Cookies })));
const Toegankelijkheid = lazy(() => import('./pages/juridisch/Toegankelijkheid').then((m) => ({ default: m.Toegankelijkheid })));
const Disclaimer = lazy(() => import('./pages/juridisch/Disclaimer').then((m) => ({ default: m.Disclaimer })));

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
          <Route path="restafvalkaart" element={<Restafvalkaart />} />
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
