import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageId } from '../App';
import type { AlphaFoldModel } from '../types';
import { useStore } from '../store';
import {
  PageHeader,
  Note,
  AddToDossierButton,
  NoCaseNotice,
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
import { fetchAlphaFoldModel, NoStructureError } from '../lib/alphafold';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';
import { teamWritingContext } from '../lib/teamContext';
import { giaVistoNelGiorno0 } from '../lib/progresso';
import {
  GradinoDomanda,
  useGradino,
  TITOLO_DOMANDA_PROPRIA,
} from '../components/GradinoDomanda';
import { LEGGERE_LA_3D } from '../data/guardare';
import { askTutorProactive } from '../lib/ai';
import {
  azioniDisponibili,
  residuoMutazione,
  residuiDelTratto,
  type Azione3D,
} from '../lib/azioni3d';

export function Protein({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, addEntry, dossier } = useStore();
  const [draft, setDraft] = useState('');
  const [model, setModel] = useState<AlphaFoldModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** true quando AlphaFold non copre questa proteina (non è un guasto). */
  const [noStructure, setNoStructure] = useState(false);
  const [loading, setLoading] = useState(true);

  // Le azioni sulla struttura 3D: l'app calcola i punti, la squadra clicca.
  const [viewer, setViewer] = useState<MolstarApi | null>(null);
  const [gira, setGira] = useState(false);
  const [ultimaSpiegazione, setUltimaSpiegazione] = useState<string | null>(null);
  /** Quanti amminoacidi copre il tratto studiato: serve al conto della fase 4. */
  const tratto = useMemo(
    () => (currentCase ? residuiDelTratto(currentCase) : 0),
    [currentCase],
  );
  // La risposta del tutor a quello che la squadra ha scritto: prima salvavano
  // il project work e non rispondeva nessuno.
  const [reazione, setReazione] = useState<string | null>(null);
  /** Il contesto della schermata, aggiornato a ogni render: lo passiamo al
   *  tutor quando reagisce, così commenta i dati veri e non a memoria. */
  const aiContextRef = useRef('');
  const [reazioneInCorso, setReazioneInCorso] = useState(false);

  async function chiediReazione(testo: string) {
    setReazioneInCorso(true);
    try {
      const r = await askTutorProactive({
        phase: 'Modulo · La proteina in 3D',
        teamInput: testo,
        brief: aiContextRef.current,
      });
      if (r) setReazione(r);
    } catch {
      // Tutor non raggiungibile: il lavoro della squadra resta comunque salvato.
    } finally {
      setReazioneInCorso(false);
    }
  }
  const azioni = useMemo(
    () => azioniDisponibili(currentCase ?? null, model),
    [currentCase, model],
  );

  function eseguiAzione(id: Azione3D['id']) {
    if (!viewer || !currentCase) return;
    const az = azioni.find((a) => a.id === id);
    setUltimaSpiegazione(az?.spiegazione ?? null);
    switch (id) {
      case 'mutazione': {
        const m = residuoMutazione(currentCase);
        // Un amminoacido solo: serve molto respiro, o si finisce col naso su un
        // frammento di nastro senza capire più dove si è.
        if (m) viewer.focusResidues(m.residuo, m.residuo, 12);
        break;
      }
      case 'tratto': {
        const n = residuiDelTratto(currentCase);
        // Un tratto è già ampio di suo: basta un margine.
        if (n > 0) viewer.focusResidues(1, n, 8);
        break;
      }
      case 'gira':
        viewer.spin(!gira);
        setGira((g) => !g);
        break;
      case 'insieme':
        viewer.reset();
        if (gira) {
          viewer.spin(false);
          setGira(false);
        }
        break;
    }
  }

  const gradino = useGradino(currentCase, dossier);

  const uniprot = currentCase?.protein.uniprot;

  useEffect(() => {
    if (!uniprot) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNoStructure(false);
    setModel(null);
    fetchAlphaFoldModel(uniprot)
      .then((m) => {
        if (!cancelled) {
          setModel(m);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setNoStructure(e instanceof NoStructureError);
          setError(String(e instanceof Error ? e.message : e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uniprot]);

  if (!currentCase) {
    return <NoCaseNotice moduleLabel="Modulo 1" onNavigate={onNavigate} />;
  }

  const aiContext = model
    ? [
        SCREEN_BRIEFINGS.protein,
        teamWritingContext(dossier, currentCase?.id, draft),
        `Caso: ${currentCase.title}`,
        // Finché la squadra non ha scritto la propria domanda, la nostra resta
        // coperta anche per il tutor: altrimenti basterebbe chiedergliela.
        gradino.coperta
          ? "La domanda dell'indagine è ancora coperta: la squadra la sta formulando da sé, qui in questa schermata. NON suggerirne una tua e non svelare quella del caso."
          : `Domanda biologica: ${currentCase.question}`,
        `Proteina mostrata in 3D: ${model.proteinName ?? currentCase.protein.name}`,
        `UniProt ID: ${model.uniprot}`,
        model.organism ? `Organismo: ${model.organism}` : '',
        model.sequenceLength ? `Lunghezza: ${model.sequenceLength} amminoacidi` : '',
        `Struttura scaricata da AlphaFold DB (modello v${model.modelVersion ?? '?'}).`,
      ]
        .filter(Boolean)
        .join('\n')
    : `${SCREEN_BRIEFINGS.protein}\nCaso: ${currentCase.title}. Proteina: ${currentCase.protein.name} (UniProt ${currentCase.protein.uniprot}).`;
  aiContextRef.current = aiContext;

  return (
    <div className="fade-up">
      <Stepper current="protein" onNavigate={onNavigate} />
      <PageHeader
        eyebrow="Modulo 1 · Vedere la proteina in 3D"
        title={
          <>
            La <em className="text-accent not-italic italic">forma</em> che fa la funzione
          </>
        }
        dek="Dalla sequenza, l'app recupera da AlphaFold DB la struttura 3D già calcolata e la mostra ruotabile. La struttura è vera; il tutor la racconta."
      />

      {gradino.attivo && (
        <GradinoDomanda
          caso={currentCase}
          onSalva={(testo) => {
            addEntry({
              caseId: currentCase.id,
              kind: 'domanda',
              title: TITOLO_DOMANDA_PROPRIA,
              body: testo,
            });
            gradino.svela();
          }}
        />
      )}

      {!gradino.coperta && (
      <FiloDellIndagine
        domanda={currentCase.question}
        passo="Primo dei tre gesti"
        contributo={
          giaVistoNelGiorno0(currentCase.id, dossier)
            ? "Questa forma l'avete già girata nel Giorno 0, ma allora era solo una forma senza nome. Adesso tornate a guardarla sapendo che cos'è — e con gli strumenti per farvi mostrare i punti che contano."
            : "Prima di capire che cosa la mutazione manda in tilt, bisogna vedere che cosa c'è da mandare in tilt. Qui non rispondete ancora alla domanda: guardate la macchina in gioco."
        }
      />
      )}

      {loading && (
        <div className="molstar-wrap flex items-center justify-center text-[#e8e0d4] font-mono text-sm">
          Contatto AlphaFold DB per {currentCase.protein.uniprot}…
        </div>
      )}

      {error && noStructure && (
        <Note label="Questa proteina non è in AlphaFold">
          {error}
          <br />
          <span className="text-ink-muted text-[13px]">
            Ottima occasione per una domanda: se nemmeno la banca dati più grande
            del mondo ha tutto, come fanno i ricercatori con le proteine mancanti?{' '}
            <button
              onClick={() => onNavigate('compare')}
              className="text-accent font-medium hover:underline"
            >
              Intanto proseguite con il confronto dei geni →
            </button>
          </span>
        </Note>
      )}

      {error && !noStructure && (
        <Note label="Problema nel recupero" tone="amber">
          {error}
          <br />
          <span className="text-ink-muted text-[13px]">
            Verifica la connessione: l'app scarica la struttura in tempo reale da
            AlphaFold DB (alphafold.ebi.ac.uk).
          </span>
        </Note>
      )}

      {model && !loading && (
        <>
          {/* ── 1. Guardare, prima di ogni parola ─────────────────────── */}
          <Fase
            n={1}
            titolo="Prima guardala"
            perche={`La domanda parla di qualcosa che si rompe: ecco che cosa. Questa è ${currentCase.protein.name}, ricostruita dai ricercatori. Prendetela col mouse e giratela.`}
          >
            <MolstarViewer url={model.modelUrl} format={model.format} onReady={setViewer} />
            <p className="text-[13px] text-ink-muted mt-2">
              Trascina con il mouse per ruotare · rotellina per lo zoom.
            </p>
          </Fase>

          {/* ── 2. Ora la parola: cosa sono quelle forme ──────────────── */}
          <Fase
            n={2}
            titolo="Che cosa hai davanti"
            perche="L'avete girata e vi siete fatti un'idea. Adesso diamo un nome a quello che avete visto: senza queste parole, il resto resterebbe un disegno colorato."
          >
            <CosaStaiGuardando voci={LEGGERE_LA_3D.voci} cerca={LEGGERE_LA_3D.cerca} />
          </Fase>

          {/* ── 3. Solo ora ha senso indicare un punto preciso ────────── */}
          {viewer && azioni.length > 0 && (
            <Fase
              n={3}
              titolo="Questa forma è scritta da qualche parte"
              perche="Nessuno l'ha disegnata: questa forma nasce da un gene, cioè da una sequenza di lettere. Fra poco quelle lettere le leggerete davvero — col primo pulsante vedete a quale pezzo di questa struttura corrispondono. Dove puntare lo calcola l'app dai dati veri."
            >
              <div className="flex flex-wrap gap-2">
                {azioni.map((az) => (
                  <button
                    key={az.id}
                    onClick={() => eseguiAzione(az.id)}
                    className={`rounded-lg border px-3.5 py-2 text-[13px] transition ${
                      az.id === 'gira' && gira
                        ? 'border-accent bg-accent text-white'
                        : 'border-rule bg-white/60 text-ink-light hover:border-accent/50 hover:text-accent'
                    }`}
                  >
                    {az.id === 'gira' && gira ? 'Ferma la rotazione' : az.label}
                  </button>
                ))}
              </div>
              {ultimaSpiegazione ? (
                <p className="text-[14.5px] text-ink-light mt-3.5 border-l-2 border-accent pl-3">
                  {ultimaSpiegazione}
                </p>
              ) : (
                <p className="text-[13.5px] text-ink-muted mt-3">
                  Premete un pulsante: la struttura si muove, e qui sotto compare
                  cosa state guardando.
                </p>
              )}
            </Fase>
          )}

          {/* ── 4. Un conto che non si può copiare ────────────────────── */}
          {tratto > 0 && !!model.sequenceLength && tratto < model.sequenceLength && (
            <Fase
              n={4}
              titolo="Fai tu un conto"
              perche="Il gene che state studiando è solo un pezzo di questa proteina. Quanto piccolo? Metterlo in numeri cambia il modo di guardarlo: è la differenza fra «mi sembra poco» e sapere quanto."
            >
              <Esercizio
                id="proteina-percentuale"
                consegna={`Il gene che state studiando copre ${tratto} amminoacidi, ma la proteina intera ne ha ${model.sequenceLength}. Che percentuale della proteina avete davanti? (numero intero)`}
                expected={String(Math.round((tratto / model.sequenceLength) * 100))}
                placeholder="es. 12"
                explanation={`${tratto} diviso ${model.sequenceLength}, per cento, fa circa ${Math.round((tratto / model.sequenceLength) * 100)}%. Tutto il vostro lavoro riguarda questa fetta: il resto della proteina esiste, ma non lo state guardando.`}
              />
            </Fase>
          )}

          {/* ── 5. Scrivere, e ricevere una risposta vera ─────────────── */}
          <Fase
            n={5}
            titolo="Scrivi cosa hai capito"
            perche="Guardare non basta: quello che resta è ciò che riuscite a dire con parole vostre. Salvate, e il tutor vi risponde davvero."
          >
            <ProjectWork
              onDraft={setDraft}
              consegna="Descrivete la forma che avete davanti: è raggomitolata e compatta o lunga e distesa? Prevalgono le spirali o i nastri piatti? E secondo voi quella forma a cosa serve?"
              onSave={(txt) => {
                addEntry({
                  kind: 'proteina',
                  title: `Project work · Struttura di ${model.proteinName ?? currentCase.protein.name}`,
                  body: txt,
                  data: { uniprot: model.uniprot },
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

          {/* ── 6. Il tutor: risponde al loro testo e alle loro domande ── */}
          <Fase
            n={6}
            titolo="Parlane con il tutor"
            perche="Qui trovate la sua risposta a quello che avete scritto, e potete chiedergli tutto il resto. Conosce i dati di questa schermata."
          >
            <AiTutor
              title="Il tutor racconta la struttura"
              cardine="Guardate la forma girandola: dov'è più compatta e dove sembra più esposta? Secondo voi la parte compatta tiene insieme il resto — e se cambiasse, la proteina reggerebbe lo stesso?"
              context={aiContext}
              reazione={reazione ?? undefined}
              intro="Chiedimi quello che vuoi su ciò che stai guardando: cosa sono le spirali, perché la forma conta, dove sono le parti più stabili."
              suggestions={[
                'Perché si ripiega proprio così?',
                'A cosa serve questa forma?',
                'Cosa succede se cambia un amminoacido?',
              ]}
            />
          </Fase>

          {/* ── 7. Mettere via il risultato ───────────────────────────── */}
          <Fase
            n={7}
            titolo="Metti la proteina nel dossier"
            perche="Avete la prima metà della risposta: sapete che cosa la mutazione può rompere. Salvatela — è la prima tappa del racconto che porterete alla giuria."
          >
            <AddToDossierButton
              onAdd={() =>
                addEntry({
                  kind: 'proteina',
                  title: `Proteina 3D: ${model.proteinName ?? currentCase.protein.name}`,
                  body: `Ho osservato la struttura 3D di ${model.proteinName ?? currentCase.protein.name} (UniProt ${model.uniprot}), scaricata da AlphaFold DB.`,
                  data: {
                    uniprot: model.uniprot,
                    proteinName: model.proteinName,
                    organism: model.organism,
                    sequenceLength: model.sequenceLength,
                    source: 'AlphaFold DB',
                  },
                })
              }
            />

            {/* Riferimento, fuori dal percorso: chi vuole i numeri li apre. */}
            <details className="mt-4 rounded-lg border border-rule bg-white/30 px-4 py-3">
              <summary className="cursor-pointer text-[13.5px] text-ink-light">
                Da dove viene questa struttura (per i curiosi)
              </summary>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[13.5px] mt-3">
                <Field label="Nome" value={model.proteinName ?? currentCase.protein.name} />
                <Field label="UniProt ID" value={model.uniprot} />
                {model.organism && <Field label="Organismo" value={model.organism} />}
                {model.sequenceLength && (
                  <Field label="Lunghezza" value={`${model.sequenceLength} amminoacidi`} />
                )}
                <Field label="Fonte" value="AlphaFold DB (EMBL-EBI + DeepMind)" />
                {model.modelVersion && (
                  <Field label="Versione" value={`v${model.modelVersion}`} />
                )}
              </div>
              <p className="text-[13px] text-ink-muted mt-3">
                L'app non predice la forma: la <strong>scarica</strong> già calcolata da
                AlphaFold DB. L'AI la racconta, non la inventa.
              </p>
            </details>
          </Fase>
        </>
      )}

      <ProssimoPasso
        fatto="Avete guardato la forma della proteina."
        ora="Il passo successivo è scoprire se il gene che la costruisce cambia da una versione all'altra."
        azione="Confronta i due geni"
        onGo={() => onNavigate('compare')}
        alternativa={{ testo: 'rivedi il dossier', onGo: () => onNavigate('dossier') }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-rule">
      <span className="font-mono text-[10px] tracking-[.13em] uppercase text-accent min-w-32 pt-0.5 shrink-0">
        {label}
      </span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
