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
  /**
   * Unità spuntate A MANO. Servono solo per le attività che l'app non può
   * dimostrare da sola (la presentazione alla giuria, per esempio): tutto il
   * resto si deduce dalle prove reali — vedi src/lib/progresso.ts.
   */
  unitsDone: string[];
  /** Schermate aperte almeno una volta: per le pagine che si leggono e basta. */
  pagesVisited: string[];
  /** Esercizi risolti correttamente. */
  eserciziRisolti: string[];
  /** Tipi di mutazione ottenuti nel laboratorio. */
  mutazioniOttenute: string[];
  /** true quando il dossier è stato esportato almeno una volta. */
  dossierEsportato: boolean;
  /**
   * Quante volte la squadra ha premuto "scambiamoci i ruoli". L'app propone la
   * rotazione, la squadra può correggerla: vedi src/lib/ruoli.ts.
   */
  ruoliScambi: number;
}

function loadCustom(): Case | null {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Case;
    // Un caso custom valido deve avere id, sequences (array) e protein.uniprot.
    if (
      !c ||
      typeof c !== 'object' ||
      typeof c.id !== 'string' ||
      !Array.isArray(c.sequences) ||
      !c.protein ||
      typeof c.protein.uniprot !== 'string'
    ) {
      return null;
    }
    return c;
  } catch {
    return null;
  }
}

function loadProgress(): Progress {
  const empty: Progress = {
    quizPassed: [],
    challengesDone: [],
    unitsDone: [],
    pagesVisited: [],
    eserciziRisolti: [],
    mutazioniOttenute: [],
    dossierEsportato: false,
    ruoliScambi: 0,
  };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      quizPassed: p.quizPassed ?? [],
      challengesDone: p.challengesDone ?? [],
      unitsDone: p.unitsDone ?? [],
      pagesVisited: p.pagesVisited ?? [],
      eserciziRisolti: p.eserciziRisolti ?? [],
      mutazioniOttenute: p.mutazioniOttenute ?? [],
      dossierEsportato: p.dossierEsportato ?? false,
      ruoliScambi: p.ruoliScambi ?? 0,
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
  segna: (campo: 'pagesVisited' | 'eserciziRisolti' | 'mutazioniOttenute', id: string) => void;
  segnaEsportato: () => void;
  /** Ruota di uno l'assegnazione dei ruoli proposta dall'app. */
  scambiaRuoli: () => void;
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
      setDossier((d) => {
        const caseId = entry.caseId ?? d.caseId ?? undefined;
        // Protezione contro i doppi clic: una voce identica (stesso caso, stesso
        // tipo, stesso testo) non va aggiunta due volte.
        const duplicata = d.entries.some(
          (e) =>
            e.caseId === caseId &&
            e.kind === entry.kind &&
            e.title === entry.title &&
            e.body === entry.body,
        );
        if (duplicata) return d;
        return {
          ...d,
          // La voce viene marcata con il caso corrente (per lo Stepper per-caso).
          entries: [...d.entries, makeEntry({ caseId, ...entry })],
        };
      });
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setDossier((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  }, []);

  /**
   * Azzera il dossier. Cancella ANCHE nome squadra e componenti: su un PC
   * condiviso in aula informatica la classe successiva non deve trovarsi i nomi
   * dei compagni precedenti già scritti (e poi nel proprio dossier esportato).
   */
  const resetDossier = useCallback(() => {
    setDossier((d) => ({ ...emptyDossier(), caseId: d.caseId }));
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

  /** Registra un fatto avvenuto: è così che le spunte si accendono da sole. */
  const segna = useCallback(
    (campo: 'pagesVisited' | 'eserciziRisolti' | 'mutazioniOttenute', id: string) => {
      setProgress((p) =>
        p[campo].includes(id) ? p : { ...p, [campo]: [...p[campo], id] },
      );
    },
    [],
  );

  const scambiaRuoli = useCallback(() => {
    setProgress((p) => ({ ...p, ruoliScambi: p.ruoliScambi + 1 }));
  }, []);

  const segnaEsportato = useCallback(() => {
    setProgress((p) => (p.dossierEsportato ? p : { ...p, dossierEsportato: true }));
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
      segna,
      segnaEsportato,
      scambiaRuoli,
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
      segna,
      segnaEsportato,
      scambiaRuoli,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve stare dentro <AppStoreProvider>');
  return ctx;
}
