import type { NamedSequence } from '../types';
import { getCase } from './cases';

/**
 * Il Giorno 0 — ingresso a prerequisito zero per un'aula paneuropea che può
 * non sapere cosa sia un gene. Prima la meraviglia (una forma 3D che gira, due
 * sequenze con un punto diverso), poi la parola. I concetti emergono come nomi
 * dati a cose già maneggiate.
 *
 * Riusa il caso emoglobina/falciforme: la proteina P68871 e le due sequenze che
 * differiscono di una sola lettera (il cuore didattico "una lettera cambia tutto").
 */
const emo = getCase('emoglobina-falciforme')!;

export const GIORNO0_PROTEIN = emo.protein; // P68871
export const GIORNO0_SEQ_A: NamedSequence = emo.sequences[0];
export const GIORNO0_SEQ_B: NamedSequence = emo.sequences[1];

export type Giorno0PhaseId = 'a' | 'b' | 'c' | 'd';

export interface Giorno0Phase {
  id: Giorno0PhaseId;
  tag: string;
  name: string;
  /** La domanda cablata nell'interfaccia (la pone l'app, non l'host). */
  appSays: string;
  /**
   * La domanda-cardine di riserva: mostrata quando il tutor AI non risponde
   * (offline o non configurato). L'app resta conducente anche senza AI.
   */
  cardine: string;
}

export const GIORNO0_PHASES: Giorno0Phase[] = [
  {
    id: 'a',
    tag: 'Fase A · Apertura',
    name: 'La forma che gira, prima di ogni parola',
    appSays:
      'Girala per un minuto con il mouse. Dove ti sembra più solida e compatta? E dove invece sembra che potrebbe spezzarsi? Scrivi la tua impressione — non c\'è risposta giusta.',
    cardine:
      'Guardate la parte più compatta al centro della forma: secondo voi tiene insieme tutto il resto? E se quella parte cambiasse, pensate che la forma reggerebbe lo stesso?',
  },
  {
    id: 'b',
    tag: 'Fase B · Contatto',
    name: 'Trova le differenze',
    appSays:
      'Queste due sono quasi la stessa cosa — ma non del tutto. Cliccate il punto che secondo voi cambia. Poi ditemi: una differenza così piccola può contare molto, o è un dettaglio da niente?',
    cardine:
      'Avete trovato la lettera che cambia. Nel corpo, una differenza piccola così a volte non conta nulla e a volte cambia tutto: secondo voi, da cosa dipende?',
  },
  {
    id: 'c',
    tag: 'Fase C · Emersione',
    name: 'Ora la parola',
    appSays:
      'Adesso diamo un nome a ciò che avete toccato. Non è una lezione: sono le didascalie di quello che avete già fatto.',
    cardine:
      'Con le parole nuove: la forma è una proteina, il punto che cambiava è una mutazione, la sequenza è un gene. Quale delle tre vi incuriosisce di più?',
  },
  {
    id: 'd',
    tag: 'Fase D · Output',
    name: 'La prima riga del dossier',
    appSays:
      'Chiudete il Giorno 0 come farete ogni giornata: con qualcosa di vostro. Scrivete la vostra impressione sulla forma e la differenza che avete trovato, usando le parole nuove. È la prima riga di un racconto che crescerà.',
    cardine:
      'Provate a mettere insieme in due righe: cosa vi ha colpito della forma (proteina) e cosa avete scoperto cambiando una lettera (mutazione nel gene).',
  },
];

/** Le tre parole che emergono nella Fase C, agganciate a un gesto appena fatto. */
export const GIORNO0_WORDS: { word: string; gesture: string; meaning: string }[] = [
  {
    word: 'Proteina',
    gesture: 'la forma che avete girato',
    meaning:
      'È una delle macchine che fanno funzionare la vita: trasporta ossigeno, digerisce, difende. La sua forma decide cosa sa fare.',
  },
  {
    word: 'Mutazione',
    gesture: 'il punto che cambiava tra le due sequenze',
    meaning:
      'È un cambiamento nel DNA. A volte non conta nulla, a volte — una sola lettera — cambia tutto, come nell\'anemia falciforme.',
  },
  {
    word: 'Gene',
    gesture: 'la sequenza di lettere che avete confrontato',
    meaning:
      'È il tratto di DNA con le istruzioni per costruire quella proteina. Cambia il gene, può cambiare la forma della proteina.',
  },
];
