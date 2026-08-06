import { useState } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import { PageHeader, Note, Fase, ProssimoPasso } from '../components/ui';
import { casiSvolti } from '../lib/progresso';
import { RUOLI } from '../lib/ruoli';

/**
 * Fra le squadre.
 *
 * In dieci giornate esisteva UNA sola attività fra squadre — un quiz al G5 — e
 * poi più nulla fino alla giuria. Per un lab di mobilità è il difetto più caro
 * che ci fosse: in quell'aula ci sono ragazzi di scuole e Paesi diversi, e la
 * dimensione sociale è metà della ragione per cui la scuola paga il viaggio. Il
 * lab la usava per formare le squadre il primo giorno e poi la ignorava per otto.
 *
 * C'è anche un motivo didattico, non solo sociale: spiegare a qualcun altro ciò
 * che si è capito è il momento in cui si scopre di non averlo capito. Se accade
 * solo al G10, non c'è più tempo per rimediare.
 *
 * Nota di progetto: questi sono momenti di CONDUZIONE, non moduli. L'app non
 * mette in rete i dispositivi (ogni squadra ha il suo, i dati restano nel
 * browser): guida l'incontro, tiene il tempo, e raccoglie ciò che ne esce.
 */

type Momento = 'scambio' | 'revisione' | 'parete';

const MOMENTI: { id: Momento; tag: string; titolo: string; quando: string }[] = [
  {
    id: 'scambio',
    tag: 'Giorno 6 · Metà percorso',
    titolo: 'Raccontate il vostro caso a un’altra squadra',
    quando: 'a metà percorso',
  },
  {
    id: 'revisione',
    tag: 'Giorno 9 · Prima della giuria',
    titolo: 'Leggete il dossier di un’altra squadra',
    quando: 'prima della giuria',
  },
  {
    id: 'parete',
    tag: 'Ogni giorno · Cinque minuti',
    titolo: 'La parete comune',
    quando: 'a fine giornata',
  },
];

export function Insieme({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { dossier, addEntry } = useStore();
  // Il momento giusto si deduce da quanto ha lavorato la squadra, ma resta
  // scegliibile: in aula le giornate slittano sempre.
  const suggerito: Momento = casiSvolti(dossier) >= 4 ? 'revisione' : 'scambio';
  const [momento, setMomento] = useState<Momento>(suggerito);

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Fra le squadre"
        title={
          <>
            Qualcuno che non è il <em className="text-accent not-italic italic">tutor</em>
          </>
        }
        dek="Fin qui avete parlato con l'app, con il tutor e fra di voi. Qui si parla con un'altra squadra: è il modo più veloce per scoprire quali pezzi del vostro ragionamento reggono e quali no."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {MOMENTI.map((m) => (
          <button
            key={m.id}
            onClick={() => setMomento(m.id)}
            className={`rounded-full border px-4 py-2 text-[13px] transition ${
              momento === m.id
                ? 'border-accent bg-accent text-white'
                : 'border-rule bg-white/40 text-ink-light hover:border-accent/50'
            }`}
          >
            {m.titolo}
          </button>
        ))}
      </div>

      {momento === 'scambio' && <Scambio onSalva={addEntry} onNavigate={onNavigate} />}
      {momento === 'revisione' && <Revisione onSalva={addEntry} onNavigate={onNavigate} />}
      {momento === 'parete' && <Parete onSalva={addEntry} onNavigate={onNavigate} />}
    </div>
  );
}

type Salva = ReturnType<typeof useStore>['addEntry'];

