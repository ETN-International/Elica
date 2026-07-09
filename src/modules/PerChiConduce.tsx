import type { PageId } from '../App';
import { PageHeader, Sub, Note } from '../components/ui';

/** Cosa fa lo stagista mentre l'app fa il resto. */
const TASKS: { title: string; body: string }[] = [
  {
    title: 'Formate le squadre',
    body: 'Gruppi da 3-4, mescolando chi sembra a suo agio col computer e chi no. Ogni squadra a una postazione.',
  },
  {
    title: 'Tenete la sala',
    body: 'Girate tra i tavoli, portate energia, notate chi si è perso o chi è rimasto indietro e riavvicinatelo all\'app. Non serve che sappiate la genetica.',
  },
  {
    title: 'Assicurate un compito a ognuno',
    body: 'In ogni squadra qualcuno tiene il mouse, qualcuno scrive nel dossier, qualcuno legge le domande. Fate ruotare i ruoli tra una fase e l\'altra.',
  },
  {
    title: 'Lasciate condurre l\'app',
    body: 'Le domande, i rilanci e il ritmo li dà l\'app (e il tutor). Se una squadra si blocca, invitatela a leggere la domanda sullo schermo o a chiedere al tutor — non spiegate voi.',
  },
  {
    title: 'Conducete la presentazione finale',
    body: 'Questa è la parte umana insostituibile: alla fine ogni squadra presenta il dossier alla giuria di pari. Voi tenete i tempi, date la parola, create l\'atmosfera.',
  },
];

export function PerChiConduce({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Per chi conduce"
        title={
          <>
            L'app <em className="text-accent not-italic italic">facilita</em>, tu tieni la
            sala
          </>
        }
        dek="Non serve che tu sappia la genetica né che tu sappia facilitare: quello lo fa l'app. Il tuo lavoro è un altro, e più umano."
      />

      <Note label="La regola per te">
        La conduzione — le domande che aprono, i rilanci, il ritmo — è dentro l'app e nel
        tutor. Tu <strong>non insegni</strong> e <strong>non correggi</strong>: fai in modo
        che la sala funzioni e che ogni squadra abbia sempre qualcosa da fare.
      </Note>

      <Sub>Cosa fai, in pratica</Sub>
      <div className="space-y-0">
        {TASKS.map((t, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-rule">
            <span className="font-serif text-2xl text-accent leading-none min-w-7">
              {i + 1}
            </span>
            <div>
              <div className="font-serif text-lg text-ink">{t.title}</div>
              <p className="text-[14px] text-ink-light mt-0.5">{t.body}</p>
            </div>
          </div>
        ))}
      </div>

      <Note label="Se il tutor non risponde" tone="amber">
        Se manca la rete o l'AI è giù, l'app non resta muta: sotto ogni domanda del tutor
        compare una <strong>domanda di riserva</strong> già pronta. La squadra ha sempre da
        dove ripartire, e tu non devi inventare nulla.
      </Note>

      <div className="mt-6">
        <button
          onClick={() => onNavigate('giorno0')}
          className="rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
        >
          Vai al Giorno 0 →
        </button>
      </div>
    </div>
  );
}
