import { useState } from 'react';
import type { PageId } from '../App';
import { useStore } from '../store';
import { PageHeader, Sub, Note, HowTo } from '../components/ui';
import { DAYS, dayActivities } from '../data/days';
import { giornoStimato } from '../lib/progresso';
import { assegnazione, RUOLI } from '../lib/ruoli';

export function Squadra({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const { dossier, setTeam, setMembers, progress, scambiaRuoli } = useStore();
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

  // I ruoli: l'app deduce la giornata dalle prove e propone la rotazione. La
  // squadra può correggere il giorno e scambiarsi i turni, ma non deve
  // configurare nulla per partire — e l'host, che è uno stagista, nemmeno.
  const stimato = giornoStimato(
    DAYS.map((d) => dayActivities(d).map((a) => a.id)),
    { dossier, progress },
  );
  const [giorno, setGiorno] = useState(stimato);
  const turni = assegnazione(members, giorno, progress.ruoliScambi);

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
          'Aggiungete i componenti: bastano il nome o un soprannome.',
          "Quando siete pronti, passate al catalogo e scegliete l'indagine.",
        ]}
      />

      <Note label="Dove finiscono questi nomi">
        Restano <strong>su questo computer</strong> (nel browser) e compaiono sul
        dossier che esporterete: non vengono inviati al tutor AI né a nessun
        server. Se il computer è condiviso, a fine giornata usate «Azzera» nel
        dossier. Per la giuria vanno benissimo anche solo i nomi di battesimo.
      </Note>

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

      {/* ── I turni ────────────────────────────────────────────────────── */}
      <Sub>Chi fa cosa, oggi</Sub>
      <p className="text-[14.5px] text-ink-light mb-3">
        In una squadra succede sempre la stessa cosa: chi prende il mouse il
        primo giorno lo tiene per sessanta ore, e gli altri guardano. Qui i turni
        girano ogni giorno. Non sono ruoli da esperti — si fanno tutti senza
        sapere niente di biologia.
      </p>

      {turni.length === 0 ? (
        <Note label="Servono i nomi" tone="amber">
          Scrivete i componenti qui sopra e l'app assegna i turni di oggi.
        </Note>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="font-mono text-[10px] tracking-[.13em] uppercase text-accent">
              Giornata
            </label>
            <select
              value={giorno}
              onChange={(e) => setGiorno(Number(e.target.value))}
              aria-label="Giornata del percorso"
              className="rounded-lg border border-rule bg-white/50 px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
            >
              {DAYS.map((d) => (
                <option key={d.n} value={d.n}>
                  Giorno {d.n} — {d.title}
                </option>
              ))}
            </select>
            <button
              onClick={scambiaRuoli}
              className="rounded-lg border border-rule bg-white/40 px-3.5 py-1.5 text-[13px] text-ink-light hover:border-accent hover:text-accent transition"
            >
              ↻ Scambiamoci i turni
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {turni.map(({ ruolo, chi }) => (
              <div
                key={ruolo.id}
                className="rounded-lg border border-rule bg-white/40 px-4 py-3"
              >
                <div className="flex items-baseline gap-2">
                  <span aria-hidden>{ruolo.emoji}</span>
                  <span className="font-serif text-[17px] text-ink">{chi}</span>
                </div>
                <div className="font-mono text-[9.5px] tracking-[.15em] uppercase text-accent mt-1">
                  {ruolo.nome}
                </div>
                <p className="text-[13.5px] text-ink-light mt-1 leading-snug">
                  {ruolo.gesto}
                </p>
              </div>
            ))}
          </div>
          {members.filter((m) => m.trim()).length < RUOLI.length && (
            <p className="text-[13px] text-ink-muted mt-2">
              Siete in {members.filter((m) => m.trim()).length}: qualcuno tiene due
              turni. Va bene — domani saranno due turni diversi.
            </p>
          )}
        </>
      )}

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
