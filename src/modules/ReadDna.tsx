import { useMemo, useState } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import {
  PageHeader,
  Sub,
  AddToDossierButton,
  Stat,
  Stepper,
  HowTo,
  Esercizio,
  ProjectWork,
  ProssimoPasso,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import {
  AA_NAMES,
  cleanDna,
  gcContent,
  qualityChecks,
  toCodons,
  translate,
  translateCodon,
} from '../lib/dna';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';
import { teamWritingContext } from '../lib/teamContext';

export function ReadDna({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, addEntry, dossier } = useStore();
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState(0);

  const seq = currentCase?.sequences[selected] ?? currentCase?.sequences[0];
  const dna = seq ? cleanDna(seq.dna) : '';

  const codons = useMemo(() => toCodons(dna), [dna]);
  const protein = useMemo(() => translate(dna), [dna]);
  const gc = useMemo(() => gcContent(dna), [dna]);
  const quality = useMemo(() => qualityChecks(dna), [dna]);

  if (!currentCase) {
    return <NoCase onNavigate={onNavigate} />;
  }
  if (!seq) {
    return (
      <div className="fade-up">
        <Stepper current="dna" onNavigate={onNavigate} />
        <PageHeader eyebrow="Modulo 3 · Leggere il DNA" title="Nessuna sequenza da leggere" />
        <p className="text-[15px]">
          Questa indagine non ha sequenze di DNA da leggere (può capitare in modalità
          libera o con una proteina singola).{' '}
          <button
            onClick={() => onNavigate('protein')}
            className="text-accent font-medium hover:underline"
          >
            Vai direttamente alla proteina 3D
          </button>
          .
        </p>
      </div>
    );
  }

  const allGood = quality.every((q) => q.ok);

  const aiContext = [
    SCREEN_BRIEFINGS.dna,
    teamWritingContext(dossier, currentCase?.id, draft),
    `Caso: ${currentCase.title}`,
    `Domanda biologica: ${currentCase.question}`,
    `Sequenza scelta: ${seq.label}`,
    `DNA (${dna.length} basi): ${dna}`,
    `Contenuto GC: ${gc}%`,
    `Proteina tradotta (codice a una lettera): ${protein}`,
    `Controllo qualità: ${quality
      .map((q) => `${q.label}=${q.ok ? 'ok' : 'attenzione'}`)
      .join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="fade-up">
      <Stepper current="dna" onNavigate={onNavigate} />
      <PageHeader
        eyebrow="Modulo 3 · Leggere il DNA"
        title={
          <>
            Cosa c'è <em className="text-accent not-italic italic">scritto</em> nel gene
          </>
        }
        dek="Scegli una sequenza del caso, guardala in modo leggibile e falla spiegare al tutor. Nessun file da capire, nessun upload."
      />

      <HowTo
        steps={[
          'Scegli quale sequenza guardare (i pulsanti qui sotto).',
          'Controlla che il dato sia buono: gli indicatori devono essere verdi.',
          'Leggila codone per codone e chiedi al tutor cosa significa.',
          'Quando hai capito, premi «Aggiungi al dossier».',
        ]}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {currentCase.sequences.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setSelected(i)}
            className={`rounded-full px-4 py-1.5 text-[13px] border transition ${
              i === selected
                ? 'bg-ink text-paper border-ink'
                : 'bg-white/40 text-ink-light border-rule hover:border-ink-muted'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6 border-t border-rule pt-4 mb-2">
        <Stat value={`${dna.length}`} label="basi" />
        <Stat value={`${codons.length}`} label="codoni" />
        <Stat value={`${gc}%`} label="contenuto GC" />
        <Stat value={`${protein.replace(/\*/g, '').length}`} label="amminoacidi" />
      </div>

      <Sub>Prima di tutto: il dato è buono?</Sub>
      <p className="text-[14px] mb-3">
        In scienza non ci si fida di un dato prima di averlo verificato. Ecco un
        controllo qualità veloce della sequenza — verde se va bene, rosso se c'è
        qualcosa da guardare.
      </p>
      <div className="grid sm:grid-cols-2 gap-2.5 mb-1">
        {quality.map((q) => (
          <div
            key={q.label}
            className="flex items-start gap-2.5 rounded-lg border border-rule bg-white/40 px-3 py-2.5"
          >
            <span
              className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                background: q.ok ? 'var(--color-accent-2)' : 'var(--color-accent)',
              }}
            >
              {q.ok ? '✓' : '!'}
            </span>
            <div>
              <div className="text-[13.5px] font-medium text-ink">{q.label}</div>
              <div className="text-[12.5px] text-ink-muted leading-snug">
                {q.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[12.5px] text-ink-muted mb-1">
        {allGood
          ? '→ Tutti verdi: possiamo fidarci di questa sequenza e proseguire.'
          : '→ Qualche indicatore è rosso: chiedi al tutor cosa comporta prima di proseguire.'}
      </p>

      <Sub>La sequenza, codone per codone</Sub>
      <p className="text-[14px] mb-3">
        Ogni tripletta di basi (un <strong>codone</strong>) codifica un amminoacido.
        Sotto ogni codone c'è la lettera dell'amminoacido corrispondente.
      </p>

      <div className="seq-scroll overflow-x-auto rounded-lg bg-paper-2 p-4">
        <div className="flex gap-1.5 min-w-max">
          {codons.map((codon, i) => {
            const aa = translateCodon(codon);
            const isStop = aa === '*';
            return (
              <div
                key={i}
                className="text-center codon-in"
                style={{ animationDelay: `${Math.min(i * 28, 700)}ms` }}
              >
                <div
                  className={`font-mono text-[13px] tracking-wide rounded px-1.5 py-1 ${
                    isStop ? 'bg-accent/15 text-accent' : 'bg-white/60 text-ink'
                  }`}
                  title={AA_NAMES[aa] ?? 'sconosciuto'}
                >
                  {codon}
                </div>
                <div className="font-mono text-[11px] text-ink-muted mt-1">{aa}</div>
                <div className="font-mono text-[8px] text-ink-muted/70">{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[13px] text-ink-muted mt-2">
        Proteina risultante:{' '}
        <span className="font-mono text-ink-light">{protein}</span>
      </p>

      <Esercizio
        consegna="Conta gli amminoacidi che questa sequenza produce (lo STOP non conta come amminoacido)."
        expected={String(protein.replace(/\*/g, '').length)}
        placeholder="es. 26"
        explanation={`La sequenza ha ${codons.length} codoni e produce ${protein.replace(/\*/g, '').length} amminoacidi. Ogni tripletta = un amminoacido.`}
      />

      <ProjectWork
        onDraft={setDraft}
        consegna={`Con parole vostre: cosa codifica "${seq.label}" e perché è importante? Guardate la traduzione e chiedete al tutor.`}
        onSave={(txt) =>
          addEntry({
            kind: 'dna',
            title: `Project work · Lettura di ${seq.label}`,
            body: txt,
            data: { label: seq.label, dna, gc },
          })
        }
      />

      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <AddToDossierButton
          onAdd={() =>
            addEntry({
              kind: 'dna',
              title: `Sequenza letta: ${seq.label}`,
              body: `Ho letto la sequenza "${seq.label}" (${dna.length} basi, GC ${gc}%). Controllo qualità: ${
                allGood ? 'tutti gli indicatori verdi' : 'alcuni indicatori da verificare'
              }. La proteina tradotta inizia con: ${protein.slice(0, 12)}…`,
              data: {
                label: seq.label,
                dna,
                gc,
                protein,
                qualita: quality.map((q) => ({ [q.label]: q.ok ? 'ok' : 'attenzione' })),
              },
            })
          }
        />
      </div>

      <div className="mt-6">
        <AiTutor
          title="Il tutor spiega la sequenza"
          cardine="Contate i codoni e guardate la proteina che ne esce: quante lettere di DNA servono per un solo amminoacido? E cosa succederebbe se ne togliessimo una sola dall\u2019inizio?"
          context={aiContext}
          intro={`Stai guardando "${seq.label}". Chiedimi cosa codifica questo gene, cosa cercare, o cosa significano i codoni.`}
          suggestions={[
            'Cosa fa questo gene?',
            'Cosa significa il contenuto GC?',
            'Da dove parte la lettura?',
          ]}
        />
      </div>

      <ProssimoPasso
        fatto="Avete letto il gene codone per codone."
        ora="Avete visto la forma, il confronto e la lettura: è il momento di mettere insieme la vostra scoperta."
        azione="Vai al dossier"
        onGo={() => onNavigate('dossier')}
        alternativa={{ testo: 'prova a mutare il DNA', onGo: () => onNavigate('mutazioni') }}
      />
    </div>
  );
}

function NoCase({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  return (
    <div className="fade-up">
      <PageHeader eyebrow="Modulo 3" title="Prima scegli un'indagine" />
      <p className="text-[15px]">
        Non hai ancora scelto un caso da indagare.{' '}
        <button
          onClick={() => onNavigate('home')}
          className="text-accent font-medium hover:underline"
        >
          Torna all'inizio
        </button>{' '}
        e scegline uno.
      </p>
    </div>
  );
}