// ── Lo scambio di metà percorso ──────────────────────────────────────────
function Scambio({
  onSalva,
  onNavigate,
}: {
  onSalva: Salva;
  onNavigate: (p: PageId) => void;
}) {
  const { dossier, currentCase } = useStore();
  const [altra, setAltra] = useState('');
  const [imparato, setImparato] = useState('');
  const [salvato, setSalvato] = useState(false);

  return (
    <>
      <Fase
        n={1}
        titolo="Trovate una squadra e mettetevi davanti a un solo schermo"
        perche="Non è una presentazione e non ci sono slide: siete due gruppi davanti allo stesso monitor. Cinque minuti a testa, poi si scambia."
      >
        <div className="rounded-lg border border-rule bg-white/40 px-4 py-3">
          <p className="text-[14.5px] text-ink-light">
            <strong>Chi parla:</strong> tocca a{' '}
            <span className="text-accent">{RUOLI[3].emoji} chi racconta agli altri</span>{' '}
            — se avete i ruoli attivi, è già deciso. Gli altri della squadra
            aiutano solo se si blocca.
          </p>
        </div>
        <p className="text-[14.5px] text-ink-light mt-3">
          Da dire, in cinque minuti e senza leggere:
        </p>
        <ol className="text-[14.5px] text-ink-light mt-2 space-y-1.5 list-decimal pl-5">
          <li>Di che cosa parla la vostra indagine, in una frase.</li>
          <li>Che cosa avete trovato con i tre gesti — la forma, il confronto, le lettere.</li>
          <li>La cosa che vi ha sorpreso di più.</li>
          <li>Una cosa che ancora non vi torna.</li>
        </ol>
        <input
          value={altra}
          onChange={(e) => setAltra(e.target.value)}
          placeholder="Il nome della squadra con cui vi siete scambiati"
          className="mt-4 w-full max-w-md rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
        />
      </Fase>

      <Fase
        n={2}
        titolo="Ora ascoltate, e fate due domande"
        perche="Ascoltare un caso che non è il vostro è il modo più rapido per accorgersi di cosa non avevate capito del vostro. Le domande servono a loro, ma soprattutto a voi."
      >
        <Note label="Domande, non giudizi">
          Non dovete dire se hanno fatto bene o male: non siete la giuria e non
          avete i loro dati. Chiedete <strong>«come fate a saperlo?»</strong> e{' '}
          <strong>«e se invece fosse…?»</strong>. Sono le due domande che un
          ricercatore fa a un collega.
        </Note>
      </Fase>

      <Fase
        n={3}
        titolo="Che cosa vi portate via"
        perche="Questo finisce nel dossier. Alla giuria dimostra che il vostro ragionamento è passato per qualcuno che non eravate voi — è esattamente ciò che succede alla scienza vera."
      >
        <textarea
          value={imparato}
          onChange={(e) => setImparato(e.target.value)}
          rows={3}
          aria-label="Cosa vi siete portati via dallo scambio"
          placeholder="Raccontando il nostro caso ci siamo accorti che… / Dalla loro indagine abbiamo imparato che…"
          className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => {
            onSalva({
              caseId: currentCase?.id,
              kind: 'insieme',
              title: `Scambio con ${altra.trim() || "un'altra squadra"}`,
              body: imparato.trim(),
            });
            setSalvato(true);
          }}
          disabled={imparato.trim().length < 15 || salvato}
          className="mt-2 rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-ink-light transition"
        >
          {salvato ? '✓ Salvato nel dossier' : 'Salva nel dossier'}
        </button>
      </Fase>

      <ProssimoPasso
        fatto={`La squadra ${dossier.team || 'vostra'} ha raccontato il proprio caso a qualcuno che non lo conosceva.`}
        ora="Da qui in avanti sapete quali pezzi del vostro ragionamento stanno in piedi da soli e quali avete dovuto spiegare due volte. Quelli sono i pezzi da sistemare."
        azione="Torna all'indagine"
        onGo={() => onNavigate('protein')}
        alternativa={{
          testo: 'Oppure sistemate subito il dossier',
          onGo: () => onNavigate('dossier'),
        }}
      />
    </>
  );
}

