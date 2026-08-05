/**
 * Ricerca e sequenze da UniProt, la banca dati mondiale delle proteine.
 *
 * Perché dentro l'app e non "andate su uniprot.org": una squadra che non ha mai
 * visto UniProt cerca in italiano, non trova nulla, e si arena su un sito in
 * inglese pieno di migliaia di risultati. Guidiamo lo STRUMENTO passo passo —
 * cosa digitare, come leggere i risultati — senza mai decidere al posto loro
 * QUALE proteina studiare: quella è la scelta, ed è il senso della modalità
 * libera.
 *
 * Verificato che l'API risponde al fetch diretto dal browser
 * (`access-control-allow-origin: *`), quindi non serve passare dal proxy.
 * I dati sono esattamente quelli del sito: li presentiamo leggibili, non
 * diversi.
 */

const BASE = 'https://rest.uniprot.org/uniprotkb';

export interface RisultatoUniProt {
  accession: string;
  nome: string;
  gene?: string;
  organismo: string;
  lunghezza: number;
  /** true se il record è stato controllato a mano dai curatori (Swiss-Prot). */
  revisionato: boolean;
}

/** Il link al record vero, per chi vuole vedere da dove viene il dato. */
export function linkUniProt(accession: string): string {
  return `https://www.uniprot.org/uniprotkb/${accession}/entry`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mappa(r: any): RisultatoUniProt {
  const d = r?.proteinDescription ?? {};
  const nome =
    d.recommendedName?.fullName?.value ??
    d.submissionNames?.[0]?.fullName?.value ??
    r?.uniProtkbId ??
    r?.primaryAccession ??
    '(senza nome)';
  return {
    accession: r.primaryAccession,
    nome,
    gene: r?.genes?.[0]?.geneName?.value,
    organismo: r?.organism?.scientificName ?? '—',
    lunghezza: r?.sequence?.length ?? 0,
    revisionato: r?.entryType?.includes('Swiss-Prot') ?? false,
  };
}

export interface OpzioniRicerca {
  /** Solo record controllati a mano: meno risultati, tutti affidabili. */
  soloRevisionati?: boolean;
  /** Restringe a un organismo (nome scientifico o comune). */
  organismo?: string;
  limite?: number;
  signal?: AbortSignal;
}

/**
 * Costruisce la query e la restituisce insieme ai risultati: la squadra deve
 * poter vedere il filtro applicato. Una ricerca scientifica è sempre ristretta,
 * e i criteri si dichiarano — nasconderli sarebbe la lezione sbagliata.
 */
export function costruisciQuery(testo: string, opt: OpzioniRicerca = {}): string {
  const parti: string[] = [];
  const t = testo.trim();
  if (t) parti.push(`(${t})`);
  if (opt.organismo?.trim()) parti.push(`organism_name:"${opt.organismo.trim()}"`);
  if (opt.soloRevisionati !== false) parti.push('reviewed:true');
  return parti.join(' AND ') || 'reviewed:true';
}

export async function cercaProteine(
  testo: string,
  opt: OpzioniRicerca = {},
): Promise<{ risultati: RisultatoUniProt[]; query: string }> {
  const query = costruisciQuery(testo, opt);
  const url =
    `${BASE}/search?query=${encodeURIComponent(query)}` +
    `&format=json&size=${opt.limite ?? 10}` +
    `&fields=accession,protein_name,gene_names,organism_name,length`;
  const res = await fetch(url, { signal: opt.signal });
  if (!res.ok) {
    throw new Error(`UniProt ha risposto ${res.status}. Riprovate fra poco.`);
  }
  const data = await res.json();
  return { risultati: (data?.results ?? []).map(mappa), query };
}

/** La sequenza amminoacidica VERA di una proteina. Nessun dato costruito. */
export async function sequenzaProteina(
  accession: string,
  signal?: AbortSignal,
): Promise<{ sequenza: string; nome: string; organismo: string }> {
  const url = `${BASE}/${encodeURIComponent(accession)}.json?fields=accession,protein_name,organism_name,sequence`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Non trovo ${accession} su UniProt (risposta ${res.status}).`);
  }
  const d = await res.json();
  const m = mappa(d);
  return { sequenza: d?.sequence?.value ?? '', nome: m.nome, organismo: m.organismo };
}

/**
 * La stessa proteina in altre specie (ortologhi), cercata per nome del gene.
 * È il modo più naturale per ottenere due sequenze da confrontare: "quanto si
 * somiglia questa proteina nell'uomo e nel topo?" è una domanda di evoluzione
 * vera, coerente con i casi già presenti nel lab.
 */
export async function altreSpecie(
  gene: string,
  escludiAccession: string,
  signal?: AbortSignal,
): Promise<RisultatoUniProt[]> {
  const { risultati } = await cercaProteine(`gene:${gene}`, {
    soloRevisionati: true,
    limite: 12,
    signal,
  });
  const visti = new Set<string>();
  return risultati
    .filter((r) => r.accession !== escludiAccession)
    .filter((r) => {
      if (visti.has(r.organismo)) return false;
      visti.add(r.organismo);
      return true;
    })
    .slice(0, 6);
}
