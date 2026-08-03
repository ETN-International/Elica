import type { AlphaFoldModel, Case } from '../types';
import { alignSequences, describeDifferences } from './alignment';
import { cleanDna, translate, AA_NAMES } from './dna';

/**
 * Azioni verificate sulla struttura 3D.
 *
 * La regola: l'app decide SEMPRE quale residuo indicare, calcolandolo dai dati
 * veri; il tutor AI può al massimo proporre un'azione per nome. Così "guarda
 * qui" non può puntare al posto sbagliato.
 *
 * Il controllo che rende tutto questo affidabile è `mappaturaValida()`: le
 * sequenze dei casi sono estratti didattici e NON sempre corrispondono alla
 * proteina di cui mostriamo la struttura. Per la fibrosi cistica, per esempio,
 * il tratto è costruito a scopo didattico e la CFTR vera inizia diversamente:
 * indicare "il residuo 8" mostrerebbe un punto qualsiasi. Invece di fidarci di
 * una lista scritta a mano, confrontiamo la traduzione dell'estratto con la
 * sequenza reale che AlphaFold ci ha restituito: se non combaciano, l'azione
 * semplicemente non viene offerta.
 */

export interface Azione3D {
  id: 'mutazione' | 'tratto' | 'gira' | 'insieme';
  /** Testo del pulsante, rivolto alla squadra. */
  label: string;
  /** Una riga che dice cosa stanno per vedere. */
  spiegazione: string;
}

/** Quanti residui iniziali devono combaciare perché ci fidiamo della mappatura. */
const MIN_CONFRONTO = 8;

/**
 * L'estratto didattico corrisponde davvero all'inizio di QUESTA proteina?
 * Se sì, il residuo N dell'estratto è il residuo N della struttura.
 */
export function mappaturaValida(caso: Case, model: AlphaFoldModel | null): boolean {
  const vera = model?.sequence;
  const prima = caso.sequences[0]?.dna;
  if (!vera || !prima) return false;
  const tradotta = translate(cleanDna(prima)).replace(/\*.*$/, '');
  if (tradotta.length < MIN_CONFRONTO) return false;
  const testa = tradotta.slice(0, Math.min(tradotta.length, 20));
  return vera.startsWith(testa);
}

/** Il residuo dove cade la mutazione, se il caso ne ha una calcolabile. */
export function residuoMutazione(
  caso: Case,
): { residuo: number; da: string; a: string } | null {
  if (caso.sequences.length < 2) return null;
  const r = alignSequences(caso.sequences[0].dna, caso.sequences[1].dna, 'A', 'B');
  const diffs = describeDifferences(r.alignedA, r.alignedB) as Array<{
    kind: string;
    codonNumber?: number;
    fromAA?: string;
    toAA?: string;
  }>;
  const sost = diffs.find(
    (d) => d.kind === 'sostituzione' && d.codonNumber && d.fromAA && d.toAA && d.fromAA !== d.toAA,
  );
  if (!sost?.codonNumber) return null;
  return {
    residuo: sost.codonNumber,
    da: AA_NAMES[sost.fromAA as string] ?? (sost.fromAA as string),
    a: AA_NAMES[sost.toAA as string] ?? (sost.toAA as string),
  };
}

/** Quanti residui della proteina copre il tratto che la squadra sta studiando. */
export function residuiDelTratto(caso: Case): number {
  const prima = caso.sequences[0]?.dna;
  if (!prima) return 0;
  return translate(cleanDna(prima)).replace(/\*.*$/, '').length;
}

/**
 * Le azioni disponibili QUI E ORA. Quelle che indicano un punto preciso
 * compaiono solo se la mappatura è verificata.
 */
export function azioniDisponibili(
  caso: Case | null,
  model: AlphaFoldModel | null,
): Azione3D[] {
  const azioni: Azione3D[] = [];
  if (!caso || !model) return azioni;

  const mappaOk = mappaturaValida(caso, model);
  const mut = mappaOk ? residuoMutazione(caso) : null;
  const tratto = mappaOk ? residuiDelTratto(caso) : 0;

  if (mut) {
    azioni.push({
      id: 'mutazione',
      label: 'Mostrami dov’è la mutazione',
      spiegazione: `Eccolo, illuminato in verde chiaro: è l’amminoacido numero ${mut.residuo}, che da ${mut.da} diventa ${mut.a}. Guardate quanto è piccolo rispetto a tutto il resto — eppure basta lui.`,
    });
  }
  if (tratto > 0 && model.sequenceLength && tratto < model.sequenceLength) {
    azioni.push({
      id: 'tratto',
      label: 'Mostrami il tratto che stiamo leggendo',
      spiegazione: `In verde chiaro c’è il tratto che state leggendo: i primi ${tratto} amminoacidi su ${model.sequenceLength}. Le lettere che avete davanti sono un pezzetto di una macchina molto più grande.`,
    });
  }
  azioni.push({
    id: 'gira',
    label: 'Falla girare',
    spiegazione: 'La struttura ruota da sola: utile per coglierne la forma d’insieme.',
  });
  azioni.push({
    id: 'insieme',
    label: 'Vista d’insieme',
    spiegazione: 'Torna a inquadrare tutta la proteina.',
  });
  return azioni;
}
