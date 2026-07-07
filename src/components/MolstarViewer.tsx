import { useEffect, useRef, useState } from 'react';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';

interface MolstarViewerProps {
  /** URL del file di coordinate (da AlphaFold DB). */
  url: string;
  format: 'pdb' | 'mmcif';
}

/**
 * Visualizzatore 3D delle proteine con Mol* (la libreria open source usata da
 * AlphaFold DB e RCSB PDB). Carica una struttura VERA da un URL e la mostra
 * ruotabile col mouse. L'app non calcola nulla: mostra ciò che ha scaricato.
 */
export function MolstarViewer({ url, format }: MolstarViewerProps) {
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
        if (!disposed) setLoading(false);
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
