import { useMemo } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import {
  PageHeader,
  Sub,
  Note,
  Stat,
  AddToDossierButton,
  NoCaseNotice,
  Stepper,
  HowTo,
  Esercizio,
  ProjectWork,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import { alignSequences, describeDifferences, MAX_SEQ_LENGTH } from '../lib/alignment';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';

const ROW = 45; // basi per riga nella visualizzazione allineata

export function Compare({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, addEntry } = useStore();

  const a = currentCase?.sequences[0];
  const b = currentCase?.sequences[1];

  const tooLong =
    !!a && !!b && (a.dna.length > MAX_SEQ_LENGTH || b.dna.length > MAX_SEQ_LENGTH);

  const result = useMemo(() => {
    if (!a || !b || tooLong) return null;
    return alignSequences(a.dna, b.dna, a.label, b.label);
  }, [a, b, tooLong]);

  const differences = useMemo(
    () => (result ? describeDifferences(result.alignedA, result.alignedB) : []),
    [result],
  );

  if (!currentCase) {
    return <NoCaseNotice moduleLabel="Modulo 2" onNavigate={onNavigate} />;
  }
  if (tooLong) {
    return (
      <div className="fade-up">
        <Stepper current="compare" onNavigate={onNavigate} />
        <PageHeader
          eyebrow="Modulo 2 · Confrontare due geni"
          title="Sequenze troppo lunghe"
        />
        <p className="text-[15px]">
          Il confronto in aula funziona su tratti brevi di gene (fino a{' '}
          {MAX_SEQ_LENGTH} basi). Le sequenze inserite sono più lunghe: usa un frammento
          più corto della regione che ti interessa.
        </p>
      </div>
    );
  }
  if (!a || !b || !result) {
    return (
      <div className="fade-up">
        <Stepper current="compare" onNavigate={onNavigate} />
        <PageHeader
          eyebrow="Modulo 2 · Confrontare due geni"
          title="Serve una seconda sequenza"
        />
        <p className="text-[15px]">
          Per confrontare servono <strong>due</strong> sequenze, ma questa indagine ne ha{' '}
          {currentCase.sequences.length}. Succede con una proteina singola o in modalità
          libera senza sequenze.{' '}
          <button
            onClick={() => onNavigate('protein')}
            className="text-accent font-medium hover:underline"
          >
            Passa alla proteina 3D
          </button>{' '}
          oppure{' '}
          <button
            onClick={() => onNavigate('libera')}
            className="text-accent font-medium hover:underline"
          >
            aggiungi le sequenze in modalità libera
          </button>
          .
        </p>
      </div>
    );
  }

  // Spezza l'allineamento in righe leggibili.
  const rows: { from: number; a: string; m: string; b: string }[] = [];
  for (let i = 0; i < result.alignedLength; i += ROW) {
    rows.push({
      from: i + 1,
      a: result.alignedA.slice(i, i + ROW),
      m: result.matchLine.slice(i, i + ROW),
      b: result.alignedB.slice(i, i + ROW),
    });
  }

  const aiContext = [
    SCREEN_BRIEFINGS.compare,
    `Caso: ${currentCase.title}`,
    `Domanda biologica: ${currentCase.question}`,
    `Confronto tra: "${result.aLabel}" e "${result.bLabel}"`,
    `Identità: ${result.identityPct}% (${result.identicalCount}/${result.alignedLength} posizioni identiche)`,
    `Differenze (mismatch): ${result.mismatches}`,
    `Gap (inserzioni/delezioni): ${result.gaps}`,
    differences.length > 0
      ? `Differenze trovate (calcolate dall'algoritmo, non da te): ${differences
          .map(diffText)
          .join('; ')}`
      : 'Le due sequenze sono identiche.',
    `Allineamento calcolato (Needleman-Wunsch):`,
    result.alignedA,
    result.matchLine,
    result.alignedB,
  ].join('\n');

  return (
    <div className="fade-up">
      <Stepper current="compare" onNavigate={onNavigate} />
      <PageHeader
        eyebrow="Modulo 2 · Confrontare due geni"
        title={
          <>
            Trova le <em className="text-accent not-italic italic">differenze</em>
          </>
        }
        dek="L'app allinea le due sequenze con un algoritmo vero e le colora: verde dove combaciano, rosso dove differiscono. L'AI interpreta cosa significa."
      />

      <HowTo
        steps={[
          'Guarda l\'allineamento: verde dove le sequenze combaciano, rosso dove cambiano.',
          'Leggi il riquadro «La scoperta»: qual è la differenza e cosa comporta.',
          'Chiedi al tutor perché quella differenza conta.',
          'Aggiungi il confronto al dossier.',
        ]}
      />

      <div className="flex flex-wrap gap-6 border-t border-rule pt-4 mb-4">
        <Stat value={`${result.identityPct}%`} label="identità" />
        <Stat value={result.identicalCount} label="basi uguali" />
        <Stat value={result.mismatches} label="basi diverse" />
        <Stat value={result.gaps} label="gap" />
      </div>

      <Sub>L'allineamento, posizione per posizione</Sub>
      <div className="flex flex-wrap gap-4 text-[12px] mb-2">
        <span className="font-mono">
          <span className="text-accent-2">▉</span> combaciano
        </span>
        <span className="font-mono">
          <span className="text-accent">▉</span> differiscono
        </span>
        <span className="font-mono text-ink-muted">— = gap</span>
      </div>

      {/* Legenda: le due etichette troncate erano identiche ("Bet" e "Bet") e
          la squadra non distingueva il gene sano da quello mutato. */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mb-2 text-[12.5px]">
        <span className="text-ink-light">
          <span className="font-mono text-accent font-bold">A</span> = {result.aLabel}
        </span>
        <span className="text-ink-light">
          <span className="font-mono text-accent font-bold">B</span> = {result.bLabel}
        </span>
      </div>

      <div className="seq-scroll overflow-x-auto rounded-lg bg-paper-2 p-4">
        <div className="min-w-max space-y-4">
          {rows.map((r, ri) => (
            <div key={ri} className="font-mono text-[13px] leading-tight">
              <div className="flex">
                <span className="w-14 shrink-0 text-ink-muted text-[10px] pt-0.5">
                  {r.from}
                </span>
                <span className="text-accent font-bold mr-2 shrink-0 w-[1.5rem]">A</span>
                <SeqRow seq={r.a} match={r.m} />
              </div>
              <div className="flex">
                <span className="w-14 shrink-0" />
                <span className="mr-2 shrink-0 w-[1.5rem]" />
                <span className="whitespace-pre text-ink-muted">
                  {r.m.replace(/\|/g, '|')}
                </span>
              </div>
              <div className="flex">
                <span className="w-14 shrink-0" />
                <span className="text-accent font-bold mr-2 shrink-0 w-[1.5rem]">B</span>
                <SeqRow seq={r.b} match={r.m} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {differences.length > 0 && (
        <div className="rounded-xl bg-ink text-paper px-7 py-6 mt-6">
          <div className="font-mono text-[10px] tracking-[.2em] uppercase text-[#e8935f] mb-3">
            La scoperta · {differences.length}{' '}
            {differences.length === 1 ? 'differenza che conta' : 'differenze che contano'}
          </div>
          <div className="space-y-3">
            {differences.map((d, i) => (
              <div key={i} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                {d.kind === 'sostituzione' ? (
                  <>
                    <div className="font-serif text-lg text-paper">
                      Posizione {d.position}:{' '}
                      <span className="text-[#e8935f]">
                        {d.fromBase} → {d.toBase}
                      </span>
                    </div>
                    {d.fromAA && d.toAA ? (
                      <p className="text-[14px] text-[#c9bfb4] mt-1">
                        {d.silent ? (
                          <>
                            Cade nel codone {d.codonNumber}, ma l'amminoacido resta{' '}
                            <strong className="text-paper">
                              {d.fromAAName} ({d.fromAA})
                            </strong>
                            : è una <em>mutazione silente</em> — il DNA cambia, la proteina no.
                          </>
                        ) : (
                          <>
                            Nel codone {d.codonNumber} l'amminoacido cambia da{' '}
                            <strong className="text-paper">
                              {d.fromAAName} ({d.fromAA})
                            </strong>{' '}
                            a{' '}
                            <strong className="text-[#e8935f]">
                              {d.toAAName} ({d.toAA})
                            </strong>
                            . Una lettera del DNA, un amminoacido diverso.
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-[14px] text-[#c9bfb4] mt-1">
                        Una base cambia; qui l'effetto sull'amminoacido non è calcolabile in
                        modo affidabile perché un indel a monte ha sfasato la lettura.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-serif text-lg text-paper">
                      {d.kind === 'delezione' ? 'Delezione' : 'Inserzione'} di {d.length}{' '}
                      basi{' '}
                      <span className="text-[#e8935f]">alla posizione {d.position}</span>
                    </div>
                    <p className="text-[14px] text-[#c9bfb4] mt-1">
                      {d.frameshift ? (
                        <>
                          {d.length} basi non sono un multiplo di 3: la lettura{' '}
                          <em>slitta</em> e da qui in poi tutti i codoni cambiano
                          (frameshift).
                        </>
                      ) : d.residues ? (
                        d.kind === 'delezione' ? (
                          <>
                            La proteina{' '}
                            <strong className="text-paper">
                              perde {d.residues.length} amminoacid
                              {d.residues.length === 1 ? 'o' : 'i'}
                            </strong>{' '}
                            ({residueSummary(d)}): un pezzo che manca, come nella
                            fibrosi cistica.
                          </>
                        ) : (
                          <>
                            La proteina{' '}
                            <strong className="text-[#e8935f]">
                              guadagna {d.residues.length} amminoacid
                              {d.residues.length === 1 ? 'o' : 'i'}
                            </strong>{' '}
                            ({residueSummary(d)}): un pezzo in più.
                          </>
                        )
                      ) : (
                        <>
                          {d.length} basi {d.kind === 'delezione' ? 'tolte' : 'aggiunte'} in
                          blocco.
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-[13px] text-[#8a7f73] mt-4 italic">
            Non è un dettaglio tecnico: è il momento scientifico dell'indagine. Chiedi al
            tutor perché questa differenza conta.
          </p>
        </div>
      )}

      <Note label="La regola d'oro">
        L'allineamento qui sopra è calcolato da una <strong>libreria di bioinformatica</strong>,
        non dall'AI. Il tutor riceve questo risultato già pronto e lo{' '}
        <em>commenta</em>: cosa raccontano le differenze? Questi due geni sono parenti
        stretti o lontani?
      </Note>

      <Esercizio
        consegna="Guarda le statistiche qui sopra: quante posizioni differiscono in tutto? (basi diverse + gap)"
        expected={String(result.mismatches + result.gaps)}
        placeholder="scrivi un numero"
        explanation={`Le sequenze combaciano al ${result.identityPct}%: ${result.mismatches} basi diverse + ${result.gaps} gap = ${result.mismatches + result.gaps} posizioni differenti.`}
      />

      <ProjectWork
        consegna="Interpretate la scoperta: cosa comporta la differenza trovata? Questi due geni sono parenti stretti o lontani? Motivate."
        onSave={(txt) =>
          addEntry({
            kind: 'confronto',
            title: `Project work · Interpretazione del confronto`,
            body: txt,
            data: { identityPct: result.identityPct, mismatches: result.mismatches },
          })
        }
      />

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <AddToDossierButton
          onAdd={() =>
            addEntry({
              kind: 'confronto',
              title: `Confronto: ${result.aLabel} vs ${result.bLabel}`,
              body:
                `Le due sequenze combaciano al ${result.identityPct}% (${result.identicalCount}/${result.alignedLength} posizioni). Ho trovato ${result.mismatches} differenze e ${result.gaps} gap.` +
                (differences.length > 0
                  ? ` La scoperta: ${differences.map(diffText).join('; ')}.`
                  : ''),
              data: {
                identityPct: result.identityPct,
                mismatches: result.mismatches,
                gaps: result.gaps,
                aLabel: result.aLabel,
                bLabel: result.bLabel,
                scoperta: differences.map(diffText),
              },
            })
          }
        />
        <button
          onClick={() => onNavigate('dna')}
          className="text-sm font-mono text-accent hover:underline"
        >
          Leggi il DNA <span className="nudge">→</span>
        </button>
      </div>

      <div className="mt-6">
        <AiTutor
          title="Il tutor interpreta il confronto"
          context={aiContext}
          intro={`Ho allineato "${result.aLabel}" e "${result.bLabel}": combaciano al ${result.identityPct}%. Chiedimi cosa significano le differenze.`}
          suggestions={[
            'Cosa significano queste differenze?',
            'Sono parenti stretti o lontani?',
            "C'è una mutazione importante?",
          ]}
        />
      </div>
    </div>
  );
}

/** Riassume gli amminoacidi di un indel (es. "25 × Glutammina (Q)" o "Fenilalanina (F)"). */
function residueSummary(d: import('../lib/alignment').Difference): string {
  const codes = d.residues ?? '';
  const names = d.residueNames ?? [];
  if (names.length === 0) return '';
  const uniq = new Set(codes.split(''));
  if (uniq.size === 1) {
    const code = codes[0];
    const name = names[0];
    return codes.length === 1 ? `${name} (${code})` : `${codes.length} × ${name} (${code})`;
  }
  return names.join(', ');
}

/** Descrive una differenza in una frase italiana (per AI e dossier). */
function diffText(d: import('../lib/alignment').Difference): string {
  if (d.kind === 'sostituzione') {
    const base = `posizione ${d.position} ${d.fromBase}→${d.toBase}`;
    if (d.fromAA && d.toAA) {
      return d.silent
        ? `${base} (codone ${d.codonNumber}, amminoacido invariato ${d.fromAAName}: mutazione silente)`
        : `${base} (codone ${d.codonNumber}, amminoacido ${d.fromAAName}→${d.toAAName})`;
    }
    return `${base} (effetto sull'amminoacido non calcolabile per un indel a monte)`;
  }
  const what = d.kind === 'delezione' ? 'delezione' : 'inserzione';
  if (d.frameshift) {
    return `${what} di ${d.length} basi alla posizione ${d.position} (frameshift)`;
  }
  if (d.residues) {
    return `${what} in-frame di ${d.length} basi alla posizione ${d.position} (${
      d.kind === 'delezione' ? 'rimuove' : 'aggiunge'
    } ${residueSummary(d)})`;
  }
  return `${what} di ${d.length} basi alla posizione ${d.position}`;
}

/** Riga di sequenza colorata secondo la stringa di corrispondenza. */
function SeqRow({ seq, match }: { seq: string; match: string }) {
  return (
    <span className="whitespace-pre">
      {seq.split('').map((ch, i) => {
        const m = match[i];
        let cls = 'text-ink-muted'; // gap
        if (ch !== '-') {
          cls = m === '|' ? 'text-accent-2' : 'text-accent font-medium base-hot';
        }
        return (
          <span key={i} className={cls}>
            {ch}
          </span>
        );
      })}
    </span>
  );
}
