// Quiz di autovalutazione e sfide a squadre.

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface QuizSet {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export const QUIZZES: QuizSet[] = [
  {
    id: 'basi',
    title: 'Le basi: DNA, geni, proteine',
    questions: [
      {
        question: 'Quante "lettere" (basi) diverse compongono il DNA?',
        options: ['2', '4', '20', '64'],
        correct: 1,
        explanation:
          'Le basi del DNA sono quattro: A, T, G, C. Gli amminoacidi invece sono 20.',
      },
      {
        question: 'Un codone è formato da…',
        options: ['una base', 'due basi', 'tre basi', 'una proteina intera'],
        correct: 2,
        explanation:
          'Un codone è una tripletta di basi e corrisponde a un amminoacido.',
      },
      {
        question: 'Cosa determina la funzione di una proteina?',
        options: [
          'Il suo colore',
          'La sua forma 3D',
          'La sua temperatura',
          'Il numero di geni',
        ],
        correct: 1,
        explanation:
          'La forma tridimensionale determina la funzione: la forma è la funzione.',
      },
      {
        question: 'Quale codone segna l\'inizio della lettura di un gene?',
        options: ['ATG', 'TAA', 'GGG', 'CCC'],
        correct: 0,
        explanation: 'ATG codifica la Metionina ed è il codone di inizio.',
      },
    ],
  },
  {
    id: 'mutazioni',
    title: 'Le mutazioni',
    questions: [
      {
        question: 'Una mutazione che NON cambia la proteina si dice…',
        options: ['missenso', 'nonsenso', 'silente', 'frameshift'],
        correct: 2,
        explanation:
          'È silente: il DNA cambia ma, grazie alla ridondanza del codice, l\'amminoacido resta lo stesso.',
      },
      {
        question:
          'Aggiungere una sola base nel mezzo di un gene di solito provoca…',
        options: [
          'nessun effetto',
          'una mutazione frameshift',
          'una mutazione silente',
          'un nuovo gene',
        ],
        correct: 1,
        explanation:
          'Una base in più (non multiplo di 3) fa slittare la lettura: tutti i codoni successivi cambiano (frameshift).',
      },
      {
        question: 'L\'anemia falciforme è causata da una mutazione…',
        options: ['silente', 'missenso', 'frameshift', 'nessuna delle precedenti'],
        correct: 1,
        explanation:
          'È missenso: un amminoacido (acido glutammico) è sostituito da un altro (valina).',
      },
      {
        question: 'Una mutazione nonsenso…',
        options: [
          'allunga la proteina',
          'introduce uno STOP prematuro e tronca la proteina',
          'non ha effetto',
          'raddoppia il gene',
        ],
        correct: 1,
        explanation:
          'Crea un segnale di STOP prima del dovuto: la proteina si interrompe a metà.',
      },
    ],
  },
  {
    id: 'metodo',
    title: 'Metodo: AI e dati veri',
    questions: [
      {
        question: 'Nell\'app, chi calcola la struttura 3D di una proteina?',
        options: [
          'Il tutor AI la inventa',
          'Viene scaricata già calcolata da AlphaFold DB',
          'La disegna lo studente',
          'Nessuno, è finta',
        ],
        correct: 1,
        explanation:
          'La struttura è reale e viene da AlphaFold DB. L\'AI la racconta, non la calcola.',
      },
      {
        question: 'A cosa serve il controllo qualità prima di analizzare un dato?',
        options: [
          'A colorare la sequenza',
          'A fidarsi del dato solo dopo averlo verificato',
          'A renderla più corta',
          'A tradurla in inglese',
        ],
        correct: 1,
        explanation:
          'In scienza non ci si fida di un dato prima di aver verificato che sia buono.',
      },
      {
        question: 'Perché nel dossier conta anche il "percorso" e non solo il risultato?',
        options: [
          'Per allungarlo',
          'Perché in scienza il metodo conta quanto il risultato (tracciabilità)',
          'Per riempire pagine',
          'Non conta davvero',
        ],
        correct: 1,
        explanation:
          'Un risultato scientifico deve dire quali dati e quali passi hanno portato ad esso.',
      },
    ],
  },
];

export interface Challenge {
  id: string;
  title: string;
  desc: string;
}

/** Sfide a squadre: obiettivi concreti da spuntare. */
export const CHALLENGES: Challenge[] = [
  {
    id: 'silente',
    title: 'La mutazione invisibile',
    desc: 'Nel laboratorio mutazioni, ottieni una mutazione silente (il DNA cambia ma la proteina no).',
  },
  {
    id: 'nonsenso',
    title: 'Interruzione anticipata',
    desc: 'Crea una mutazione nonsenso che tronca la proteina con uno STOP prematuro.',
  },
  {
    id: 'frameshift',
    title: 'Il grande slittamento',
    desc: 'Provoca un frameshift inserendo o togliendo una sola base e osserva quanti amminoacidi cambiano.',
  },
  {
    id: 'tre-casi',
    title: 'Investigatori completi',
    desc: 'Porta a termine tre casi di temi diversi, salvando ogni volta un elemento nel dossier.',
  },
  {
    id: 'libera',
    title: 'In autonomia',
    desc: 'Conduci un\'indagine in modalità libera su una proteina scelta dalla squadra.',
  },
];
