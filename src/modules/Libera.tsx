import { useRef, useState } from 'react';
import type { PageId } from '../App';
import type { Case, NamedSequence } from '../types';
import { useStore } from '../store';
import { PageHeader, Note, Fase, CosaStaiGuardando } from '../components/ui';
import { PhaseTutor } from '../components/PhaseTutor';
import { fetchAlphaFoldModel } from '../lib/alphafold';
import { cleanDna } from '../lib/dna';
import {
  altreSpecie,
  cercaProteine,
  linkUniProt,
  sequenzaProteina,
  type RisultatoUniProt,
} from '../lib/uniprot';

/**
 * Modalità libera: la squadra sceglie la propria proteina e conduce l'indagine.
 *
 * Principio che regge tutta la schermata: si guida lo STRUMENTO passo passo —
 * cosa digitare, cos'è un accession, come leggere i risultati — e non si guida
 * mai la SCELTA. Brancolare su un sito in inglese non insegna nulla; decidere
 * che cosa studiare invece è esattamente il senso di questa giornata, ed è ciò
 * che la squadra porterà davanti alla giuria.
 *
 * Per questo i suggerimenti pronti compaiono solo DOPO che hanno provato a
 * cercare qualcosa di loro: sono una rete, non la prima scorciatoia offerta.
 */

/** Rete di sicurezza: si mostra solo a chi ha già provato a cercare da sé. */
const RETE: { uniprot: string; nome: string }[] = [
  { uniprot: 'P42212', nome: 'GFP — la proteina fluorescente della medusa' },
  { uniprot: 'P00698', nome: "Lisozima — l'antibatterico dell'uovo" },
  { uniprot: 'P02144', nome: "Mioglobina — l'ossigeno nei muscoli" },
  { uniprot: 'P04406', nome: 'GAPDH — un enzima presente in quasi tutti i viventi' },
  { uniprot: 'P0DTC2', nome: 'Spike — la chiave del SARS-CoV-2' },
  { uniprot: 'P01308', nome: 'Insulina — regola lo zucchero nel sangue' },
];

interface Scelta {
  accession: string;
  nome: string;
  organismo: string;
  seq: string;
  gene?: string;
}

