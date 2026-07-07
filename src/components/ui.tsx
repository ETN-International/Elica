import { useState, type ReactNode } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';

interface StepDef {
  id: PageId;
  n: string;
  label: string;
  done: boolean;
}

/**
 * Percorso a tappe: mostra ai ragazzi dove sono, cosa hanno già fatto (spunta
 * verde) e cosa manca. Cliccabile per spostarsi tra i moduli.
 */
export function Stepper({
  current,
  onNavigate,
}: {
  current: PageId;
  onNavigate: (p: PageId) => void;
}) {
  const { dossier } = useStore();
  const kinds = new Set(dossier.entries.map((e) => e.kind));
  const steps: StepDef[] = [
    { id: 'dna', n: '1', label: 'Leggi', done: kinds.has('dna') },
    { id: 'compare', n: '2', label: 'Confronta', done: kinds.has('confronto') },
    { id: 'protein', n: '3', label: 'Osserva 3D', done: kinds.has('proteina') },
    { id: 'dossier', n: '4', label: 'Dossier', done: kinds.has('conclusione') },
  ];

  return (
    <div className="flex items-center gap-1 mb-6 select-none">
      {steps.map((s, i) => {
        const active = s.id === current;
        return (
          <div key={s.id} className="flex items-center gap-1 flex-1 last:flex-none">
            <button
              onClick={() => onNavigate(s.id)}
              className="flex items-center gap-2 group"
              title={s.label}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-mono transition ${
                  s.done
                    ? 'bg-accent-2 text-white'
                    : active
                      ? 'bg-accent text-white here-dot'
                      : 'bg-paper-2 text-ink-muted border border-rule group-hover:border-ink-muted'
                }`}
              >
                {s.done ? '✓' : s.n}
              </span>
              <span
                className={`text-[12.5px] font-mono tracking-wide hidden sm:inline ${
                  active ? 'text-ink font-medium' : 'text-ink-muted group-hover:text-ink'
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span
                className="flex-1 h-px min-w-3"
                style={{
                  background: s.done ? 'var(--color-accent-2)' : 'var(--color-rule)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Card "Cosa fare qui": istruzioni brevi e numerate per orientare lo studente
 * appena entra in un modulo.
 */
export function HowTo({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-xl border border-accent-3/25 bg-[rgba(45,74,138,.06)] px-5 py-4 mb-6">
      <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent-3 mb-2 flex items-center gap-2">
        <span aria-hidden>👉</span> Cosa fare qui
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[14px] text-ink-light">
            <span className="font-mono text-[12px] text-accent-3 font-medium shrink-0">
              {i + 1}.
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Avviso mostrato quando un modulo è aperto senza aver scelto un caso. */
export function NoCaseNotice({
  moduleLabel,
  onNavigate,
}: {
  moduleLabel: string;
  onNavigate: (p: PageId) => void;
}) {
  return (
    <div className="fade-up">
      <PageHeader eyebrow={moduleLabel} title="Prima scegli un'indagine" />
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

/** Intestazione standard di una pagina/modulo. */
export function PageHeader({
  eyebrow,
  title,
  dek,
}: {
  eyebrow: string;
  title: ReactNode;
  dek?: string;
}) {
  return (
    <header className="mb-6">
      <div className="font-mono text-[11px] tracking-[.24em] uppercase text-accent relative pt-4">
        <span className="absolute top-0 left-0 w-9 h-0.5 bg-accent" />
        {eyebrow}
      </div>
      <h1 className="font-serif text-4xl md:text-[46px] leading-[1.06] text-ink tracking-tight mt-4">
        {title}
      </h1>
      {dek && (
        <p className="font-serif italic text-lg text-ink-muted mt-4 leading-snug">
          {dek}
        </p>
      )}
    </header>
  );
}

/** Etichetta di sezione in stile "serif". */
export function Sub({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-serif text-2xl text-ink mt-8 mb-2 tracking-tight">
      {children}
    </h2>
  );
}

/** Riquadro nota (verde = info, ambra = attenzione). */
export function Note({
  label,
  tone = 'green',
  children,
}: {
  label: string;
  tone?: 'green' | 'amber';
  children: ReactNode;
}) {
  const color = tone === 'amber' ? 'var(--color-accent)' : 'var(--color-accent-2)';
  return (
    <div
      className="bg-paper-2 rounded-r-md px-5 py-4 my-5 text-[14.5px]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span
        className="block font-mono text-[9.5px] tracking-[.16em] uppercase mb-1.5"
        style={{ color }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

/** Pulsante "aggiungi al dossier" con conferma inline. */
export function AddToDossierButton({
  onAdd,
  label = 'Aggiungi al dossier',
}: {
  onAdd: () => void;
  label?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        onAdd();
        setDone(true);
        setTimeout(() => setDone(false), 2200);
      }}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
        done
          ? 'border-accent-2/50 bg-[rgba(26,107,82,.1)] text-accent-2'
          : 'border-accent-3/40 bg-[rgba(45,74,138,.07)] text-accent-3 hover:bg-[rgba(45,74,138,.13)] cta-pulse'
      }`}
    >
      {done ? '✓ Salvato nel dossier' : `＋ ${label}`}
    </button>
  );
}

function normAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '');
}

function answerMatches(input: string, expected: string): boolean {
  const e = expected.trim();
  if (/^\d+$/.test(e)) {
    const m = input.match(/\d+/);
    return m ? m[0] === e : false;
  }
  return normAnswer(input) === normAnswer(e);
}

/**
 * Esercizio lampo: una domanda a risposta breve, verificata sui dati reali del
 * modulo. Dà pratica immediata con feedback (Team-Task).
 */
export function Esercizio({
  consegna,
  expected,
  placeholder,
  explanation,
}: {
  consegna: string;
  expected: string;
  placeholder?: string;
  explanation: string;
}) {
  const [val, setVal] = useState('');
  const [checked, setChecked] = useState(false);
  const ok = answerMatches(val, expected);

  return (
    <div className="rounded-xl border border-accent/30 bg-[rgba(200,66,10,.04)] px-5 py-4 my-5">
      <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent mb-2">
        ✎ Esercizio lampo
      </div>
      <p className="text-[14.5px] text-ink-light mb-3">{consegna}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setChecked(false);
          }}
          placeholder={placeholder ?? 'La tua risposta…'}
          className="flex-1 min-w-40 rounded-lg border border-rule bg-white/60 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
          onKeyDown={(e) => {
            if (e.key === 'Enter') setChecked(true);
          }}
        />
        <button
          onClick={() => setChecked(true)}
          disabled={!val.trim()}
          className="rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 transition"
        >
          Verifica
        </button>
      </div>
      {checked && (
        <div
          className="mt-3 text-[13.5px] rounded-md px-3 py-2"
          style={{
            background: ok ? 'rgba(26,107,82,.1)' : 'rgba(200,66,10,.08)',
            color: ok ? 'var(--color-accent-2)' : 'var(--color-accent)',
          }}
        >
          {ok ? '✓ Giusto! ' : '✗ Non ancora. '}
          {explanation}
        </div>
      )}
    </div>
  );
}

/**
 * Project work: la consegna aperta della squadra. La risposta si salva nel
 * dossier come output del modulo (Team-Task-Output).
 */
export function ProjectWork({
  consegna,
  placeholder,
  onSave,
  buttonLabel = 'Salva come output nel dossier',
}: {
  consegna: string;
  placeholder?: string;
  onSave: (text: string) => void;
  buttonLabel?: string;
}) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-xl border border-accent-3/30 bg-[rgba(45,74,138,.05)] px-5 py-4 my-5">
      <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent-3 mb-2">
        ⌦ Project work della squadra
      </div>
      <p className="text-[14.5px] text-ink-light mb-3">{consegna}</p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        rows={3}
        placeholder={placeholder ?? 'La risposta della squadra…'}
        className="w-full rounded-lg border border-rule bg-white/60 px-3 py-2 text-[14px] text-ink focus:outline-none focus:border-accent-3"
      />
      <button
        onClick={() => {
          if (!text.trim()) return;
          onSave(text.trim());
          setSaved(true);
        }}
        disabled={!text.trim()}
        className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
          saved
            ? 'border-accent-2/50 bg-[rgba(26,107,82,.1)] text-accent-2'
            : 'border-accent-3/40 bg-[rgba(45,74,138,.07)] text-accent-3 hover:bg-[rgba(45,74,138,.13)] cta-pulse'
        }`}
      >
        {saved ? '✓ Output salvato nel dossier' : `＋ ${buttonLabel}`}
      </button>
    </div>
  );
}

/** Indicatore di difficoltà a pallini (1–3). */
export function Difficulty({ level }: { level: 1 | 2 | 3 }) {
  const labels = { 1: 'Base', 2: 'Intermedio', 3: 'Avanzato' };
  return (
    <span className="inline-flex items-center gap-1.5" title={labels[level]}>
      <span className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: n <= level ? 'var(--color-accent)' : 'var(--color-rule)',
            }}
          />
        ))}
      </span>
      <span className="font-mono text-[9px] tracking-[.1em] uppercase text-ink-muted">
        {labels[level]}
      </span>
    </span>
  );
}

/** Un dato numerico messo in evidenza. */
export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="pr-5">
      <div className="font-serif text-3xl text-accent leading-none">{value}</div>
      <div className="font-mono text-[9px] tracking-[.11em] uppercase text-ink-muted mt-1.5">
        {label}
      </div>
    </div>
  );
}
