import { useEffect, useMemo, useState } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import {
  PageHeader,
  Note,
  AddToDossierButton,
  ProjectWork,
  ProssimoPasso,
  Fase,
  CosaStaiGuardando,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import { cleanDna } from '../lib/dna';
import {
  applyMutation,
  aggiornaSegni,
  classifyMutation,
  CATEGORY_STYLE,
  type MutationOp,
  type SegnoModifica,
} from '../lib/mutation';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';
import { teamWritingContext } from '../lib/teamContext';

const SAMPLE = 'ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACT';

/** Le basi fra cui si può scegliere; 'ciclo' tiene il vecchio A→T→G→C. */
type Bersaglio = 'ciclo' | 'A' | 'T' | 'G' | 'C';

export function Mutazioni({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, addEntry, dossier, segna } = useStore();
  const [draft, setDraft] = useState('');

  // Sequenze disponibili: quelle del caso corrente, o un campione di partenza.
  const available =
    currentCase && currentCase.sequences.length > 0
      ? currentCase.sequences
      : [{ label: 'Sequenza di esempio (beta-globina)', dna: SAMPLE }];

  const [sourceIdx, setSourceIdx] = useState(0);
  const original = cleanDna(available[Math.min(sourceIdx, available.length - 1)].dna);
  const [mutated, setMutated] = useState(original);
  const [op, setOp] = useState<MutationOp>('sostituisci');
  const [bersaglio, setBersaglio] = useState<Bersaglio>('ciclo');
  /** Le modifiche davvero applicate: una modifica, un segno. */
  const [segni, setSegni] = useState<SegnoModifica[]>([]);

  // Se cambia la sequenza sorgente, riparti da capo.
  const [lastSource, setLastSource] = useState(original);
  if (original !== lastSource) {
    setLastSource(original);
    setMutated(original);
    setSegni([]);
  }

  function ripristina() {
    setMutated(original);
    setSegni([]);
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
      // È una prova: serve a spuntare da sole le attività del Giorno 5.
      segna('mutazioniOttenute', effect.category);
      setAchieved((prev) => {
        if (prev.has(effect.category)) return prev;
        const next = new Set(prev);
        next.add(effect.category);
        return next;
      });
    }
  }, [effect.category, segna]);
  const targets: { id: string; label: string; come: string }[] = [
    {
      id: 'silente',
      label: 'Silente',
      come: 'sostituite una base e scegliete voi in che cosa: spesso è la TERZA lettera di un codone quella che non cambia niente.',
    },
    {
      id: 'missenso',
      label: 'Missenso',
      come: 'una sostituzione sola, in un punto qualsiasi che non sia il codone di partenza.',
    },
    {
      id: 'nonsenso',
      label: 'Nonsenso',
      come: 'una sostituzione che faccia comparire un segnale di STOP (TAA, TAG, TGA) prima del dovuto.',
    },
    {
      id: 'frameshift',
      label: 'Frameshift',
      come: 'inserite oppure eliminate UNA base sola: il numero non è più multiplo di tre.',
    },
    {
      id: 'inframe-indel',
      label: 'Indel in-frame',
      come: 'ripetete la stessa modifica TRE volte nello stesso punto, senza toccare altro.',
    },
  ];
  const modificato = mutated !== original;

  function clickBase(i: number) {
    const dopo = applyMutation(mutated, i, op, bersaglio === 'ciclo' ? undefined : bersaglio);
    setSegni((s) => aggiornaSegni(s, i, op, dopo.length));
    setMutated(dopo);
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
        dek="È l'unico posto del lab dove il DNA lo cambiate voi e l'app calcola cosa succede alla proteina. Altrove leggete dati veri: qui fate un esperimento."
      />

      {/* La cerniera con il percorso: il modulo prima fluttuava, e la squadra ci
          arrivava senza sapere perché ci era arrivata. */}
      <div className="rounded-xl border-l-2 border-accent bg-paper-2 px-5 py-4 my-5">
        <div className="font-mono text-[9.5px] tracking-[.18em] uppercase text-accent mb-2">
          Perché siete qui
        </div>
        <p className="text-[15px] text-ink-light">
          Nel Giorno 0 avete trovato <strong>una</strong> lettera diversa, e nella
          vostra indagine avete visto che cosa provoca. Ma era una mutazione sola,
          di un tipo solo. Qui il DNA lo cambiate voi — e scoprite che di
          mutazioni ce ne sono <strong>tipi diversi</strong>: alcune non fanno
          assolutamente niente, altre distruggono la proteina, e una manda a monte
          perfino la partenza.
        </p>
      </div>

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

      {/* ── 1 ─────────────────────────────────────────────────────────── */}
      <Fase
        n={1}
        titolo="Scegliete che cosa cambiare"
        perche="Un gene si può rompere in tre modi soltanto: cambiando una lettera, aggiungendone una, o togliendone una. Prima di cliccare decidete quale dei tre state provando: è la differenza fra un esperimento e un clic a caso."
      >
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
            onClick={ripristina}
            className="ml-1 rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink border border-transparent hover:border-rule transition"
          >
            ↺ Ripristina
          </button>
        </div>

        {/* Prima la base ciclava A→T→G→C a ogni clic: la squadra non sceglieva,
            scorreva — e cercare di proposito una mutazione silente era quasi
            impossibile. */}
        {op !== 'elimina' && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="font-mono text-[10px] tracking-[.13em] uppercase text-accent">
              {op === 'sostituisci' ? 'Trasformala in' : 'Inserisci una'}
            </span>
            {(['ciclo', 'A', 'T', 'G', 'C'] as Bersaglio[]).map((b) => (
              <button
                key={b}
                onClick={() => setBersaglio(b)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-mono border transition ${
                  bersaglio === b
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-white/40 text-ink-light border-rule hover:border-ink-muted'
                }`}
              >
                {b === 'ciclo' ? 'la successiva' : b}
              </button>
            ))}
          </div>
        )}

        <p className="text-[12.5px] text-ink-muted mt-2">
          {op === 'sostituisci' &&
            (bersaglio === 'ciclo'
              ? 'Clicca una base: cambia nella successiva, A → T → G → C.'
              : `Clicca una base: diventa ${bersaglio}.`)}
          {op === 'inserisci' &&
            `Clicca una base: ne inserisce una ${bersaglio === 'ciclo' ? 'A' : bersaglio} prima di essa.`}
          {op === 'elimina' && 'Clicca una base: la rimuove dalla sequenza.'}
        </p>
      </Fase>

      {/* ── 2 ─────────────────────────────────────────────────────────── */}
      <Fase
        n={2}
        titolo="Cambiate il DNA"
        perche="Le lettere sono raggruppate a tre a tre perché è così che la cellula le legge: un gruppo da tre — un codone — vale un amminoacido. Tenete d'occhio i gruppi, non le singole lettere."
      >
        {modificato && (
          <div className="mb-3">
            <RigaCodoni seq={original} etichetta="Prima" spenta />
          </div>
        )}
        <RigaCodoni
          seq={mutated}
          etichetta={modificato ? 'Adesso' : 'La sequenza'}
          segni={segni}
          onClick={clickBase}
        />

        {segni.length > 0 && (
          <p className="text-[13px] text-ink-muted mt-2">
            {segni.length === 1 ? 'Una modifica applicata' : `${segni.length} modifiche applicate`}
            : sono i punti evidenziati. Tutto il resto sono le stesse lettere di
            prima{effect.category === 'frameshift' || effect.category === 'multipla'
              ? ' — anche se, dopo un’aggiunta o un taglio, si trovano dentro gruppi da tre diversi.'
              : '.'}
          </p>
        )}

        {(effect.category === 'frameshift' ||
          effect.category === 'inframe-indel' ||
          effect.category === 'multipla') && (
          <Note label="Guardate i gruppi da tre">
            Confrontate la riga «Prima» con quella «Adesso»: dal punto che avete
            toccato in poi, le stesse lettere finiscono in gruppi diversi. La
            cellula continua a leggere a tre a tre da dove ha cominciato, quindi da
            lì in avanti legge parole nuove. Questo è lo slittamento —{' '}
            <em>frameshift</em> — ed è il motivo per cui togliere una lettera sola
            può fare più danno che cambiarne dieci.
          </Note>
        )}
      </Fase>

      {/* ── 3 ─────────────────────────────────────────────────────────── */}
      <Fase
        n={3}
        titolo="Guardate che cosa è successo alla proteina"
        perche="Il DNA è solo l'istruzione: quello che conta è l'oggetto che ne esce. Qui l'app traduce la sequenza modificata e la mette accanto a quella di prima."
      >
        <CosaStaiGuardando
          voci={[
            {
              termine: 'Silente',
              spiegazione:
                'il DNA è cambiato ma la proteina è identica. Succede perché più codoni diversi indicano lo stesso amminoacido: il codice genetico è ridondante.',
            },
            {
              termine: 'Missenso',
              spiegazione:
                'un amminoacido diventa un altro. È quello che succede nell’anemia falciforme: una lettera, un amminoacido, una malattia.',
            },
            {
              termine: 'Nonsenso',
              spiegazione:
                'compare un segnale di STOP prima del dovuto e la proteina si tronca a metà. Un pezzo di macchina non funziona come la macchina.',
            },
            {
              termine: 'Frameshift',
              spiegazione:
                'avete aggiunto o tolto lettere in numero non multiplo di tre: da lì in poi tutti i gruppi da tre slittano e la proteina diventa un’altra cosa.',
            },
            {
              termine: 'Indel in-frame',
              spiegazione:
                'ne avete aggiunte o tolte esattamente tre (o sei, o nove): la lettura non slitta, la proteina resta quella ma con un pezzo in più o in meno. È il caso della ΔF508 della fibrosi cistica.',
            },
            {
              termine: 'Partenza distrutta',
              spiegazione:
                'avete rotto l’ATG iniziale. Non è una proteina «un po’ diversa»: è una proteina che non viene prodotta, perché la cellula non sa da dove cominciare a leggere.',
            },
          ]}
          cerca="l'etichetta colorata qui sotto e la riga in fondo: dicono che tipo di mutazione avete appena fatto e perché."
        />

        <div className="rounded-xl border border-rule p-5 bg-white/30 mt-4">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
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

          {/* Quando la partenza è distrutta, ciò che segue NON è quel che farebbe
              la cellula: va detto sopra le sequenze, non solo nella nota. */}
          {effect.category === 'perdita-inizio' && (
            <p className="text-[13.5px] text-accent border-l-2 border-accent pl-3 mb-3">
              Ipotesi di laboratorio: vi mostriamo cosa uscirebbe continuando a
              leggere dallo stesso punto. Nella cellula questa proteina non
              verrebbe prodotta.
            </p>
          )}

          <div className="space-y-2">
            <ProteinRow label="Originale" seq={effect.originalProtein} ref_={effect.originalProtein} />
            <ProteinRow
              label={effect.category === 'perdita-inizio' ? 'Ipotetica' : 'Mutata'}
              seq={effect.mutatedProtein}
              ref_={effect.originalProtein}
            />
          </div>

          <p className="text-[14px] text-ink-light mt-3">{effect.note}</p>
        </div>
      </Fase>

      {/* ── 4 ─────────────────────────────────────────────────────────── */}
      <Fase
        n={4}
        titolo="Ottenete ogni tipo di mutazione"
        perche="Adesso che sapete leggere l'esito, provate a produrlo apposta. Sapere che esistono cinque tipi è una nozione; saperli fabbricare significa aver capito come funziona il codice."
      >
        {/* Prima l'esercizio spingeva ad accumulare modifiche e la nota
            «multipla» diceva di ripartire da capo: due indicazioni opposte nella
            stessa schermata. Il metodo adesso è dichiarato. */}
        <Note label="Come si fa (uno alla volta)">
          Ogni tipo si ottiene <strong>ripartendo dalla sequenza originale</strong>:
          fate le modifiche che servono per un tipo, guardate l'esito, poi premete{' '}
          <strong>↺ Ripristina</strong> e passate al successivo. Se accumulate
          modifiche di tipi diversi l'app dirà «mutazioni multiple», che è vero ma
          non vi insegna niente.
        </Note>

        <div className="space-y-2 mt-3">
          {targets.map((t) => {
            const done = achieved.has(t.id);
            return (
              <div
                key={t.id}
                className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 transition ${
                  done
                    ? 'border-accent-2/50 bg-[rgba(26,107,82,.08)]'
                    : 'border-rule bg-white/40'
                }`}
              >
                <span
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-1"
                  style={{ background: done ? 'var(--color-accent-2)' : 'var(--color-rule)' }}
                >
                  {done ? '✓' : ''}
                </span>
                <span>
                  <span
                    className={`text-[14.5px] ${done ? 'text-accent-2' : 'text-ink'}`}
                  >
                    {t.label}
                  </span>
                  <span className="block text-[13px] text-ink-muted leading-snug">
                    {t.come}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        {achieved.size === targets.length && (
          <p className="text-[13.5px] text-accent-2 mt-2">
            ✓ Tutti e {targets.length}. Adesso sapete fabbricarle, non solo
            riconoscerle.
          </p>
        )}

        {/* Non è fra i cinque obiettivi: è una scoperta, e va trattata così. */}
        <div
          className={`mt-3 rounded-lg border px-4 py-3 ${
            achieved.has('perdita-inizio')
              ? 'border-accent/50 bg-[rgba(200,66,10,.06)]'
              : 'border-rule bg-white/30'
          }`}
        >
          <span className="font-mono text-[9.5px] tracking-[.15em] uppercase text-accent">
            Fuori classifica
          </span>
          <p className="text-[14px] text-ink-light mt-1">
            {achieved.has('perdita-inizio') ? (
              <>
                <strong>L'avete trovata.</strong> Toccando una delle prime tre
                lettere avete distrutto l'ATG — e avete verificato da soli perché
                ieri vi dicevamo che conta. Che cosa succede a una macchina se le
                togliete l'interruttore di accensione?
              </>
            ) : (
              <>
                C'è un sesto esito che non è nell'elenco, e non è una mutazione
                come le altre: si ottiene toccando l'inizio della sequenza. Provate
                e leggete cosa vi dice l'app.
              </>
            )}
          </p>
        </div>
      </Fase>

      {/* ── 5 ─────────────────────────────────────────────────────────── */}
      <Fase
        n={5}
        titolo="Scrivete che cosa avete capito"
        perche="Avete fabbricato sei esiti diversi partendo dallo stesso gene. Metterlo in parole è il momento in cui si smette di cliccare e si comincia a ragionare."
      >
        <ProjectWork
          onDraft={setDraft}
          consegna="Qual è la mutazione più dannosa che siete riusciti a creare, e perché? Spiegate l'effetto sulla proteina."
          onSave={(txt) =>
            addEntry({
              caseId: currentCase?.id,
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
                caseId: currentCase?.id,
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
      </Fase>

      <Note label="Onestà scientifica" tone="amber">
        Qui calcoliamo l'effetto sulla <em>sequenza</em> della proteina, che è esatto. Non
        ricalcoliamo la struttura 3D di una proteina inventata: predire una struttura è
        compito di AlphaFold, non nostro. Un amminoacido diverso <em>può</em> cambiare la
        forma — il tutor ti spiega quando e perché.
      </Note>

      {/* ── 6 ─────────────────────────────────────────────────────────── */}
      <Fase
        n={6}
        titolo="Parlatene con il tutor"
        perche="Il tutor ha sotto gli occhi la mutazione che avete appena fatto e le due proteine. È il momento di chiedergli il perché di quello che avete visto succedere."
      >
        <AiTutor
          title="Il tutor spiega la mutazione"
          cardine="Confrontate la proteina originale con quella mutata: cosa è cambiato davvero? Fra le mutazioni che avete provato, quale vi sembra la più dannosa e perché?"
          context={[
            SCREEN_BRIEFINGS.mutazioni,
            teamWritingContext(dossier, currentCase?.id, draft),
            `Sequenza di partenza: ${available[sourceIdx].label}`,
            `Tipo di mutazione ottenuta: ${style.label}`,
            `Proteina originale: ${effect.originalProtein}`,
            `Proteina mutata: ${effect.mutatedProtein}`,
            effect.firstChangedCodon
              ? `Primo codone cambiato: ${effect.firstChangedCodon}`
              : '',
            `Nota mostrata a schermo: ${effect.note}`,
            effect.category === 'perdita-inizio'
              ? "ATTENZIONE: la squadra ha distrutto il codone d'inizio ATG. La proteina mostrata è dichiarata come ipotesi di laboratorio: NON dire che è la proteina che si formerebbe. Senza ATG non viene prodotta."
              : '',
          ]
            .filter(Boolean)
            .join('\n')}
          intro="Prova a mutare il DNA qui sopra. Chiedimi che differenza c'è tra una mutazione silente, missenso, nonsenso e frameshift."
          suggestions={[
            "Che differenza c'è tra silente e missenso?",
            'Perché il frameshift è così dannoso?',
            'Questa mutazione cambia la forma della proteina?',
          ]}
        />
      </Fase>

      <ProssimoPasso
        fatto="Avete visto cosa succede alla proteina quando il DNA cambia — e che non tutti i cambiamenti si equivalgono."
        ora="Salvate la mutazione più interessante che avete trovato: entrerà nel racconto per la giuria."
        azione="Vai al dossier"
        onGo={() => onNavigate('dossier')}
        alternativa={{ testo: 'mettiti alla prova col quiz', onGo: () => onNavigate('quiz') }}
      />
    </div>
  );
}

/**
 * La sequenza raggruppata in codoni.
 *
 * I gruppi da tre non sono decorazione: sono il modo in cui la cellula legge, e
 * affiancando "Prima" e "Adesso" si vede a occhio che dopo un'inserzione le
 * stesse lettere finiscono in gruppi diversi. Era la dimostrazione migliore del
 * frameshift, e prima veniva sprecata colorando mezza sequenza di arancione.
 */
function RigaCodoni({
  seq,
  etichetta,
  segni = [],
  onClick,
  spenta,
}: {
  seq: string;
  etichetta: string;
  segni?: SegnoModifica[];
  onClick?: (i: number) => void;
  spenta?: boolean;
}) {
  const codoni: string[][] = [];
  for (let i = 0; i < seq.length; i += 3) {
    codoni.push(seq.slice(i, i + 3).split(''));
  }
  const segnoDi = (i: number) => segni.find((s) => s.pos === i);

  return (
    <div>
      <div className="font-mono text-[9.5px] tracking-[.15em] uppercase text-ink-muted mb-1.5">
        {etichetta}
      </div>
      <div className="seq-scroll overflow-x-auto rounded-lg bg-paper-2 p-4">
        <div className="flex flex-wrap gap-x-3 gap-y-2 min-w-max">
          {codoni.map((codone, c) => (
            <div key={c} className="flex gap-0.5">
              {codone.map((base, k) => {
                const i = c * 3 + k;
                const s = segnoDi(i);
                const stile = spenta
                  ? 'bg-white/40 text-ink-muted'
                  : s?.tipo === 'sostituisci'
                    ? 'bg-accent text-white'
                    : s?.tipo === 'inserisci'
                      ? 'bg-accent-3 text-white'
                      : s?.tipo === 'elimina'
                        ? 'bg-white/70 text-ink border-l-4 border-accent'
                        : 'bg-white/70 text-ink hover:bg-white';
                const titolo = s
                  ? s.tipo === 'sostituisci'
                    ? `Posizione ${i + 1}: base sostituita da voi`
                    : s.tipo === 'inserisci'
                      ? `Posizione ${i + 1}: base inserita da voi`
                      : `Posizione ${i + 1}: qui avete tolto una base`
                  : `Posizione ${i + 1}`;
                return onClick ? (
                  <button
                    key={i}
                    onClick={() => onClick(i)}
                    className={`font-mono text-[14px] w-7 h-8 rounded transition ${stile}`}
                    title={titolo}
                  >
                    {base}
                  </button>
                ) : (
                  <span
                    key={i}
                    className={`inline-flex items-center justify-center font-mono text-[14px] w-7 h-8 rounded ${stile}`}
                    title={titolo}
                  >
                    {base}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
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
