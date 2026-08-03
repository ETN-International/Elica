import type { Dossier, DossierEntry } from '../types';

/**
 * Persistenza del dossier.
 *
 * Di default salva nel browser (localStorage): l'app funziona senza backend.
 * Se in futuro si collega Supabase, questo modulo è il punto dove aggiungere
 * il salvataggio lato server (una riga per squadra).
 */

const STORAGE_KEY = 'etn-genoma-dossier';

export function emptyDossier(): Dossier {
  return { caseId: null, team: '', members: [], entries: [] };
}

export function loadDossier(): Dossier {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDossier();
    const parsed = JSON.parse(raw) as Dossier;
    // Validazione difensiva: se lo storage è corrotto/malformato, riparti pulito.
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
      return emptyDossier();
    }
    return {
      caseId: typeof parsed.caseId === 'string' ? parsed.caseId : null,
      team: typeof parsed.team === 'string' ? parsed.team : '',
      members: Array.isArray(parsed.members) ? parsed.members : [],
      entries: parsed.entries,
    };
  } catch {
    return emptyDossier();
  }
}

export function saveDossier(d: Dossier): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* quota superata o storage non disponibile: ignora silenziosamente */
  }
}

export function makeEntry(
  partial: Omit<DossierEntry, 'id' | 'createdAt'>,
): DossierEntry {
  return {
    ...partial,
    id: `e_${Date.now().toString(36)}_${Math.floor(performance.now()).toString(36)}`,
    createdAt: Date.now(),
  };
}

const KIND_LABEL: Record<DossierEntry['kind'], string> = {
  domanda: 'La domanda',
  dna: 'La sequenza',
  confronto: 'Il confronto',
  proteina: 'La proteina 3D',
  conclusione: 'La conclusione',
};

/** Esporta il dossier come pagina HTML autonoma, navigabile e stampabile. */
export function dossierToHtml(
  d: Dossier,
  caseTitle: string,
  /** Da caseId al titolo leggibile dell'indagine, per etichettare ogni voce. */
  caseLabel: (caseId?: string | null) => string = () => '',
): string {
  const rows = d.entries
    .map((e) => {
      const dataBlock = e.data
        ? `<pre class="data">${escapeHtml(JSON.stringify(e.data, null, 2))}</pre>`
        : '';
      const label = caseLabel(e.caseId);
      const from = label ? ` · ${escapeHtml(label)}` : '';
      // Difesa: una voce corrotta non deve far fallire l'intero export.
      const kind = KIND_LABEL[e.kind] ?? 'Voce';
      return `<section class="entry">
        <div class="kind">${kind}${from}</div>
        <h2>${escapeHtml(e.title ?? '')}</h2>
        <p>${escapeHtml(e.body ?? '').replace(/\n/g, '<br>')}</p>
        ${dataBlock}
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dossier d'indagine · ${escapeHtml(caseTitle)}</title>
<style>
  body{font-family:Georgia,serif;max-width:760px;margin:0 auto;padding:48px 24px;color:#1a1714;line-height:1.6}
  .eyebrow{font-family:ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#c8420a}
  h1{font-size:34px;line-height:1.1;margin:.3em 0}
  .team{color:#7c6f65;font-style:italic}
  .entry{border-top:1px solid #d4c9b8;padding:22px 0}
  .kind{font-family:ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase;font-size:10px;color:#c8420a}
  h2{font-size:20px;margin:.3em 0}
  .data{background:#f5f0e8;padding:12px 14px;border-radius:6px;font-size:12px;overflow:auto;white-space:pre-wrap}
  footer{margin-top:40px;color:#7c6f65;font-size:12px;font-style:italic}
</style></head>
<body>
  <div class="eyebrow">ETN Genoma · Dossier d'indagine</div>
  <h1>${escapeHtml(caseTitle)}</h1>
  <p class="team">Squadra: ${escapeHtml(d.team || '—')}${
    d.members && d.members.filter(Boolean).length > 0
      ? ` · ${escapeHtml(d.members.filter(Boolean).join(', '))}`
      : ''
  }</p>
  ${rows || '<p><em>Il dossier è ancora vuoto.</em></p>'}
  <footer>Costruito nel SmartLab di Genomica e Bioinformatica · Erogato da ETN · Creato da Axonforce</footer>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
