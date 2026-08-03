import type { PageId } from '../App';

/** Un'attività di una giornata: spuntabile e (di solito) collegata a una schermata. */
export interface DayActivity {
  id: string;
  label: string;
  /** Schermata dell'app a cui l'attività porta. */
  page?: PageId;
  /** Richiede che sia stata scelta un'indagine. */
  requiresCase?: boolean;
  /**
   * Indagine che l'attività deve selezionare prima di navigare. Serve quando il
   * piano nomina un caso preciso ("Confronta due geni (falciforme)"): senza,
   * l'attività aprirebbe qualunque caso fosse rimasto in corso.
   */
  caseId?: string;
}

/** Una giornata del percorso (6 ore): mattina, pomeriggio e output. */
export interface CourseDay {
  n: number;
  title: string;
  /** Il modulo/tema a cui appartiene la giornata. */
  focus: string;
  morning: DayActivity[];
  afternoon: DayActivity[];
  /** Il deliverable della giornata (spuntabile). */
  output: DayActivity;
}

const a = (
  id: string,
  label: string,
  page?: PageId,
  requiresCase?: boolean,
  caseId?: string,
): DayActivity => ({
  id,
  label,
  page,
  requiresCase,
  caseId,
});

/** Il percorso: 60 ore = 10 giorni × 6 ore. Mattina ~3h, pomeriggio ~3h. */
export const DAYS: CourseDay[] = [
  {
    n: 1,
    title: 'Benvenuti nel genoma',
    focus: 'Fondamenti',
    morning: [
      a('d1-m1', 'Formazione squadra e nome del team', 'squadra'),
      // Il Giorno 0 viene PRIMA di qualsiasi parola: è l'ingresso a prerequisito
      // zero. Senza questa riga l'host che segue la sidebar lo salterebbe.
      a('d1-m0', 'Giorno 0: la forma, la differenza, le parole', 'giorno0'),
      a('d1-m2', 'Panoramica del percorso', 'programma'),
    ],
    afternoon: [
      a('d1-p1', "Scegli l'indagine «Emoglobina»", 'home', false, 'emoglobina-falciforme'),
      a('d1-p2', 'Osserva la proteina 3D del caso', 'protein', true),
      // La teoria arriva DOPO il gesto, non prima: è un riferimento da aprire
      // quando serve, non una lezione introduttiva.
      a('d1-p3', 'Teoria: le parole, quando servono', 'teoria'),
      a('d1-p4', 'Quiz «Le basi»', 'quiz'),
    ],
    output: a('d1-out', 'Output: prima sequenza salvata nel dossier', 'dossier', true),
  },
  {
    n: 2,
    title: 'La forma che fa la funzione',
    focus: 'Modulo · Proteina 3D',
    morning: [
      a('d2-m1', 'Nuovo caso dal catalogo', 'home'),
      a('d2-m2', 'Proteina 3D: ruota e osserva', 'protein', true),
    ],
    afternoon: [
      a('d2-p1', 'Leggi la scheda della proteina', 'protein', true),
      a('d2-p2', 'Project work: forma e funzione', 'protein', true),
    ],
    output: a('d2-out', 'Output: proteina 3D nel dossier · badge Esploratore 3D', 'dossier', true),
  },
  {
    n: 3,
    title: 'Trova le differenze',
    focus: 'Modulo · Confrontare',
    morning: [
      a('d3-m1', 'Confronta due geni (falciforme)', 'compare', true, 'emoglobina-falciforme'),
      a('d3-m2', 'Leggi «La scoperta»', 'compare', true, 'emoglobina-falciforme'),
    ],
    afternoon: [
      a('d3-p1', 'Secondo confronto (evoluzione: uomo/ratto)', 'home'),
      a('d3-p2', 'Project work: parenti stretti o lontani?', 'compare', true),
    ],
    output: a('d3-out', 'Output: un confronto interpretato nel dossier', 'dossier', true),
  },
  {
    n: 4,
    title: 'Leggere il DNA',
    focus: 'Modulo · Leggere il DNA',
    morning: [
      a('d4-m1', 'Leggi il DNA del caso: controllo qualità', 'dna', true),
      a('d4-m2', 'Traduzione: dal DNA alla proteina', 'dna', true),
    ],
    afternoon: [
      a('d4-p1', 'Esercizio lampo: conta gli amminoacidi', 'dna', true),
      a('d4-p2', 'Project work: cosa codifica il gene', 'dna', true),
    ],
    output: a('d4-out', 'Output: una lettura completa nel dossier · badge Lettore di DNA', 'dossier', true),
  },
  {
    n: 5,
    title: 'Il potere di una mutazione',
    focus: 'Laboratorio mutazioni',
    morning: [
      a('d5-m1', 'Laboratorio mutazioni: sostituzioni', 'mutazioni'),
      a('d5-m2', 'Inserzioni e delezioni: il frameshift', 'mutazioni'),
    ],
    afternoon: [
      a('d5-p1', 'Sfide a squadre', 'quiz'),
      a('d5-p2', 'Quiz «Le mutazioni»', 'quiz'),
    ],
    output: a('d5-out', 'Output: mutazione spiegata nel dossier · badge Detective del gene', 'dossier', true),
  },
  {
    n: 6,
    title: 'Indagine completa I',
    focus: 'Casi · Malattie genetiche',
    morning: [
      a('d6-m1', 'Scegli un caso (Fibrosi cistica o Huntington)', 'home'),
      a('d6-m2', 'I tre gesti in fila: osserva 3D → confronta → leggi', 'protein', true),
    ],
    afternoon: [
      a('d6-p1', 'Costruisci il dossier del caso', 'dossier', true),
      a('d6-p2', 'Scrivi le prime conclusioni', 'dossier', true),
    ],
    output: a('d6-out', 'Output: un dossier di caso quasi completo', 'dossier', true),
  },
  {
    n: 7,
    title: 'Indagine completa II',
    focus: 'Casi · Evoluzione, enzimi, celebri',
    morning: [
      a('d7-m1', 'Secondo caso completo (Spike, GFP o Amilasi)', 'home'),
      a('d7-m2', 'Ripeti i tre gesti (dalla proteina 3D)', 'protein', true),
    ],
    afternoon: [
      a('d7-p1', 'Conclusione del dossier con il tutor', 'dossier', true),
      a('d7-p2', 'Quiz «Metodo: AI e dati veri»', 'quiz'),
    ],
    output: a('d7-out', 'Output: primo dossier finito', 'dossier', true),
  },
  {
    n: 8,
    title: 'Il vostro progetto: si parte',
    focus: 'Modalità libera',
    morning: [
      a('d8-m1', 'Scegli gene/proteina (UniProt)', 'libera'),
      a('d8-m2', 'Formula la domanda e verifica', 'libera'),
    ],
    afternoon: [
      a('d8-p1', 'Osserva la proteina del progetto in 3D', 'protein', true),
      a('d8-p2', 'Imposta il dossier di progetto', 'dossier', true),
    ],
    output: a('d8-out', 'Output: progetto impostato (domanda + primi dati)', 'dossier', true),
  },
  {
    n: 9,
    title: "Il vostro progetto: l'indagine",
    focus: 'Modalità libera',
    morning: [
      a('d9-m1', 'Proteina 3D del progetto', 'protein', true),
      a('d9-m2', 'Interpretazione con il tutor', 'protein', true),
    ],
    afternoon: [
      a('d9-p1', 'Completa il dossier di progetto', 'dossier', true),
      a('d9-p2', 'Scrivi la conclusione', 'dossier', true),
    ],
    output: a('d9-out', 'Output: dossier di progetto completo', 'dossier', true),
  },
  {
    n: 10,
    title: 'La giuria',
    focus: 'Dossier, quiz e giuria',
    morning: [
      a('d10-m1', 'Rifinisci ed esporta il dossier', 'dossier', true),
      a('d10-m2', 'Quiz finale e badge', 'valutazione'),
    ],
    afternoon: [
      a('d10-p1', 'Check con la rubrica della giuria', 'valutazione'),
      a('d10-p2', 'Presentazione alla giuria', 'valutazione'),
    ],
    output: a('d10-out', 'Output: dossier presentato · tutti i badge', 'valutazione'),
  },
];

/** Tutte le attività (mattina + pomeriggio + output) di una giornata. */
export function dayActivities(day: CourseDay): DayActivity[] {
  return [...day.morning, ...day.afternoon, day.output];
}

/** Tutte le attività del percorso. */
export const ALL_ACTIVITIES: DayActivity[] = DAYS.flatMap(dayActivities);
