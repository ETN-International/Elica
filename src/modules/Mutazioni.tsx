import { useEffect, useMemo, useState } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import {
  PageHeader,
  Sub,
  Note,
  HowTo,
  AddToDossierButton,
  ProjectWork,
  ProssimoPasso,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import { cleanDna } from '../lib/dna';
import {
  applyMutation,
  classifyMutation,
  CATEGORY_STYLE,
  type MutationOp,
} from '../lib/mutation';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';

const SAMPLE = 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACT';

export function Mutazioni({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, addEntry } = useStore();

  // Sequenze disponibili: quelle del caso corrente, o un campione di partenza.
  const available =
    currentCase && currentCase.sequences.length > 0
      ? currentCase.sequences
      : [{ label: 'Sequenza di esempio (beta-globina)', dna: SAMPLE }];

  const [sourceIdx, setSourceIdx] = useState(0);
  const original = cleanDna(available[Math.min(sourceIdx, available.length - 1)].dna);
  const [mutated, setMutated] = useState(original);
  const [op, setOp] = useState<MutationOp>('sostituisci');

  // Se cambia la sequenza sorgente, riparti da capo.
  const [lastSource, setLastSource] = useState(original);
  if (original !== lastSource) {
    setLastSource(original);
    setMutated(original);
  }

  const effect = useMemo(
    () => classifyMutation(original, mutated),
    [original, mutated],
  );
  const style = CATEGORY_STYLE[effect.category];

  // Obiettivo dell'esercizio: ottenere ogni tipo di mutazione almeno una volta.
  const [achieved, setAchieved] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (effect.category !== 'nessuna') {
      setAchieved((prev) => {
        if (prev.has(effect.category)) return prev;
        const next = new Set(prev);
        next.add(effect.category);
        return next;
      });
    }
  }, [effect.category]);
  const targets: { id: string; label: string }[] = [
    { id: 'silente', label: 'Silente' },
    { id: 'missenso', label: 'Missenso' },
    { id: 'nonsenso', label: 'Nonsenso' },
    { id: 'frameshift', label: 'Frameshift' },
    { id: 'inframe-indel', label: 'Indel in-frame' },
  ];

  function clickBase(i: number) {
    setMutated((m) => applyMutation(m, i, op));
  }

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Laboratorio · Mutazioni"
        title={
          <>
            Muta il <em className="text-accent not-italic italic">DNA</em>, vedi l'effetto
          </>
        }
        dek="Cambia, aggiungi o togli una base e guarda cosa succede alla proteina. Alcune mutazioni non cambiano nulla, altre la stravolgono."
      />

      <HowTo
        steps={[
          'Scegli il tipo di modifica: sostituisci, inserisci o elimina una base.',
          'Clicca su una base della sequenza per applicarla.',
          'Guarda sotto: la proteina cambia? Di che tipo è la mutazione?',
          'Chiedi al tutor perché, e salva la scoperta nel dossier.',
        ]}
      />

      {available.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {available.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSourceIdx(i)}
              className={`rounded-full px-4 py-1.5 text-[13px] border transition ${
                i === sourceIdx
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-white/40 text-ink-light border-rule hover:border-ink-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <Sub>1 · Scegli la modifica</Sub>
      <div className="flex flex-wrap gap-2 items-center">
        {(
          [
            ['sostituisci', 'Sostituisci base'],
            ['inserisci', 'Inserisci base'],
            ['elimina', 'Elimina base'],
          ] as [MutationOp, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setOp(id)}
            className={`rounded-lg px-4 py-2 text-sm border transition ${
              op === id
                ? 'bg-accent text-white border-accent'
                : 'bg-white/40 text-ink-light border-rule hover:border-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setMutated(original)}
          className="ml-1 rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink border border-transparent hover:border-rule transition"
        >
          ↺ Ripristina
        </button>
      </div>
      <p className="text-[12.5px] text-ink-muted mt-2">
        {op === 'sostituisci' && 'Clicca una base: cambia in A → T → G → C.'}
        {op === 'inserisci' && 'Clicca una base: ne inserisce una nuova prima di essa.'}
        {op === 'elimina' && 'Clicca una base: la rimuove dalla sequenza.'}
      </p>

      <Sub>2 · La sequenza (clicca le basi)</Sub>
      <div className="seq-scroll overflow-x-auto rounded-lg bg-paper-2 p-4">
        <div className="flex flex-wrap gap-1 min-w-max">
          {mutated.split('').map((base, i) => {
            const changed = original[i] !== base;
            return (
              <button
                key={i}
                onClick={() => clickBase(i)}
                className={`font-mono text-[14px] w-7 h-8 rounded transition ${
                  changed
                    ? 'bg-accent text-white'
                    : 'bg-white/70 text-ink hover:bg-white'
                }`}
                title={`Posizione ${i + 1}`}
              >
                {base}
              </button>
            );
          })}
        </div>
      </div>

      <Sub>3 · L'effetto sulla proteina</Sub>
      <div className="rounded-xl border border-rule p-5 bg-white/30">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="font-mono text-[10px] tracking-[.14em] uppercase px-3 py-1 rounded-full text-white"
            style={{ background: style.color }}
          >
            {style.label}
          </span>
          {effect.firstChangedCodon && (
            <span className="text-[13px] text-ink-muted">
              primo cambiamento al codone {effect.firstChangedCodon}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <ProteinRow label="Originale" seq={effect.originalProtein} ref_={effect.originalProtein} />
          <ProteinRow label="Mutata" seq={effect.mutatedProtein} ref_={effect.originalProtein} />
        </div>

        <p className="text-[14px] text-ink-light mt-3">{effect.note}</p>
      </div>

      <Sub>Esercizio · ottieni ogni tipo di mutazione</Sub>
      <p className="text-[14px] mb-3">
        Obiettivo della squadra: mutando il DNA qui sopra, provoca almeno una volta ogni
        tipo di mutazione. Si spuntano da soli quando ci riesci.
      </p>
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => {
          const done = achieved.has(t.id);
          return (
            <span
              key={t.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                done
                  ? 'border-accent-2/50 bg-[rgba(26,107,82,.1)] text-accent-2'
                  : 'border-rule bg-white/40 text-ink-muted'
              }`}
            >
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: done ? 'var(--color-accent-2)' : 'var(--color-rule)' }}
              >
                {done ? '✓' : ''}
              </span>
              {t.label}
            </span>
          );
        })}
      </div>
      {achieved.size === targets.length && (
        <p className="text-[13.5px] text-accent-2 mt-2">
          ✓ Ottimo! Hai ottenuto tutti e {targets.length} i tipi di mutazione.
        </p>
      )}

      <ProjectWork
        consegna="Qual è la mutazione più dannosa che siete riusciti a creare, e perché? Spiegate l'effetto sulla proteina."
        onSave={(txt) =>
          addEntry({
            kind: 'confronto',
            title: 'Project work · La mutazione più dannosa',
            body: txt,
          })
        }
      />

      <div className="mt-4">
        <AddToDossierButton
          label="Aggiungi la mutazione al dossier"
          onAdd={() =>
            addEntry({
              kind: 'confronto',
              title: `Mutazione: ${style.label}`,
              body: `Partendo da "${available[sourceIdx].label}" ho ottenuto una mutazione ${style.label.toLowerCase()}. Proteina originale: ${effect.originalProtein}. Proteina mutata: ${effect.mutatedProtein}.`,
              data: {
                categoria: effect.category,
                originale: effect.originalProtein,
                mutata: effect.mutatedProtein,
              },
            })
          }
        />
      </div>

      <Note label="Onestà scientifica" tone="amber">
        Qui calcoliamo l'effetto sulla <em>sequenza</em> della proteina, che è esatto. Non
        ricalcoliamo la struttura 3D di una proteina inventata: predire una struttura è
        compito di AlphaFold, non nostro. Un amminoacido diverso <em>può</em> cambiare la
        forma — il tutor ti spiega quando e perché.
      </Note>

      <div className="mt-6">
        <AiTutor
          title="Il tutor spiega la mutazione"
          context={[
            SCREEN_BRIEFINGS.mutazioni,
            `Sequenza di partenza: ${available[sourceIdx].label}`,
            `Tipo di mutazione ottenuta: ${style.label}`,
            `Proteina originale: ${effect.originalProtein}`,
            `Proteina mutata: ${effect.mutatedProtein}`,
            effect.firstChangedCodon
              ? `Primo codone cambiato: ${effect.firstChangedCodon}`
              : '',
            `Nota: ${effect.note}`,
          ]
            .filter(Boolean)
            .join('\n')}
          intro="Prova a mutare il DNA qui sopra. Chiedimi che differenza c'è tra una mutazione silente, missenso, nonsenso e frameshift."
          suggestions={[
            'Che differenza c\'è tra silente e missenso?',
            'Perché il frameshift è così dannoso?',
            'Questa mutazione cambia la forma della proteina?',
          ]}
        />
      </div>

      <ProssimoPasso
        fatto="Avete visto cosa succede alla proteina quando il DNA cambia."
        ora="Salvate la mutazione più interessante che avete trovato: entrerà nel racconto per la giuria."
        azione="Vai al dossier"
        onGo={() => onNavigate('dossier')}
        alternativa={{ testo: 'mettiti alla prova col quiz', onGo: () => onNavigate('quiz') }}
      />

    </div>
  );
}

/** Mostra una proteina colorando gli amminoacidi diversi dal riferimento. */
function ProteinRow({
  label,
  seq,
  ref_,
}: {
  label: string;
  seq: string;
  ref_: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-muted w-16 shrink-0 pt-1">
        {label}
      </span>
      <span className="font-mono text-[15px] leading-relaxed break-all">
        {seq.split('').map((aa, i) => {
          const diff = ref_[i] !== aa;
          const isStop = aa === '*';
          return (
            <span
              key={i}
              className={
                isStop
                  ? 'text-accent font-bold'
                  : diff
                    ? 'text-accent font-medium base-hot'
                    : 'text-ink'
              }
            >
              {aa}
            </span>
          );
        })}
      </span>
    </div>
  );
}
