import { useEffect, useRef, useState } from 'react';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';

/**
 * Le poche cose che si possono chiedere alla struttura dall'esterno.
 *
 * Volutamente minime: chi le chiama passa NUMERI DI RESIDUO, non "cerca il sito
 * attivo". Il quale residuo lo decide sempre il codice dell'app a partire dai
 * dati veri — mai il tutor AI, che sceglie solo se proporre l'azione.
 */
export interface MolstarApi {
  /** Inquadra ed evidenzia i residui da..a (numerazione della proteina, 1-based). */
  focusResidues: (from: number, to: number) => void;
  /** Torna alla vista d'insieme e toglie le evidenziazioni. */
  reset: () => void;
  /** Fa ruotare (o ferma) la struttura. */
  spin: (on: boolean) => void;
}

interface MolstarViewerProps {
  /** URL del file di coordinate (da AlphaFold DB). */
  url: string;
  format: 'pdb' | 'mmcif';
  /** Consegna l'API quando la struttura è pronta (null quando si smonta). */
  onReady?: (api: MolstarApi | null) => void;
}

/**
 * Visualizzatore 3D delle proteine con Mol* (la libreria open source usata da
 * AlphaFold DB e RCSB PDB). Carica una struttura VERA da un URL e la mostra
 * ruotabile col mouse. L'app non calcola nulla: mostra ciò che ha scaricato.
 */
export function MolstarViewer({ url, format, onReady }: MolstarViewerProps) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const parentRef = useRef<HTMLDivElement>(null);
  // Il plugin di Mol* non ha un tipo esportato comodo: usiamo `unknown` + guardie.
  const pluginRef = useRef<{ dispose: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [{ createPluginUI }, { renderReact18 }, { DefaultPluginUISpec }] =
          await Promise.all([
            import('molstar/lib/mol-plugin-ui'),
            import('molstar/lib/mol-plugin-ui/react18'),
            import('molstar/lib/mol-plugin-ui/spec'),
          ]);

        if (disposed || !parentRef.current) return;

        // Spec con UI semplificata: teniamo il canvas 3D e i controlli camera,
        // togliamo i pannelli avanzati che confonderebbero i ragazzi.
        const spec = DefaultPluginUISpec();
        spec.layout = {
          initial: {
            isExpanded: false,
            showControls: false,
            regionState: {
              left: 'hidden',
              right: 'hidden',
              top: 'hidden',
              bottom: 'hidden',
            },
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plugin: any = await createPluginUI({
          target: parentRef.current,
          spec,
          render: renderReact18,
        });
        if (disposed) {
          plugin.dispose();
          return;
        }
        pluginRef.current = plugin;

        const data = await plugin.builders.data.download(
          { url, isBinary: false },
          { state: { isGhost: true } },
        );
        const trajectory = await plugin.builders.structure.parseTrajectory(
          data,
          format,
        );
        await plugin.builders.structure.hierarchy.applyPreset(
          trajectory,
          'default',
        );
        if (disposed) return;
        setLoading(false);

        // ── API verso l'esterno ───────────────────────────────────────────
        // Import dinamici: restano nel chunk di Mol*, già caricato a questo punto.
        const [{ Script }, { StructureSelection }] = await Promise.all([
          import('molstar/lib/mol-script/script'),
          import('molstar/lib/mol-model/structure'),
        ]);
        if (disposed) return;

        /** La struttura attualmente caricata (serve per costruire le selezioni). */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const strutturaCorrente = (): any =>
          plugin.managers.structure.hierarchy.current.structures[0]?.cell.obj?.data;

        const api: MolstarApi = {
          focusResidues(from, to) {
            try {
              const data = strutturaCorrente();
              if (!data) return;
              const sel = Script.getStructureSelection(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (Q: any) =>
                  Q.struct.generator.atomGroups({
                    'residue-test': Q.core.rel.inRange([
                      Q.struct.atomProperty.macromolecular.label_seq_id(),
                      from,
                      to,
                    ]),
                  }),
                data,
              );
              const loci = StructureSelection.toLociWithSourceUnits(sel);
              plugin.managers.interactivity.lociSelects.deselectAll();
              plugin.managers.interactivity.lociSelects.selectOnly({ loci });
              plugin.managers.camera.focusLoci(loci);
            } catch {
              /* una struttura senza quei residui non deve rompere la pagina */
            }
          },
          reset() {
            try {
              plugin.managers.interactivity.lociSelects.deselectAll();
              plugin.managers.camera.reset();
            } catch {
              /* ignora */
            }
          },
          spin(on) {
            try {
              plugin.canvas3d?.setProps({
                trackball: {
                  animate: on
                    ? { name: 'spin', params: { speed: 0.6 } }
                    : { name: 'off', params: {} },
                },
              });
            } catch {
              /* ignora */
            }
          },
        };
        onReadyRef.current?.(api);
      } catch (err) {
        if (!disposed) {
          setError(
            `Non è stato possibile mostrare la struttura 3D: ${String(err)}`,
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      disposed = true;
      onReadyRef.current?.(null);
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
    };
  }, [url, format]);

  return (
    <div className="molstar-wrap">
      <div ref={parentRef} style={{ position: 'absolute', inset: 0 }} />
      {loading && !error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e8e0d4',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          Carico la struttura 3D…
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            color: '#f0d9cf',
            background: '#2a1712',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
