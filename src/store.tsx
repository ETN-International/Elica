import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Case, Dossier, DossierEntry } from './types';
import { getCase } from './data/cases';
import {
  emptyDossier,
  loadDossier,
  makeEntry,
  saveDossier,
} from './lib/dossier';

const CUSTOM_KEY = 'etn-genoma-custom-case';
const PROGRESS_KEY = 'etn-genoma-progress';

/** Avanzamento della squadra (quiz superati, sfide completate, unità svolte). */
interface Progress {
  quizPassed: string[];
  challengesDone: string[];
  /** ID delle unità di attività (del programma) spuntate come svolte. */
  unitsDone: string[];
}

function loadCustom(): Case | null {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Case) : null;
  } catch {
    return null;
  }
}

function loadProgress(): Progress {
  const empty: Progress = { quizPassed: [], challengesDone: [], unitsDone: [] };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      quizPassed: p.quizPassed ?? [],
      challengesDone: p.challengesDone ?? [],
      unitsDone: p.unitsDone ?? [],
    };
  } catch {
    return empty;
  }
}

interface AppStore {
  currentCase: Case | undefined;
  selectCase: (id: string) => void;
  /** Crea/avvia un'indagine libera con un caso costruito dalla squadra. */
  startCustomCase: (c: Case) => void;
  dossier: Dossier;
  setTeam: (team: string) => void;
  setMembers: (members: string[]) => void;
  addEntry: (entry: Omit<DossierEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  resetDossier: () => void;
  progress: Progress;
  markQuizPassed: (id: string) => void;
  toggleChallenge: (id: string) => void;
  toggleUnit: (id: string) => void;
}

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [dossier, setDossier] = useState<Dossier>(() => loadDossier());
  const [customCase, setCustomCase] = useState<Case | null>(() => loadCustom());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  useEffect(() => {
    saveDossier(dossier);
  }, [dossier]);
  useEffect(() => {
    try {
      if (customCase) localStorage.setItem(CUSTOM_KEY, JSON.stringify(customCase));
      else localStorage.removeItem(CUSTOM_KEY);
    } catch {
      /* ignora */
    }
  }, [customCase]);
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      /* ignora */
    }
  }, [progress]);

  // Il caso corrente può essere uno curato o quello personalizzato della squadra.
  const currentCase =
    getCase(dossier.caseId) ??
    (customCase && customCase.id === dossier.caseId ? customCase : undefined);

  // Scegliere un caso aggiorna solo l'indagine corrente: il dossier è
  // l'artefatto CUMULATIVO della squadra per tutto lo SmartLab e NON si azzera
  // cambiando caso (altrimenti si perderebbe il lavoro dei giorni precedenti).
  const selectCase = useCallback((id: string) => {
    setDossier((d) => (d.caseId === id ? d : { ...d, caseId: id }));
  }, []);

  const startCustomCase = useCallback((c: Case) => {
    setCustomCase(c);
    setDossier((d) => ({ ...d, caseId: c.id }));
  }, []);

  const setTeam = useCallback((team: string) => {
    setDossier((d) => ({ ...d, team }));
  }, []);

  const setMembers = useCallback((members: string[]) => {
    setDossier((d) => ({ ...d, members }));
  }, []);

  const addEntry = useCallback(
    (entry: Omit<DossierEntry, 'id' | 'createdAt'>) => {
      setDossier((d) => ({ ...d, entries: [...d.entries, makeEntry(entry)] }));
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setDossier((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  }, []);

  const resetDossier = useCallback(() => {
    setDossier((d) => ({
      ...emptyDossier(),
      team: d.team,
      members: d.members,
      caseId: d.caseId,
    }));
  }, []);

  const markQuizPassed = useCallback((id: string) => {
    setProgress((p) =>
      p.quizPassed.includes(id) ? p : { ...p, quizPassed: [...p.quizPassed, id] },
    );
  }, []);

  const toggleChallenge = useCallback((id: string) => {
    setProgress((p) => ({
      ...p,
      challengesDone: p.challengesDone.includes(id)
        ? p.challengesDone.filter((c) => c !== id)
        : [...p.challengesDone, id],
    }));
  }, []);

  const toggleUnit = useCallback((id: string) => {
    setProgress((p) => ({
      ...p,
      unitsDone: p.unitsDone.includes(id)
        ? p.unitsDone.filter((u) => u !== id)
        : [...p.unitsDone, id],
    }));
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      currentCase,
      selectCase,
      startCustomCase,
      dossier,
      setTeam,
      setMembers,
      addEntry,
      removeEntry,
      resetDossier,
      progress,
      markQuizPassed,
      toggleChallenge,
      toggleUnit,
    }),
    [
      currentCase,
      selectCase,
      startCustomCase,
      dossier,
      setTeam,
      setMembers,
      addEntry,
      removeEntry,
      resetDossier,
      progress,
      markQuizPassed,
      toggleChallenge,
      toggleUnit,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve stare dentro <AppStoreProvider>');
  return ctx;
}