export function Libera({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { startCustomCase } = useStore();

  // (a) l'argomento: nessuna guida, solo il tutor che incalza
  const [interesse, setInteresse] = useState('');
  const [interesseInviato, setInteresseInviato] = useState('');

  // (b) la ricerca su UniProt
  const [testo, setTesto] = useState('');
  const [organismo, setOrganismo] = useState('');
  const [soloRevisionati, setSoloRevisionati] = useState(true);
  const [risultati, setRisultati] = useState<RisultatoUniProt[] | null>(null);
  const [queryUsata, setQueryUsata] = useState('');
  const [cercando, setCercando] = useState(false);
  const [erroreRicerca, setErroreRicerca] = useState<string | null>(null);
  const [haCercato, setHaCercato] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // (c) la proteina scelta, verificata dall'app
  const [scelta, setScelta] = useState<Scelta | null>(null);
  const [verifica, setVerifica] = useState<string | null>(null);
  const [verificaOk, setVerificaOk] = useState(false);

  // il secondo termine di confronto
  const [ortologhi, setOrtologhi] = useState<RisultatoUniProt[] | null>(null);
  const [seconda, setSeconda] = useState<Scelta | null>(null);
  const [caricandoSeconda, setCaricandoSeconda] = useState(false);

  // (d) la domanda: è il progetto, quindi è obbligatoria
  const [titolo, setTitolo] = useState('');
  const [domanda, setDomanda] = useState('');
  const [domandaInviata, setDomandaInviata] = useState('');

  // opzione per chi ha già due sequenze di DNA (di norma dal docente)
  const [mostraDna, setMostraDna] = useState(false);
  const [seqA, setSeqA] = useState<NamedSequence>({ label: '', dna: '' });
  const [seqB, setSeqB] = useState<NamedSequence>({ label: '', dna: '' });

  async function cerca() {
    const q = testo.trim();
    if (!q) return;
    abort.current?.abort();
    const c = new AbortController();
    abort.current = c;
    setCercando(true);
    setErroreRicerca(null);
    setHaCercato(true);
    try {
      const { risultati: r, query } = await cercaProteine(q, {
        soloRevisionati,
        organismo,
        limite: 10,
        signal: c.signal,
      });
      setRisultati(r);
      setQueryUsata(query);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setErroreRicerca(String(e instanceof Error ? e.message : e));
      setRisultati([]);
    } finally {
      setCercando(false);
    }
  }

  async function scegli(accession: string) {
    setVerifica('Leggo il record su UniProt…');
    setVerificaOk(false);
    setSeconda(null);
    setOrtologhi(null);
    try {
      const s = await sequenzaProteina(accession);
      const gene = risultati?.find((r) => r.accession === accession)?.gene;
      setScelta({ accession, nome: s.nome, organismo: s.organismo, seq: s.sequenza, gene });
      const testa = `${s.nome} — ${s.organismo}, ${s.sequenza.length} amminoacidi.`;
      // Serve anche la struttura 3D: se AlphaFold non ce l'ha, è meglio saperlo
      // adesso che scoprirlo davanti alla giuria.
      try {
        await fetchAlphaFoldModel(accession);
        setVerifica(`${testa} AlphaFold ha la sua struttura 3D: potrete vederla girare.`);
      } catch {
        setVerifica(
          `${testa} Attenzione: AlphaFold non ha la struttura 3D di questa proteina (capita con le più lunghe), quindi il primo gesto non sarà disponibile. Potete tenerla lo stesso o sceglierne un'altra.`,
        );
      }
      setVerificaOk(true);
      if (gene) {
        setCaricandoSeconda(true);
        try {
          setOrtologhi(await altreSpecie(gene, accession));
        } catch {
          setOrtologhi([]);
        } finally {
          setCaricandoSeconda(false);
        }
      } else {
        setOrtologhi([]);
      }
    } catch (e) {
      setVerifica(String(e instanceof Error ? e.message : e));
      setVerificaOk(false);
    }
  }

  async function scegliSeconda(accession: string) {
    try {
      const s = await sequenzaProteina(accession);
      setSeconda({ accession, nome: s.nome, organismo: s.organismo, seq: s.sequenza });
    } catch {
      /* niente seconda proteina: il confronto semplicemente non ci sarà */
    }
  }

  const dnaIncollato = cleanDna(seqA.dna).length >= 3 && cleanDna(seqB.dna).length >= 3;
  const puoAvviare = !!scelta && verificaOk && domanda.trim().length >= 15;

  function avvia() {
    if (!scelta) return;
    const sequences: NamedSequence[] = [];
    if (cleanDna(seqA.dna).length >= 3) {
      sequences.push({ label: seqA.label.trim() || 'Sequenza A', dna: cleanDna(seqA.dna) });
    }
    if (cleanDna(seqB.dna).length >= 3) {
      sequences.push({ label: seqB.label.trim() || 'Sequenza B', dna: cleanDna(seqB.dna) });
    }
    const proteine = seconda
      ? [
          {
            label: `${scelta.nome} — ${scelta.organismo}`,
            uniprot: scelta.accession,
            seq: scelta.seq,
          },
          {
            label: `${seconda.nome} — ${seconda.organismo}`,
            uniprot: seconda.accession,
            seq: seconda.seq,
          },
        ]
      : undefined;

    const c: Case = {
      id: `custom_${scelta.accession}_${Date.now().toString(36)}`,
      title: titolo.trim() || `Indagine su ${scelta.nome}`,
      question: domanda.trim(),
      intro:
        'Indagine libera: la proteina, la domanda e il confronto li ha scelti la squadra. I dati restano quelli veri — struttura da AlphaFold DB, sequenze da UniProt.',
      sequences,
      proteine,
      protein: { uniprot: scelta.accession, name: scelta.nome },
      custom: true,
      provenance: proteine
        ? `Sequenze proteiche reali da UniProt (${scelta.accession} e ${seconda!.accession}). Struttura 3D da AlphaFold DB. Nessun dato ricostruito.`
        : `Struttura 3D reale da AlphaFold DB (UniProt ${scelta.accession}).`,
    };
    startCustomCase(c);
    onNavigate('protein');
  }

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Laboratorio · Il vostro progetto"
        title={
          <>
            Scegliete voi la <em className="text-accent not-italic italic">proteina</em>
          </>
        }
        dek="Fin qui avete indagato casi preparati da noi. Da adesso l'indagine è vostra: la proteina, la domanda e il confronto li decidete voi. Gli strumenti ve li mostriamo passo passo."
      />

      {/* ── (a) La scelta: non la suggerisce nessuno ────────────────────── */}
      <Fase
        n={1}
        titolo="Di che cosa vi interessa parlare?"
        perche="Questa parte non ve la può dare nessuno: è la vostra. Uno sport, una malattia che avete sentito nominare, un animale, il cibo, il sonno — quasi tutto, nel corpo, è fatto o regolato da proteine."
      >
        <textarea
          value={interesse}
          onChange={(e) => setInteresse(e.target.value)}
          rows={2}
          aria-label="Di cosa vi interessa parlare"
          placeholder="Ci interesserebbe capire qualcosa su…"
          className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => setInteresseInviato(interesse.trim())}
          disabled={!interesse.trim()}
          className="mt-2 rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-ink-light transition"
        >
          Parlane con il tutor
        </button>
        {interesseInviato && (
          <PhaseTutor
            phaseLabel="Progetto libero · la scelta dell'argomento"
            teamInput={interesseInviato}
            brief="La squadra sta scegliendo l'argomento del proprio progetto finale. NON proporre tu una proteina e non fare tu la scelta: aiutali a mettere a fuoco che cosa li incuriosisce davvero, così che sappiano che parola cercare. La scelta resta loro."
            cardine="Di quella cosa, che aspetto vi incuriosisce di più? Ditelo in una frase sola: è da lì che si capisce quale proteina andare a cercare."
          />
        )}
      </Fase>

      {/* ── (b) Lo strumento: guidato in modo perfino pedante ───────────── */}
      <Fase
        n={2}
        titolo="Cercate la vostra proteina"
        perche="Adesso lo strumento — e qui vi guidiamo passo passo. Questa ricerca interroga davvero UniProt, la banca dati mondiale delle proteine: gli stessi dati che trovereste su uniprot.org, presentati in modo leggibile."
      >
        <CosaStaiGuardando
          voci={[
            {
              termine: 'Si cerca in inglese',
              spiegazione:
                '«emoglobina» non restituisce nulla, «hemoglobin» sì. Non è un capriccio del sito: la scienza di tutto il mondo pubblica in inglese, e la banca dati parla quella lingua.',
            },
            {
              termine: "L'accession",
              spiegazione:
                'è il codice di ogni proteina — P68871, P42212, P0DTC2. Funziona come un codice fiscale: identifica una proteina precisa di una specie precisa, senza ambiguità.',
            },
            {
              termine: 'Record revisionati',
              spiegazione:
                'sono quelli controllati a mano dai curatori. Sono molti meno, ma affidabili: per questo partiamo con questo filtro acceso.',
            },
          ]}
          cerca="scrivete in inglese il nome di quello che vi interessa — «insulin», «collagen», «keratin», «myosin». Se non conoscete la parola inglese, provate a scriverla come viene: spessissimo somiglia."
        />

        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="flex-1 min-w-56">
            <label className="font-mono text-[10px] tracking-[.13em] uppercase text-accent">
              Che cosa cercate
            </label>
            <input
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cerca()}
              placeholder="es. insulin, collagen, myosin…"
              className="mt-1 block w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] tracking-[.13em] uppercase text-accent">
              Organismo (facoltativo)
            </label>
            <input
              value={organismo}
              onChange={(e) => setOrganismo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && cerca()}
              placeholder="es. human, mouse"
              className="mt-1 block w-40 rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={cerca}
            disabled={cercando || !testo.trim()}
            className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition"
          >
            {cercando ? 'Cerco su UniProt…' : 'Cerca'}
          </button>
        </div>

        <label className="flex items-center gap-2 mt-2.5 text-[13px] text-ink-light">
          <input
            type="checkbox"
            checked={soloRevisionati}
            onChange={(e) => setSoloRevisionati(e.target.checked)}
            style={{ accentColor: 'var(--color-accent-2)' }}
          />
          Solo record revisionati a mano (consigliato)
        </label>

        {/* Il filtro applicato si dichiara sempre: una ricerca scientifica è
            ristretta per forza, e i criteri si dicono. Nasconderli sarebbe la
            lezione sbagliata. */}
        {queryUsata && (
          <p className="text-[12px] text-ink-muted mt-2.5 font-mono break-all">
            Ricerca inviata a UniProt:{' '}
            <span className="text-ink-light">{queryUsata}</span>
          </p>
        )}

        {erroreRicerca && (
          <Note label="La ricerca non è riuscita" tone="amber">
            {erroreRicerca}
          </Note>
        )}

        {risultati && risultati.length === 0 && !erroreRicerca && (
          <p className="text-[14px] text-ink-light mt-3">
            Nessun risultato. Due cose da provare: il nome in inglese, oppure
            togliere il filtro sull'organismo.
          </p>
        )}

        {risultati && risultati.length > 0 && (
          <>
            <p className="text-[13px] text-ink-muted mt-4 mb-2">
              I primi {risultati.length} risultati. Su uniprot.org ne uscirebbero
              spesso migliaia: quello che cambia è il filtro, non i dati.
            </p>
            <div className="space-y-2">
              {risultati.map((r) => (
                <div
                  key={r.accession}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-white/40 px-4 py-3"
                >
                  <span className="font-mono text-[12px] text-accent min-w-16">
                    {r.accession}
                  </span>
                  <span className="flex-1 min-w-48">
                    <span className="text-[14.5px] text-ink">{r.nome}</span>
                    <span className="block text-[12.5px] text-ink-muted italic">
                      {r.organismo} · {r.lunghezza} amminoacidi
                      {r.gene ? ` · gene ${r.gene}` : ''}
                      {r.revisionato ? ' · revisionato' : ''}
                    </span>
                  </span>
                  <a
                    href={linkUniProt(r.accession)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] text-ink-muted hover:text-accent underline"
                  >
                    vedi il record vero
                  </a>
                  <button
                    onClick={() => scegli(r.accession)}
                    className="rounded-lg bg-ink text-paper px-3.5 py-2 text-[13px] font-medium hover:bg-ink-light transition"
                  >
                    Scelgo questa
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Rete, non scorciatoia: appare solo dopo che hanno provato a cercare. */}
        {haCercato && !scelta && (
          <details className="mt-4 rounded-lg border border-rule bg-white/30 px-4 py-3">
            <summary className="cursor-pointer text-[13.5px] text-ink-light">
              Non trovate niente che vi convince? Qualche proteina da cui partire
            </summary>
            <div className="flex flex-wrap gap-2 mt-3">
              {RETE.map((s) => (
                <button
                  key={s.uniprot}
                  onClick={() => scegli(s.uniprot)}
                  className="rounded-full border border-rule bg-white/50 px-3 py-1.5 text-[12.5px] text-ink-light hover:border-accent/50 hover:text-accent transition"
                >
                  {s.nome}
                </button>
              ))}
            </div>
          </details>
        )}
      </Fase>

      {/* ── (c) La verifica: la fa l'app, e dice cosa ha trovato ────────── */}
      {verifica && (
        <Fase
          n={3}
          titolo="Avete preso quella giusta?"
          perche="Un codice sbagliato manderebbe a monte tutto il progetto, e ve ne accorgereste tardi. Il controllo lo fa l'app: legge il record su UniProt e vi dice che cosa avete davvero in mano."
        >
          <Note
            label={verificaOk ? 'Verificato su UniProt' : 'Attenzione'}
            tone={verificaOk ? 'green' : 'amber'}
          >
            {verifica}
          </Note>
          {scelta && (
            <p className="text-[13px] text-ink-muted">
              Accession <span className="font-mono text-accent">{scelta.accession}</span> ·{' '}
              <a
                href={linkUniProt(scelta.accession)}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-accent"
              >
                fuori dall'app questo record si trova su uniprot.org
              </a>
              , dove si cerca in inglese esattamente come avete fatto qui.
            </p>
          )}
        </Fase>
      )}

      {/* ── Il secondo termine di confronto ─────────────────────────────── */}
      {scelta && (
        <Fase
          n={4}
          titolo="Con che cosa la confrontiamo?"
          perche="Il secondo gesto — confrontare — ha bisogno di due sequenze. La più interessante da mettere accanto alla vostra è la stessa proteina in un'altra specie: «quanto si somiglia nell'uomo e nel topo?» è una domanda di evoluzione vera."
        >
          <Note label="Perché qui confrontiamo proteine e non DNA">
            UniProt è la banca dati delle <strong>proteine</strong>: il DNA non ce
            l'ha, quello sta in banche diverse (ENA, GenBank). Quindi qui
            confronteremo sequenze di amminoacidi — quelle vere, scaricate. Non
            ricostruiamo il DNA a partire dalla proteina: sembrerebbe comodo, ma
            quel DNA non esisterebbe in nessun organismo, e sarebbe un dato
            inventato. Codoni e frameshift restano il lavoro sui casi preparati,
            dove il DNA c'è per davvero.
          </Note>

          {caricandoSeconda && (
            <p className="text-[13.5px] text-ink-muted italic">
              Cerco la stessa proteina in altre specie…
            </p>
          )}

          {ortologhi && ortologhi.length > 0 && (
            <div className="space-y-2 mt-3">
              {ortologhi.map((r) => (
                <div
                  key={r.accession}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 ${
                    seconda?.accession === r.accession
                      ? 'border-accent-2/50 bg-[rgba(26,107,82,.08)]'
                      : 'border-rule bg-white/40'
                  }`}
                >
                  <span className="font-mono text-[12px] text-accent min-w-16">
                    {r.accession}
                  </span>
                  <span className="flex-1 min-w-40 text-[14px] text-ink">
                    {r.organismo}
                    <span className="text-ink-muted"> · {r.lunghezza} amminoacidi</span>
                  </span>
                  <button
                    onClick={() => scegliSeconda(r.accession)}
                    className="rounded-lg border border-rule px-3 py-1.5 text-[12.5px] text-ink-light hover:border-accent hover:text-accent transition"
                  >
                    {seconda?.accession === r.accession
                      ? '✓ scelta'
                      : 'Confronta con questa'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {ortologhi && ortologhi.length === 0 && !caricandoSeconda && (
            <p className="text-[14px] text-ink-light mt-2">
              Non ho trovato la stessa proteina in altre specie fra i record
              revisionati. Potete proseguire lo stesso: farete la struttura 3D e il
              dossier, e il confronto lo aggiungerete se trovate un secondo dato.
            </p>
          )}

          {seconda && scelta && (
            <p className="text-[14px] text-ink-light mt-3 border-l-2 border-accent-2 pl-3">
              Confronterete <strong>{scelta.organismo}</strong> con{' '}
              <strong>{seconda.organismo}</strong>: {scelta.seq.length} e{' '}
              {seconda.seq.length} amminoacidi, due sequenze reali prese da UniProt.
            </p>
          )}

          <details className="mt-4 rounded-lg border border-rule bg-white/30 px-4 py-3">
            <summary
              className="cursor-pointer text-[13.5px] text-ink-light"
              onClick={() => setMostraDna(true)}
            >
              Avete già due sequenze di DNA da confrontare? (per esempio dal docente)
            </summary>
            {mostraDna && (
              <>
                <p className="text-[13px] text-ink-muted mt-3">
                  Incollatele qui: in quel caso il confronto sarà a livello di DNA,
                  con codoni e amminoacidi, come nei casi preparati. Devono essere
                  sequenze vere, prese da una banca dati o dal docente.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  {[
                    { s: seqA, set: setSeqA, ph: 'Prima sequenza' },
                    { s: seqB, set: setSeqB, ph: 'Seconda sequenza' },
                  ].map((row, i) => (
                    <div key={i} className="rounded-lg border border-rule p-3 bg-white/40">
                      <input
                        value={row.s.label}
                        onChange={(e) => row.set({ ...row.s, label: e.target.value })}
                        placeholder={`Etichetta (${row.ph})`}
                        className="w-full mb-2 rounded-md border border-rule bg-white/60 px-2.5 py-1.5 text-[13px] text-ink focus:outline-none focus:border-accent"
                      />
                      <textarea
                        value={row.s.dna}
                        onChange={(e) => row.set({ ...row.s, dna: e.target.value })}
                        rows={3}
                        maxLength={3200}
                        aria-label={`Sequenza di DNA — ${row.ph}`}
                        placeholder="ATGC…"
                        className="w-full rounded-md border border-rule bg-white/60 px-2.5 py-1.5 text-[12px] font-mono text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  ))}
                </div>
                {dnaIncollato && (
                  <p className="text-[13px] text-accent-2 mt-2">
                    ✓ Due sequenze di DNA riconosciute: il modulo «Confronta» partirà
                    da queste.
                  </p>
                )}
              </>
            )}
          </details>
        </Fase>
      )}

      {/* ── (d) La domanda: è il progetto, quindi è obbligatoria ────────── */}
      {scelta && (
        <Fase
          n={5}
          titolo="La vostra domanda"
          perche="Nei casi preparati la domanda ve la davamo noi, e serviva a farvi vedere come è fatta. Qui l'indagine è vostra: la domanda è il progetto, ed è la prima cosa che la giuria vi chiederà."
        >
          <input
            value={titolo}
            onChange={(e) => setTitolo(e.target.value)}
            placeholder="Un titolo per l'indagine (facoltativo)"
            className="w-full mb-2 rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
          />
          <textarea
            value={domanda}
            onChange={(e) => setDomanda(e.target.value)}
            rows={2}
            aria-label="La domanda della vostra indagine"
            placeholder="La domanda a cui volete rispondere…"
            className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
          />
          {domanda.trim().length > 0 && domanda.trim().length < 15 && (
            <p className="text-[13px] text-accent mt-1.5">
              Ancora un po': una domanda d'indagine dice che cosa volete scoprire,
              non soltanto di che cosa parlate.
            </p>
          )}

          <button
            onClick={() => setDomandaInviata(domanda.trim())}
            disabled={domanda.trim().length < 15}
            className="mt-2 rounded-lg border border-rule px-4 py-2 text-sm text-ink-light disabled:opacity-40 hover:border-accent hover:text-accent transition"
          >
            Fatti aiutare a metterla a fuoco
          </button>
          {domandaInviata && (
            <PhaseTutor
              phaseLabel="Progetto libero · la domanda d'indagine"
              teamInput={domandaInviata}
              brief={`La squadra ha scelto la proteina ${scelta.nome} (${scelta.organismo}, UniProt ${scelta.accession}) e ha scritto la propria domanda d'indagine. Il tuo compito è aiutarli a renderla più precisa FACENDO DOMANDE: non riformularla tu, non proporre tu una versione migliore. Se la domanda non si può indagare con gli strumenti che hanno (struttura 3D, confronto fra sequenze), fai notare il problema con una domanda.`}
              cardine="Con quale dei tre gesti pensate di rispondere a questa domanda: guardare la forma, confrontare due sequenze, o leggere il DNA? Se non ce n'è uno, forse la domanda va stretta un po'."
            />
          )}

          <div className="mt-5">
            <button
              onClick={avvia}
              disabled={!puoAvviare}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition ${
                puoAvviare ? 'bg-accent hover:opacity-90 cta-pulse' : 'bg-ink-muted opacity-40'
              }`}
            >
              Avviate la vostra indagine <span className="nudge">→</span>
            </button>
            {!puoAvviare && (
              <span className="ml-3 text-[13px] text-ink-muted">
                Serve la domanda: senza, non è un'indagine.
              </span>
            )}
          </div>
        </Fase>
      )}

      <Note label="Resta tutto vero">
        Anche qui vale la regola d'oro: la struttura 3D viene da AlphaFold DB, le
        sequenze proteiche da UniProt, il confronto da un algoritmo reale. L'AI
        spiega e guida, non inventa dati.
      </Note>
    </div>
  );
}
