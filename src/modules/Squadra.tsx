import type { PageId } from '../App';
import { useStore } from '../store';
import { PageHeader, Sub, Note, HowTo } from '../components/ui';

export function Squadra({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { dossier, setTeam, setMembers } = useStore();
  const members = dossier.members.length > 0 ? dossier.members : [''];

  function updateMember(i: number, value: string) {
    const next = [...members];
    next[i] = value;
    setMembers(next);
  }
  function addMember() {
    setMembers([...members, '']);
  }
  function removeMember(i: number) {
    const next = members.filter((_, k) => k !== i);
    setMembers(next.length > 0 ? next : ['']);
  }

  const ready = dossier.team.trim().length > 0;

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Giorno 1 · Mattina"
        title={
          <>
            La vostra <em className="text-accent not-italic italic">squadra</em>
          </>
        }
        dek="Prima di indagare, formate la squadra: un nome e i componenti. Il nome comparirà sul dossier che presenterete alla giuria."
      />

      <HowTo
        steps={[
          'Scegliete un nome per la squadra.',
          'Aggiungete i nomi dei componenti.',
          "Quando siete pronti, passate al catalogo e scegliete l'indagine.",
        ]}
      />

      <Sub>Il nome della squadra</Sub>
      <input
        value={dossier.team}
        onChange={(e) => setTeam(e.target.value)}
        placeholder="es. I Genomici"
        className="w-full max-w-md rounded-lg border border-rule bg-white/50 px-3 py-2.5 text-[15px] text-ink focus:outline-none focus:border-accent"
      />

      <Sub>I componenti</Sub>
      <div className="space-y-2 max-w-md">
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-ink-muted w-5 shrink-0">
              {i + 1}.
            </span>
            <input
              value={m}
              onChange={(e) => updateMember(i, e.target.value)}
              placeholder={`Nome del componente ${i + 1}`}
              className="flex-1 rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => removeMember(i)}
              className="text-ink-muted hover:text-accent text-sm px-2 shrink-0"
              title="Rimuovi"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addMember}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rule bg-white/40 px-4 py-2 text-sm font-medium text-ink hover:border-ink-muted transition"
      >
        ＋ Aggiungi un componente
      </button>

      <Note label={ready ? 'Pronti!' : 'Manca il nome'} tone={ready ? 'green' : 'amber'}>
        {ready
          ? `Squadra "${dossier.team}" pronta. Passate alla scelta dell'indagine.`
          : 'Date un nome alla squadra per proseguire.'}
      </Note>

      <div className="mt-4">
        <button
          onClick={() => onNavigate('home')}
          disabled={!ready}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition ${
            ready ? 'bg-accent hover:opacity-90' : 'bg-ink-muted opacity-40'
          }`}
        >
          Scegli l'indagine →
        </button>
      </div>
    </div>
  );
}