// ── La revisione incrociata del G9 ───────────────────────────────────────
function Revisione({
  onSalva,
  onNavigate,
}: {
  onSalva: Salva;
  onNavigate: (p: PageId) => void;
}) {
  const { currentCase } = useStore();
  const [da, setDa] = useState('');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [salvato, setSalvato] = useState(false);

  const pronte = q1.trim().length >= 10 && q2.trim().length >= 10;

  return (
    <>
      <Fase
        n={1}
        titolo="Scambiatevi i dossier, non i pareri"
        perche="Domani c'è la giuria. Una prova generale davanti allo specchio non serve: serve qualcuno che legga davvero il vostro lavoro e non capisca un pezzo. Quello è il pezzo da riscrivere."
      >
        <p className="text-[14.5px] text-ink-light">
          Ogni squadra passa il proprio dossier a un'altra — sullo schermo, o
          esportato. Si legge in silenzio, cinque minuti.
        </p>
        <Note label="La regola: solo due domande">
          Chi legge non dà voti, non dice «bello» e non dice «manca». Restituisce{' '}
          <strong>due domande</strong>, e basta. Una domanda dice cosa non era
          chiaro senza umiliare nessuno, e chi la riceve sa esattamente cosa
          sistemare. Un voto invece fa solo litigare.
        </Note>
      </Fase>

      <Fase
        n={2}
        titolo="Le due domande che avete ricevuto"
        perche="Scrivetele qui, testuali. Se domani la giuria fa la stessa domanda — e succede spesso — avrete già la risposta pronta."
      >
        <input
          value={da}
          onChange={(e) => setDa(e.target.value)}
          placeholder="Chi ve le ha fatte (nome della squadra)"
          className="w-full max-w-md rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
        />
        <div className="space-y-2 mt-3">
          <input
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
            aria-label="Prima domanda ricevuta"
            placeholder="1ª domanda ricevuta…"
            className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
          />
          <input
            value={q2}
            onChange={(e) => setQ2(e.target.value)}
            aria-label="Seconda domanda ricevuta"
            placeholder="2ª domanda ricevuta…"
            className="w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => {
            onSalva({
              caseId: currentCase?.id,
              kind: 'insieme',
              title: `Due domande da ${da.trim() || "un'altra squadra"}`,
              body: `1. ${q1.trim()}\n2. ${q2.trim()}`,
            });
            setSalvato(true);
          }}
          disabled={!pronte || salvato}
          className="mt-3 rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-ink-light transition"
        >
          {salvato ? '✓ Nel dossier' : 'Salva le due domande'}
        </button>
      </Fase>

      <ProssimoPasso
        fatto="Avete letto il lavoro di un'altra squadra e ricevuto due domande sul vostro."
        ora="Adesso il dossier si rifinisce con un bersaglio preciso: rispondere a quelle due domande. È molto meglio che rileggerlo sperando di trovare gli errori da soli."
        azione="Vai a sistemare il dossier"
        onGo={() => onNavigate('dossier')}
      />
    </>
  );
}

// ── La parete comune ─────────────────────────────────────────────────────
function Parete({
  onSalva,
  onNavigate,
}: {
  onSalva: Salva;
  onNavigate: (p: PageId) => void;
}) {
  const { dossier, currentCase } = useStore();
  const [riga, setRiga] = useState('');
  const [salvato, setSalvato] = useState(false);

  return (
    <>
      <Fase
        n={1}
        titolo="Una riga sola, appesa dove la vedono tutti"
        perche="Il dossier è vostro e lo legge la giuria. La parete è dell'aula e la legge chiunque passi: serve a costruire, oltre al vostro lavoro, una cosa sola fatta da tutti."
      >
        <p className="text-[14.5px] text-ink-light">
          A fine giornata ogni squadra scrive <strong>una riga</strong> — la
          scoperta di oggi, con parole vostre — e la appende alla parete comune
          dell'aula. Un foglio A5, un post-it, quello che c'è.
        </p>
        <textarea
          value={riga}
          onChange={(e) => setRiga(e.target.value)}
          rows={2}
          aria-label="La scoperta di oggi, in una riga"
          placeholder="Oggi abbiamo scoperto che…"
          className="mt-3 w-full rounded-lg border border-rule bg-white/50 px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-accent"
        />
        <p className="text-[13px] text-ink-muted mt-1.5">
          Firmatela con il nome della squadra: {dossier.team || '(datevi un nome!)'}
        </p>
        <button
          onClick={() => {
            onSalva({
              caseId: currentCase?.id,
              kind: 'insieme',
              title: 'Appeso alla parete comune',
              body: riga.trim(),
            });
            setSalvato(true);
            setRiga('');
          }}
          disabled={riga.trim().length < 10}
          className="mt-2 rounded-lg bg-ink text-paper px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-ink-light transition"
        >
          {salvato ? 'Appesa — scrivine un’altra domani' : 'Tienine copia nel dossier'}
        </button>
      </Fase>

      <Fase
        n={2}
        titolo="Prima di andare via, leggete le altre"
        perche="Dieci righe di dieci squadre sono dieci pezzi di genomica che nessuno di voi ha studiato. È il modo più economico che esista per imparare qualcosa dagli altri tavoli."
      >
        <p className="text-[14.5px] text-ink-light">
          Due minuti in piedi davanti alla parete. Se una riga non si capisce,
          andate a chiedere a chi l'ha scritta: è il pretesto migliore per
          conoscere qualcuno.
        </p>
      </Fase>

      <ProssimoPasso
        fatto="La vostra scoperta di oggi è appesa dove la leggono tutti."
        ora="Domani la parete avrà una riga in più per squadra. Alla fine del lab quella parete è il racconto dell'intera aula, non solo del vostro tavolo."
        azione="Torna al dossier"
        onGo={() => onNavigate('dossier')}
      />
    </>
  );
}
