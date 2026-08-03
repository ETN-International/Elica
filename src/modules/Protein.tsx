import { useEffect, useState } from 'react';
import type { PageId } from '../App';
import type { AlphaFoldModel } from '../types';
import { useStore } from '../store';
import {
  PageHeader,
  Sub,
  Note,
  AddToDossierButton,
  NoCaseNotice,
  Stepper,
  HowTo,
  Esercizio,
  ProjectWork,
  ProssimoPasso,
} from '../components/ui';
import { AiTutor } from '../components/AiTutor';
import { MolstarViewer } from '../components/MolstarViewer';
import { fetchAlphaFoldModel, NoStructureError } from '../lib/alphafold';
import { SCREEN_BRIEFINGS } from '../data/tutorBriefings';

export function Protein({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { currentCase, addEntry } = useStore();
  const [model, setModel] = useState<AlphaFoldModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** true quando AlphaFold non copre questa proteina (non è un guasto). */
  const [noStructure, setNoStructure] = useState(false);
  const [loading, setLoading] = useState(true);

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
        `Caso: ${currentCase.title}`,
        `Domanda biologica: ${currentCase.question}`,
        `Proteina mostrata in 3D: ${model.proteinName ?? currentCase.protein.name}`,
        `UniProt ID: ${model.uniprot}`,
        model.organism ? `Organismo: ${model.organism}` : '',
        model.sequenceLength ? `Lunghezza: ${model.sequenceLength} amminoacidi` : '',
        `Struttura scaricata da AlphaFold DB (modello v${model.modelVersion ?? '?'}).`,
      ]
        .filter(Boolean)
        .join('\n')
    : `${SCREEN_BRIEFINGS.protein}\nCaso: ${currentCase.title}. Proteina: ${currentCase.protein.name} (UniProt ${currentCase.protein.uniprot}).`;

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

      <HowTo
        steps={[
          'Trascina la proteina col mouse per ruotarla; usa la rotellina per lo zoom.',
          'Osserva la forma: dove è compatta e stabile, come la forma crea la funzione.',
          'Chiedi al tutor cosa stai guardando.',
          'Aggiungi la proteina al dossier.',
        ]}
      />

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
          <MolstarViewer url={model.modelUrl} format={model.format} />
          <p className="text-[13px] text-ink-muted mt-2">
            Trascina con il mouse per ruotare · rotellina per lo zoom. Le stesse
            strutture che usano i ricercatori.
          </p>

          <Sub>La scheda della proteina</Sub>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-[14px]">
            <Field label="Nome" value={model.proteinName ?? currentCase.protein.name} />
            <Field label="UniProt ID" value={model.uniprot} />
            {model.organism && <Field label="Organismo" value={model.organism} />}
            {model.sequenceLength && (
              <Field label="Lunghezza" value={`${model.sequenceLength} amminoacidi`} />
            )}
            <Field label="Fonte" value="AlphaFold DB (EMBL-EBI + DeepMind)" />
            {model.modelVersion && (
              <Field label="Versione modello" value={`v${model.modelVersion}`} />
            )}
          </div>

          <Note label="La struttura è vera, non generata">
            L'app non predice la forma della proteina: la <strong>scarica</strong> già
            calcolata da AlphaFold DB — oltre 200 milioni di strutture, API pubblica e
            gratuita. L'AI la racconta, non la inventa.
          </Note>

          {model.sequenceLength && (
            <Esercizio
              consegna="Quanti amminoacidi ha questa proteina? (lo trovi nella scheda qui sopra)"
              expected={String(model.sequenceLength)}
              placeholder="scrivi un numero"
              explanation={`Questa proteina è lunga ${model.sequenceLength} amminoacidi: è la catena che, ripiegandosi, forma la struttura 3D che vedi.`}
            />
          )}

          <ProjectWork
            consegna="Ruotate la proteina e descrivetela: è compatta (globulare) o allungata? Dove sembra più stabile? Collegate la forma alla sua funzione."
            onSave={(txt) =>
              addEntry({
                kind: 'proteina',
                title: `Project work · Struttura di ${model.proteinName ?? currentCase.protein.name}`,
                body: txt,
                data: { uniprot: model.uniprot },
              })
            }
          />

          <div className="mt-4 flex flex-wrap gap-3 items-center">
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
          </div>
        </>
      )}

      <div className="mt-6">
        <AiTutor
          title="Il tutor racconta la struttura"
          context={aiContext}
          intro="Ruota la proteina col mouse. Chiedimi cosa stai guardando: dove sono le parti stabili, come la forma determina la funzione."
          suggestions={[
            'Cosa sto guardando?',
            'Come la forma determina la funzione?',
            'Dove sono le parti stabili?',
          ]}
        />
      </div>

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
