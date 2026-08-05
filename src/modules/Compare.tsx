import { useMemo, useState, useRef } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import {
  PageHeader,
  Sub,
  Stat,
  AddToDossierButton,
  NoCaseNotice,
  Stepper,
  Esercizio,
  ProjectWork,
  ProssimoPasso,
  Fase,
  CosaStaiGuardando,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import { alignSequences, describeDifferences, MAX_SEQ_LENGTH } from '../lib/alignment';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';
import { LEGGERE_ALLINEAMENTO } from '../data/guardare';
import { askTutorProactive } from '../lib/ai';
import { teamWritingContext } from '../lib/teamContext';

const ROW = 45; // basi per riga nella visualizzazione allineata

export function Compare({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, addEntry, dossier } = useStore();
  const [draft, setDraft] = useState('');
  // La risposta del tutor a quello che la squadra scrive nel project work.
  const [reazione, setReazione] = useState<string | null>(null);
  const [reazioneInCorso, setReazioneInCorso] = useState(false);
  const aiContextRef = useRef('');

  async function chiediReazione(testo: string) {
    setReazioneInCorso(true);
    try {
      const r = await askTutorProactive({
        phase: 'Modulo · Confronto fra due geni',
        teamInput: testo,
        brief: aiContextRef.current,
      });
      if (r) setReazione(r);
    } catch {
      // Tutor non raggiungibile: il lavoro resta comunque salvato.
    } finally {
      setReazioneInCorso(false);
    }
  }

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

  // Quante differenze cambiano davvero un amminoacido (le altre sono silenti).
  const amminoacidiCambiati = differences.filter(
    (d) => d.kind === 'sostituzione' && d.fromAA && d.toAA && d.fromAA !== d.toAA,
  ).length;

  const aiContext = [
    SCREEN_BRIEFINGS.compare,
    teamWritingContext(dossier, currentCase?.id, draft),
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
  ]
    .filter(Boolean)
    .join('\n');
  aiContextRef.current = aiContext;

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

      <Fase
        n={1}
        titolo="Guarda dove i due geni non combaciano"
        perche="L'app ha allineato le due sequenze con lo stesso algoritmo che usano i ricercatori. Verde dove sono uguali, rosso dove cambiano: cominciate da qui, senza leggere altro."
      >
      <div className="flex flex-wrap gap-6 border-t-0 pt-0 mb-4">
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

      </Fase>

      <Fase
        n={2}
        titolo="Che cosa hai davanti"
        perche="Avete visto colori e barrette. Adesso il significato: senza queste quattro parole l'allineamento resta un disegno."
      >
        <CosaStaiGuardando
          voci={LEGGERE_ALLINEAMENTO.voci}
          cerca={LEGGERE_ALLINEAMENTO.cerca}
        />
      </Fase>

      {differences.length > 0 && (
        <Fase
          n={3}
          titolo="La scoperta"
          perche="Ora che sapete leggere l'allineamento, ecco cosa comporta davvero quel punto rosso: l'app calcola l'effetto sulla proteina, senza inventare nulla."
        >
        <div className="rounded-xl bg-ink text-paper px-7 py-6 mt-0">
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
        </Fase>
      )}

      <Fase
        n={4}
        titolo="Fai tu un conto"
        perche="Il DNA è cambiato, l'avete visto. Ma cambiare una lettera del DNA non significa automaticamente cambiare la proteina: verificatelo."
      >
      {/* Non "copia il numero qui sopra": qui bisogna capire che una lettera
          cambiata nel DNA non sempre cambia la proteina. */}
      <Esercizio
        id="confronto-amminoacidi-cambiati"
        consegna={`Nell'allineamento ci sono ${result.mismatches} lettere diverse. Ma quanti AMMINOACIDI cambiano davvero nella proteina? (guardate le differenze qui sotto e contate solo quelle che cambiano amminoacido)`}
        expected={String(amminoacidiCambiati)}
        placeholder="scrivi un numero"
        explanation={
          amminoacidiCambiati === result.mismatches
            ? `${amminoacidiCambiati}: qui ogni lettera cambiata cambia anche l'amminoacido. Ma non è sempre così — capita che il DNA cambi e la proteina resti identica.`
            : `Solo ${amminoacidiCambiati} su ${result.mismatches}. Il codice genetico è ridondante: certe lettere possono cambiare senza che l'amminoacido cambi. Sono le mutazioni silenti.`
        }
      />

      </Fase>

      <Fase
        n={5}
        titolo="Scrivi cosa hai capito"
        perche="Avete i dati; ora serve la vostra interpretazione. Salvate: il tutor legge quello che scrivete e vi risponde."
      >
      <ProjectWork
        onDraft={setDraft}
        consegna="Interpretate la scoperta: cosa comporta la differenza trovata? Questi due geni sono parenti stretti o lontani? Motivate."
        onSave={(txt) => {
          addEntry({
            kind: 'confronto',
            title: `Project work · Interpretazione del confronto`,
            body: txt,
            data: { identityPct: result.identityPct, mismatches: result.mismatches },
          });
          chiediReazione(txt);
        }}
      />
      {reazioneInCorso && (
        <p className="text-[13.5px] text-ink-muted italic mt-2">
          Il tutor sta leggendo quello che avete scritto…
        </p>
      )}
      </Fase>

      <Fase
        n={6}
        titolo="Parlane con il tutor"
        perche="Trovate qui la sua risposta a quello che avete scritto, e potete chiedergli il resto. Ha davanti l'allineamento calcolato."
      >
      <div className="mt-0 flex flex-wrap gap-3 items-center">
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
      </div>

      <div className="mt-6">
        <AiTutor
          title="Il tutor interpreta il confronto"
          reazione={reazione ?? undefined}
          cardine="Guardate dove le due sequenze non combaciano: sono differenze sparse o concentrate in un punto? Secondo voi una differenza così piccola può bastare a cambiare la proteina, oppure serve molto di più?"
          context={aiContext}
          intro={`Ho allineato "${result.aLabel}" e "${result.bLabel}": combaciano al ${result.identityPct}%. Chiedimi cosa significano le differenze.`}
          suggestions={[
            'Cosa significano queste differenze?',
            'Sono parenti stretti o lontani?',
            "C'è una mutazione importante?",
          ]}
        />
      </div>

      </Fase>

      <ProssimoPasso
        fatto="Avete trovato dove i due geni differiscono."
        ora="Adesso guardate cosa c'è scritto davvero nel gene: le lettere si leggono a gruppi di tre."
        azione="Leggi il DNA"
        onGo={() => onNavigate('dna')}
        alternativa={{ testo: 'salva e vai al dossier', onGo: () => onNavigate('dossier') }}
      />
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
