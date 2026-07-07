import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home } from './modules/Home';
import { ReadDna } from './modules/ReadDna';
import { Compare } from './modules/Compare';
import { Protein } from './modules/Protein';
import { DossierView } from './modules/DossierView';
import { Libera } from './modules/Libera';
import { Mutazioni } from './modules/Mutazioni';
import { Squadra } from './modules/Squadra';
import { Programma } from './modules/Programma';
import { Teoria } from './modules/Teoria';
import { Quiz } from './modules/Quiz';
import { Valutazione } from './modules/Valutazione';

export type PageId =
  | 'programma'
  | 'squadra'
  | 'home'
  | 'dna'
  | 'compare'
  | 'protein'
  | 'libera'
  | 'mutazioni'
  | 'teoria'
  | 'quiz'
  | 'dossier'
  | 'valutazione';

const VALID: PageId[] = [
  'programma',
  'squadra',
  'home',
  'dna',
  'compare',
  'protein',
  'libera',
  'mutazioni',
  'teoria',
  'quiz',
  'dossier',
  'valutazione',
];

function pageFromHash(): PageId {
  const h = (location.hash || '').replace('#', '') as PageId;
  return VALID.includes(h) ? h : 'home';
}

export function App() {
  const [page, setPage] = useState<PageId>(() => pageFromHash());
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (p: PageId) => {
    setPage(p);
    history.replaceState(null, '', `#${p}`);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="md:hidden fixed top-3.5 left-3.5 z-[60] w-11 h-11 rounded-lg bg-ink text-paper flex items-center justify-center text-xl"
        aria-label="Menu"
      >
        ☰
      </button>

      <Sidebar
        page={page}
        onNavigate={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <main className="md:ml-[290px] min-h-screen">
        <div className="max-w-[880px] px-6 md:px-16 py-16 md:py-16">
          {page === 'programma' && <Programma onNavigate={navigate} />}
          {page === 'squadra' && <Squadra onNavigate={navigate} />}
          {page === 'home' && <Home onNavigate={navigate} />}
          {page === 'dna' && <ReadDna onNavigate={navigate} />}
          {page === 'compare' && <Compare onNavigate={navigate} />}
          {page === 'protein' && <Protein onNavigate={navigate} />}
          {page === 'libera' && <Libera onNavigate={navigate} />}
          {page === 'mutazioni' && <Mutazioni onNavigate={navigate} />}
          {page === 'teoria' && <Teoria onNavigate={navigate} />}
          {page === 'quiz' && <Quiz onNavigate={navigate} />}
          {page === 'dossier' && <DossierView onNavigate={navigate} />}
          {page === 'valutazione' && <Valutazione onNavigate={navigate} />}
        </div>
      </main>
    </div>
  );
}
