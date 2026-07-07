import type { AlphaFoldModel } from '../types';

/**
 * Recupero della struttura 3D da AlphaFold DB (EMBL-EBI + Google DeepMind).
 *
 * L'app NON calcola la struttura: la scarica già calcolata dai ricercatori.
 * L'API pubblica per UniProt ID restituisce gli URL dei file e i metadati veri.
 *
 * Doc: https://alphafold.ebi.ac.uk/api-docs
 */

const API_BASE = 'https://alphafold.ebi.ac.uk/api/prediction';

interface AlphaFoldApiEntry {
  entryId?: string;
  uniprotAccession?: string;
  uniprotDescription?: string;
  organismScientificName?: string;
  uniprotSequence?: string;
  pdbUrl?: string;
  cifUrl?: string;
  bcifUrl?: string;
  latestVersion?: number | string;
  modelCreatedDate?: string;
}

/**
 * Interroga AlphaFold DB per un UniProt ID e restituisce l'URL del modello
 * (preferendo il formato PDB, leggibile e ben supportato) più i metadati.
 */
export async function fetchAlphaFoldModel(
  uniprot: string,
): Promise<AlphaFoldModel> {
  const id = uniprot.trim().toUpperCase();
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(
      `AlphaFold DB ha risposto ${res.status}. Verifica lo UniProt ID "${id}".`,
    );
  }
  const data = (await res.json()) as AlphaFoldApiEntry[];
  const entry = data?.[0];
  if (!entry) {
    throw new Error(
      `Nessuna struttura trovata su AlphaFold DB per lo UniProt ID "${id}".`,
    );
  }

  const modelUrl = entry.pdbUrl ?? entry.cifUrl;
  if (!modelUrl) {
    throw new Error(
      `AlphaFold DB non ha restituito un file scaricabile per "${id}".`,
    );
  }
  const format: 'pdb' | 'mmcif' = entry.pdbUrl ? 'pdb' : 'mmcif';

  return {
    uniprot: id,
    modelUrl,
    format,
    proteinName: entry.uniprotDescription,
    organism: entry.organismScientificName,
    sequenceLength: entry.uniprotSequence?.length,
    modelVersion: entry.latestVersion?.toString(),
  };
}
