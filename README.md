# ETN Genoma

App didattica di **genomica e bioinformatica** per il SmartLab di ETN — l'alternativa a Galaxy, semplice e in italiano. Costruita seguendo il principio del progetto:

> **L'AI spiega e guida. I dati che devono essere esatti vengono da fonti verificate.**
> L'AI generativa non calcola mai un fatto scientifico.

## Cosa fa

Tre moduli scientifici, ognuno una schermata con il tutor AI accanto:

1. **Leggere il DNA** — scegli una sequenza da un caso, l'app la mostra codone per codone con la traduzione in proteina; il tutor la spiega.
2. **Confrontare due geni** — l'app allinea le sequenze con l'algoritmo di **Needleman-Wunsch** (calcolo vero, lato client) e colora combaci e differenze; il tutor interpreta.
3. **Vedere la proteina in 3D** — la struttura si scarica da **AlphaFold DB** e si mostra ruotabile con **Mol\***; il tutor la racconta.

Alla fine ogni squadra costruisce un **dossier d'indagine** navigabile ed esportabile (HTML).

### Un percorso da 60 ore

L'app non è solo i tre moduli: è un laboratorio completo strutturato su **60 ore** (pagina *Programma*), con:

- **Catalogo casi** — 9 casi curati in 4 temi (Malattie genetiche, Evoluzione e specie, Enzimi e difese, Proteine celebri) a difficoltà crescente, che mostrano tipi diversi di mutazione (puntiforme, delezione in-frame, espansione di triplette, silente).
- **Modalità libera** — la squadra sceglie un gene/proteina a piacere (UniProt ID, con verifica su AlphaFold DB) e usa gli stessi moduli: autonomia e progetto di squadra.
- **Laboratorio mutazioni** — muti il DNA (sostituzione/inserzione/delezione) e vedi l'effetto sulla proteina, classificato come silente, missenso, nonsenso o frameshift. Tutto calcolato in modo esatto; l'AI spiega.
- **Teoria** — otto schede essenziali (DNA, gene, codone, proteina, mutazioni, evoluzione, struttura 3D, AI vs dati veri).
- **Quiz e sfide** — tre quiz di autovalutazione con feedback immediato e sfide a squadre da spuntare.
- **Valutazione** — badge di avanzamento e la **rubrica della giuria**, la stessa che userà chi valuta i dossier.

### Cosa prendiamo da Galaxy (addendum)

Criterio: **teniamo ciò che insegna biologia, lasciamo fuori l'infrastruttura** (formati FASTQ/BAM, conversioni, allineamento massivo, account e code). I cinque strumenti chiave di Galaxy si mappano sui tre moduli:

| Strumento Galaxy | Destino | Dove |
| --- | --- | --- |
| FastQC / MultiQC (qualità) | adattato, leggero | **Modulo 1** — controllo qualità a indicatori verde/rosso, prima di fidarsi del dato |
| BLAST + variant calling | importato, semplificato | **Modulo 2** — confronto + card «La scoperta» che dà risalto alla differenza trovata e al suo effetto sull'amminoacido |
| BWA / Bowtie (mapping massivo) | lasciato fuori | — (infrastruttura da laboratorio) |
| Formati di file (FASTQ, BAM, SAM) | nascosti | lo studente vede sequenze e risultati, mai un `.bam` |
| IGV (visualizzazione) | principio ereditato | **Modulo 3** — «il dato va visto»: proteina 3D con Mol\* |

Il lascito da non perdere è la **tracciabilità**: il dossier racconta il percorso (domanda → lettura → confronto → scoperta → 3D → conclusione), il metodo scientifico reso visibile. Vedi [`ADDENDUM-Galaxy.html`](ADDENDUM-Galaxy.html).

## I due motori

| Motore | Cosa fa | Dove sta |
| --- | --- | --- |
| **AI generativa** | spiega, confronta a parole, guida le ipotesi, aiuta a scrivere | `src/lib/ai.ts` → Edge Function → Claude |
| **Dati veri** | allineamento, struttura 3D, lettura DNA | `src/lib/alignment.ts`, `src/lib/alphafold.ts`, `src/lib/dna.ts` |

La chiave del modello AI **non è mai nel browser**: vive solo nella Edge Function proxy.

## Stack

React · TypeScript · Vite · Tailwind CSS v4 · Mol\* (viewer 3D) · Supabase (Edge Function proxy AI) · AlphaFold DB + UniProt (dati esterni gratuiti).

## Avvio in locale

```bash
npm install
cp .env.example .env.local   # compila VITE_AI_PROXY_URL quando il proxy è pronto
npm run dev
```

I moduli scientifici (lettura DNA, confronto, proteina 3D) funzionano **subito**, anche senza AI configurata. Il tutor AI si attiva quando imposti `VITE_AI_PROXY_URL`.

## Il proxy AI (Edge Function)

Il codice è in [`supabase/functions/ai-proxy/index.ts`](supabase/functions/ai-proxy/index.ts). Deploy con Supabase CLI:

```bash
supabase functions deploy ai-proxy --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# opzionale: scegli il modello (default: claude-sonnet-5)
supabase secrets set AI_MODEL=claude-sonnet-5
```

Poi metti l'URL della function in `.env.local`:

```
VITE_AI_PROXY_URL=https://<project-ref>.supabase.co/functions/v1/ai-proxy
```

La function contiene il **prompt di sistema anti-allucinazione**: "Non calcolare mai allineamenti né inventare strutture o numeri scientifici. Usa solo i dati forniti nel contesto. Spiega e guida, in italiano, per uno studente di scuola superiore."

## Aggiungere un caso didattico

I casi sono dati, non codice: aggiungi una voce in [`src/data/cases.ts`](src/data/cases.ts) con domanda, sequenze e UniProt ID della proteina. Nessun'altra modifica necessaria. (In produzione, gli stessi campi diventano una riga in Supabase.)

## Le fasi di costruzione (dal brief)

- **Fase 0** — Proteina 3D da AlphaFold con Mol\* (il pezzo più a rischio, fatto per primo). ✅
- **Fase 1** — AI-interprete: Edge Function proxy + tutor. ✅
- **Fasi 2–4** — I tre moduli. ✅
- **Fase 5** — Il dossier. ✅
- **Fase 6** — Rifinitura e casi reali.

---

Creato da Axonforce · Erogato da ETN · *Costruire per Apprendere*.
