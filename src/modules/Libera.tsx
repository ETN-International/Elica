import { useState } from 'react';
import type { PageId } from '../App';
import type { Case, NamedSequence } from '../types';
import { useStore } from '../store';
import { PageHeader, Sub, Note, HowTo } from '../components/ui';
import { fetchAlphaFoldModel } from '../lib/alphafold';
import { cleanDna } from '../lib/dna';

/** Qualche proteina celebre con struttura reale su AlphaFold DB, per partire. */
const SUGGESTIONS: { uniprot: string; name: string }[] = [
  { uniprot: 'P42212', name: 'GFP — proteina fluorescente verde' },
  { uniprot: 'P00698', name: 'Lisozima — uovo di gallina' },
  { uniprot: 'P02144', name: 'Mioglobina umana' },
  { uniprot: 'P69905', name: 'Emoglobina, subunità alfa' },
  { uniprot: 'P04406', name: 'Gliceraldeide-3-fosfato deidrogenasi' },
  { uniprot: 'P0DTC2', name: 'Proteina Spike (SARS-CoV-2)' },
];

export function Libera({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { startCustomCase } = useStore();

  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [uniprot, setUniprot] = useState('');
  const [proteinName, setProteinName] = useState('');
  const [seqA, setSeqA] = useState<NamedSequence>({ label: '', dna: '' });
  const [seqB, setSeqB] = useState<NamedSequence>({ label: '', dna: '' });

  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function verify() {
    const id = uniprot.trim().toUpperCase();
    if (!id) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const m = await fetchAlphaFoldModel(id);
      setProteinName(m.proteinName ?? id);
      setVerifyMsg({
        ok: true,
        text: `Trovata: ${m.proteinName ?? id}${m.organism ? ` · ${m.organism}` : ''}${
          m.sequenceLength ? ` · ${m.sequenceLength} amminoacidi` : ''
        }`,
      });
    } catch (e) {
      setVerifyMsg({ ok: false, text: String(e instanceof Error ? e.message : e) });
    } finally {
      setVerifying(false);
    }
  }

  function start() {
    const id = uniprot.trim().toUpperCase();
    const sequences: NamedSequence[] = [];
    if (seqA.dna.trim() && cleanDna(seqA.dna).length >= 3) {
      sequences.push({ label: seqA.label.trim() || 'Sequenza A', dna: cleanDna(seqA.dna) });
    }
    if (seqB.dna.trim() && cleanDna(seqB.dna).length >= 3) {
      sequences.push({ label: seqB.label.trim() || 'Sequenza B', dna: cleanDna(seqB.dna) });
    }
    const c: Case = {
      id: `custom_${id}_${Date.now().toString(36)}`,
      title: title.trim() || `Indagine su ${proteinName || id}`,
      question: question.trim() || `Cosa possiamo scoprire su ${proteinName || id}?`,
      intro:
        "Indagine libera: la squadra ha scelto la propria proteina. La struttura 3D è vera (AlphaFold DB); le sequenze, se inserite, le confronta l'algoritmo.",
      sequences,
      protein: { uniprot: id, name: proteinName || id },
      custom: true,
      provenance: 'Indagine creata dalla squadra in modalità libera.',
    };
    startCustomCase(c);
    // Mobilità: la prima cosa è sempre la forma 3D.
    onNavigate('protein');
  }

  const canStart = uniprot.trim().length >= 4;

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Laboratorio · Modalità libera"
        title={
          <>
            Crea la tua <em className="text-accent not-italic italic">indagine</em>
          </>
        }
        dek="Nessun caso pronto: scegliete voi la proteina da studiare. L'app scarica la struttura 3D vera e vi fa usare gli stessi tre moduli."
      />

      <HowTo
        steps={[
          'Scegli una proteina: scrivi il suo UniProt ID (o parti da un suggerimento).',
          'Premi «Verifica» per controllare che esista su AlphaFold DB.',
          '(Facoltativo) incolla due sequenze di DNA da confrontare.',
          'Avvia l\'indagine: userai i moduli come per i casi pronti.',
        ]}
      />

      <Sub>1 · La proteina</Sub>
      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.uniprot}
            onClick={() => {
              setUniprot(s.uniprot);
              setProteinName(s.name);
              setVerifyMsg(null);
            }}
            className="rounded-full border border-rule bg-white/40 px-3 py-1.5 text-[12.5px] text-ink-light hover:border-ink-muted transition"
            title={s.uniprot}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="font-mono text-[10px] tracking-[.13em] uppercase text-accent">
            UniProt ID
          </label>
          <input
            value={uniprot}
            onChange={(e) => {
              setUniprot(e.target.value);
              setVerifyMsg(null);
            }}
            placeholder="es. P42212"
            className="mt-1 block w-44 rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={verify}
          disabled={verifying || uniprot.trim().length < 4}
          className="rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 transition"
        >
          {verifying ? 'Verifico…' : 'Verifica'}
        </button>
      </div>
      {verifyMsg && (
        <div
          className="mt-2 text-[13.5px] rounded-md px-3 py-2"
          style={{
            background: verifyMsg.ok ? 'rgba(26,107,82,.1)' : 'rgba(200,66,10,.08)',
            color: verifyMsg.ok ? 'var(--color-accent-2)' : 'var(--color-accent)',
          }}
        >
          {verifyMsg.ok ? '✓ ' : '✗ '}
          {verifyMsg.text}
        </div>
      )}
      <p className="text-[12.5px] text-ink-muted mt-2">
        Non conosci l'ID? Cercalo su{' '}
        <span className="font-mono">uniprot.org</span> o parti da un suggerimento qui
        sopra.
      </p>

      <Sub>2 · La domanda (facoltativa)</Sub>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titolo dell'indagine"
        className="w-full mb-2 rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
      />
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        placeholder="La domanda biologica che volete indagare…"
        className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
      />

      <Sub>3 · Le sequenze da confrontare (facoltative)</Sub>
      <p className="text-[13px] text-ink-muted mb-2">
        Se incollate due sequenze di DNA, potrete usare anche il Modulo 2 (confronto).
        Altrimenti andrete diritti alla proteina 3D.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { s: seqA, set: setSeqA, ph: 'Prima sequenza' },
          { s: seqB, set: setSeqB, ph: 'Seconda sequenza' },
        ].map((row, i) => (
          <div key={i} className="rounded-lg border border-rule p-3 bg-white/30">
            <input
              value={row.s.label}
              onChange={(e) => row.set({ ...row.s, label: e.target.value })}
              placeholder={`Etichetta (${row.ph})`}
              className="w-full mb-2 rounded-md border border-rule bg-white/60 px-2.5 py-1.5 text-[13px] text-ink focus:outline-none focus:border-accent"
            />
            <textarea
              value={row.s.dna}
              onChange={(e) => row.set({ ...row.s, dna: e.target.value })}
              rows={3}
              maxLength={3200}
              aria-label={`Sequenza di DNA — ${row.ph}`}
              placeholder="ATGC…"
              className="w-full rounded-md border border-rule bg-white/60 px-2.5 py-1.5 text-[12px] font-mono text-ink focus:outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={start}
          disabled={!canStart}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition ${
            canStart ? 'bg-accent hover:opacity-90 cta-pulse' : 'bg-ink-muted opacity-40'
          }`}
        >
          Avvia l'indagine libera →
        </button>
        {!canStart && (
          <span className="ml-3 text-[13px] text-ink-muted">
            Inserisci prima un UniProt ID valido.
          </span>
        )}
      </div>

      <Note label="Resta tutto vero">
        Anche in modalità libera vale la regola d'oro: la struttura 3D viene da AlphaFold
        DB, il confronto da un algoritmo reale. L'AI spiega e guida, non inventa dati.
      </Note>
    </div>
  );
}
