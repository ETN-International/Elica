// Programma del SmartLab (60 ore) e schede di teoria.

export interface ProgramStage {
  n: string;
  title: string;
  hours: number;
  goal: string;
  activities: string[];
}

/** Il percorso da 60 ore, in sei tappe. */
export const PROGRAM: ProgramStage[] = [
  {
    n: '1',
    title: 'Avvio e teoria di base',
    hours: 6,
    goal: 'Capire cos\'è il DNA, cosa sono geni e proteine, e come funziona l\'app.',
    activities: [
      'Formazione delle squadre e nome del team',
      'Schede di teoria: DNA, gene, codone, proteina',
      'Giro di prova dell\'app su un caso semplice',
    ],
  },
  {
    n: '2',
    title: 'I tre gesti dell\'indagine',
    hours: 12,
    goal: 'Vedere la proteina in 3D, confrontare due geni e imparare a leggere il DNA.',
    activities: [
      'Modulo 1: struttura 3D da AlphaFold con Mol*',
      'Modulo 2: confronto e "la scoperta"',
      'Modulo 3: leggere il DNA con controllo qualità',
      'Primo dossier di prova',
    ],
  },
  {
    n: '3',
    title: 'Casi a difficoltà crescente',
    hours: 12,
    goal: 'Affrontare indagini più complesse su temi diversi.',
    activities: [
      'Malattie genetiche: falciforme, fibrosi cistica, Huntington',
      'Evoluzione e specie, mutazioni silenti',
      'Enzimi e difese; proteine celebri',
      'Quiz di autovalutazione dopo ogni tema',
    ],
  },
  {
    n: '4',
    title: 'Laboratorio mutazioni',
    hours: 8,
    goal: 'Capire i tipi di mutazione mutando il DNA e osservando l\'effetto.',
    activities: [
      'Sostituzioni: silente vs missenso vs nonsenso',
      'Inserzioni e delezioni: il frameshift',
      'Sfide a squadre "trova la mutazione più dannosa"',
    ],
  },
  {
    n: '5',
    title: 'Modalità libera · progetto di squadra',
    hours: 14,
    goal: 'Condurre un\'indagine autonoma su una proteina scelta dalla squadra.',
    activities: [
      'Scelta del gene/proteina e formulazione della domanda',
      'Indagine completa con i tre moduli',
      'Costruzione del dossier di progetto',
    ],
  },
  {
    n: '6',
    title: 'Dossier, quiz e giuria',
    hours: 8,
    goal: 'Consolidare, autovalutarsi e presentare il dossier alla giuria.',
    activities: [
      'Completamento del dossier e conclusione',
      'Quiz finale e sfide',
      'Autovalutazione con la rubrica e presentazione',
    ],
  },
];

export const TOTAL_HOURS = PROGRAM.reduce((s, p) => s + p.hours, 0);

export interface TheoryCard {
  id: string;
  title: string;
  short: string;
  body: string;
}

/** Schede di teoria: brevi, per un ragazzo di scuola superiore. */
export const THEORY: TheoryCard[] = [
  {
    id: 'dna',
    title: 'Il DNA',
    short: 'Il libro di istruzioni della cellula.',
    body: 'Il DNA è una lunga molecola fatta di quattro "lettere": A, T, G, C (le basi). L\'ordine delle lettere è un\'informazione, come le lettere di un libro. Ogni cellula del tuo corpo contiene la stessa copia del DNA. Un tratto di DNA che contiene le istruzioni per una proteina si chiama gene.',
  },
  {
    id: 'gene',
    title: 'Il gene',
    short: 'La ricetta di una proteina.',
    body: 'Un gene è la porzione di DNA che dice alla cellula come costruire una specifica proteina. Leggere un gene significa scoprire quale proteina produce e a cosa serve. Gli esseri viventi condividono moltissimi geni: più due specie sono imparentate, più i loro geni si somigliano.',
  },
  {
    id: 'codone',
    title: 'Codoni e codice genetico',
    short: 'Le lettere si leggono a gruppi di tre.',
    body: 'Le basi si leggono a triplette, chiamate codoni. Ogni codone corrisponde a un amminoacido (il "mattone" delle proteine). Il codone ATG segna l\'inizio; alcuni codoni dicono STOP. Il codice è ridondante: uno stesso amminoacido può essere scritto con più codoni diversi, per questo alcune mutazioni non cambiano nulla.',
  },
  {
    id: 'proteina',
    title: 'La proteina',
    short: 'Le macchine che fanno funzionare la vita.',
    body: 'Le proteine fanno quasi tutto nella cellula: trasportano ossigeno (emoglobina), digeriscono il cibo (enzimi), difendono dai batteri (lisozima). Una proteina è una catena di amminoacidi che si ripiega in una forma 3D precisa. E la forma determina la funzione: cambia la forma, cambia (o si rompe) la funzione.',
  },
  {
    id: 'mutazioni',
    title: 'Le mutazioni',
    short: 'Quando una lettera cambia.',
    body: 'Una mutazione è un cambiamento nel DNA. Può essere silente (la proteina resta uguale), missenso (un amminoacido diverso), nonsenso (uno STOP prematuro tronca la proteina) o frameshift (si aggiunge/toglie una base e tutta la lettura slitta). L\'anemia falciforme nasce da una singola mutazione missenso.',
  },
  {
    id: 'evoluzione',
    title: 'Evoluzione e conservazione',
    short: 'Le somiglianze raccontano la parentela.',
    body: 'Confrontando lo stesso gene in specie diverse si misura quanto si somigliano: geni molto simili indicano parenti stretti, geni molto diversi indicano parenti lontani. Le parti che restano uguali (conservate) di solito sono le più importanti per la funzione: la natura non le cambia perché servono.',
  },
  {
    id: 'struttura3d',
    title: 'La struttura 3D',
    short: 'Dalla sequenza alla forma.',
    body: 'Prevedere come si ripiega una proteina è un problema difficilissimo. AlphaFold (di Google DeepMind con l\'EMBL-EBI) ne ha predetto la forma per oltre 200 milioni di proteine: sono previsioni molto accurate, non misure sperimentali, e qualche proteina resta fuori. La nostra app non calcola la struttura: la scarica già pronta da AlphaFold DB e la mostra ruotabile. È lo stesso dato che usano i ricercatori.',
  },
  {
    id: 'ai-dati',
    title: 'AI e dati veri',
    short: 'Due usi diversi dell\'intelligenza artificiale.',
    body: 'L\'AI generativa (come il tutor) è bravissima a spiegare, tradurre e guidare il ragionamento — ma è un pessimo calcolatore di fatti esatti. Per i numeri e le strutture usiamo strumenti veri (algoritmi di allineamento, AlphaFold DB). Imparare a distinguere i due usi è una competenza che vale ben oltre la biologia.',
  },
];
