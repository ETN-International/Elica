import { useEffect, useMemo, useState, useRef } from 'react';
import type { PageId } from '../App';
import type { AlphaFoldModel } from '../types';
import { useStore } from '../store';
import {
  PageHeader,
  Sub,
  AddToDossierButton,
  Stat,
  Stepper,
  Esercizio,
  ProjectWork,
  ProssimoPasso,
  Fase,
  FiloDellIndagine,
  CosaStaiGuardando,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import { MolstarViewer, type MolstarApi } from '../components/MolstarViewer';
import { fetchAlphaFoldModel } from '../lib/alphafold';
import { mappaturaValida, residuiDelTratto } from '../lib/azioni3d';
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
import { DomandaCoperta, serveIlGradino } from '../components/GradinoDomanda';
import { LEGGERE_CODONI } from '../data/guardare';
import { askTutorProactive } from '../lib/ai';
import { teamWritingContext } from '../lib/teamContext';

export function ReadDna({ onNavigate }: { onNavigate: (p: PageId) => void }) {
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
        phase: 'Modulo · Leggere il DNA',
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
  const [selected, setSelected] = useState(0);

  // La chiusura del cerchio: rimostrare la forma 3D accanto alla catena appena
  // tradotta. Finora l'app AFFERMAVA che le lettere costruiscono la proteina;
  // qui lo si vede. Se AlphaFold non risponde il modulo prosegue lo stesso.
  const [forma, setForma] = useState<AlphaFoldModel | null>(null);
  const [formaKo, setFormaKo] = useState(false);
  const [viewer3d, setViewer3d] = useState<MolstarApi | null>(null);
  const [cerchioChiuso, setCerchioChiuso] = useState(false);
  const uniprotCaso = currentCase?.protein.uniprot;
  useEffect(() => {
    if (!uniprotCaso) return;
    let annullato = false;
    setForma(null);
    setFormaKo(false);
    fetchAlphaFoldModel(uniprotCaso)
      .then((m) => !annullato && setForma(m))
      .catch(() => !annullato && setFormaKo(true));
    return () => {
      annullato = true;
    };
  }, [uniprotCaso]);

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

  // Il gradino di autonomia vive nel Modulo 1, ma la domanda deve restare
  // coperta anche qui: lo Stepper permette di saltare direttamente a questo
  // modulo, e la vedrebbero in chiaro prima di aver scritto la loro.
  const coperta = serveIlGradino(currentCase, dossier);

  const aiContext = [
    SCREEN_BRIEFINGS.dna,
    teamWritingContext(dossier, currentCase?.id, draft),
    `Caso: ${currentCase.title}`,
    // Coperta anche per il tutor finché la squadra non ha scritto la sua:
    // altrimenti basterebbe chiedergliela in chat.
    coperta
      ? "La domanda dell'indagine è ancora coperta: la squadra la sta formulando da sé nel Modulo 1. NON svelarla e non proporne una tua."
      : `Domanda biologica: ${currentCase.question}`,
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
  aiContextRef.current = aiContext;

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

      {coperta ? (
        <DomandaCoperta onGo={() => onNavigate('protein')} />
      ) : (
        <FiloDellIndagine
          domanda={currentCase.question}
          passo="Terzo dei tre gesti"
          contributo="Avete visto la forma e trovato la differenza. Resta da leggere che cosa c'è scritto nel gene: è il codice che costruisce quella proteina, lettera per lettera."
        />
      )}

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

      <Fase
        n={1}
        titolo="Prima: di questo dato ci si può fidare?"
        perche="Prima di leggere il gene, una verifica: in scienza non si lavora su un dato senza averlo controllato. È il primo gesto di ogni ricercatore, e lo fate anche voi."
      >
      <Sub>Il controllo qualità</Sub>
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

      </Fase>

      <Fase
        n={2}
        titolo="Ora leggi il gene"
        perche="Il dato è buono, quindi si può leggere. Qui sotto la sequenza è già divisa nei gruppi con cui la legge la cellula."
      >
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

      </Fase>

      <Fase
        n={3}
        titolo="Che cosa hai davanti"
        perche="Avete visto blocchi di tre lettere con una sigla sotto. Ecco che cosa sono: senza questo, restano lettere colorate."
      >
        <CosaStaiGuardando voci={LEGGERE_CODONI.voci} cerca={LEGGERE_CODONI.cerca} />
      </Fase>

      <Fase
        n={4}
        titolo="Fai tu un conto"
        perche="Avete visto la regola all'opera su questa sequenza. Provate ad applicarla a un gene qualsiasi: è così che si capisce se una regola è stata capita."
      >
      {/* La regola, non il numero già a schermo: si applica a una sequenza
          diversa da quella che hanno davanti. */}
      <Esercizio
        id="dna-regola-del-tre"
        consegna="Avete visto la regola: tre lettere di DNA producono un amminoacido. Allora un gene lungo 150 basi quanti amminoacidi produce?"
        expected="50"
        placeholder="scrivi un numero"
        explanation="150 diviso 3 fa 50. È la regola che vale per ogni gene: la lunghezza del DNA divisa per tre dà il numero di amminoacidi — ecco perché togliere una sola lettera manda tutto fuori sincrono."
      />

      </Fase>

      {/* ── Il cerchio si chiude: le lettere e la forma, insieme ────────── */}
      <Fase
        n={5}
        titolo="Ecco che cosa costruiscono"
        perche="Finora ve l'abbiamo detto a parole: queste lettere costruiscono una proteina. Adesso guardatelo. Questa è la stessa forma che avete girato il primo giorno."
      >
        <div className="rounded-lg bg-paper-2 px-4 py-3 mb-3">
          <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-ink-muted mb-1.5">
            La catena che avete appena tradotto
          </div>
          <p className="font-mono text-[15px] text-ink tracking-wider break-all">
            {protein.replace(/\*/g, '')}
          </p>
          <p className="text-[12.5px] text-ink-muted mt-1.5">
            {protein.replace(/\*/g, '').length} amminoacidi, uno per ogni gruppo di
            tre lettere che avete letto qui sopra.
          </p>
        </div>

        {forma && (
          <>
            <MolstarViewer
              url={forma.modelUrl}
              format={forma.format}
              onReady={setViewer3d}
            />
            {viewer3d && mappaturaValida(currentCase, forma) && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    const n = residuiDelTratto(currentCase);
                    if (n > 0) viewer3d.focusResidues(1, n, 8);
                    setCerchioChiuso(true);
                  }}
                  className="rounded-lg bg-accent text-white px-4 py-2.5 text-[13.5px] font-medium hover:opacity-90 transition cta-pulse"
                >
                  Illumina qui dentro il pezzo che ho appena letto{' '}
                  <span className="nudge">→</span>
                </button>
                {cerchioChiuso && (
                  <p className="text-[14.5px] text-ink-light mt-3 border-l-2 border-accent pl-3">
                    In verde chiaro c'è esattamente la catena qui sopra. Non è una
                    somiglianza: quelle lettere <strong>sono</strong> quel pezzo di
                    struttura. Cambiarne una cambia quel pezzo — ed è tutta qui la
                    storia dell'indagine.
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {formaKo && (
          <p className="text-[13.5px] text-ink-muted">
            La struttura 3D non si è caricata (serve la rete). Proseguite: la
            lettura del gene qui sopra è completa e vale lo stesso.
          </p>
        )}
      </Fase>

      <Fase
        n={6}
        titolo="Scrivi cosa hai capito"
        perche="Avete visto il legame fra le lettere e la forma. Adesso ditelo con parole vostre: è quello che resta. Salvate e il tutor vi risponde."
      >
      <ProjectWork
        onDraft={setDraft}
        consegna={`Con parole vostre: cosa codifica "${seq.label}" e perché è importante? Guardate la traduzione e chiedete al tutor.`}
        onSave={(txt) => {
          addEntry({
            kind: 'dna',
            title: `Project work · Lettura di ${seq.label}`,
            body: txt,
            data: { label: seq.label, dna, gc },
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
        n={7}
        titolo="Parlane con il tutor"
        perche="Qui trovate la sua risposta a quello che avete scritto. Ha davanti la sequenza tradotta e i controlli di qualità."
      >
      <div className="mt-0 flex flex-wrap gap-3 items-center">
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
          reazione={reazione ?? undefined}
          cardine="Contate i codoni e guardate la proteina che ne esce: quante lettere di DNA servono per un solo amminoacido? E cosa succederebbe se ne togliessimo una sola dall’inizio?"
          context={aiContext}
          intro={`Stai guardando "${seq.label}". Chiedimi cosa codifica questo gene, cosa cercare, o cosa significano i codoni.`}
          suggestions={[
            'Cosa fa questo gene?',
            'Cosa significa il contenuto GC?',
            'Da dove parte la lettura?',
          ]}
        />
      </div>

      </Fase>

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
