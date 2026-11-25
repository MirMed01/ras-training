import { redirect } from 'next/navigation';
import { requireUser, userGroup } from '@/lib/auth';
import { FEEDBACK_ITEMS } from '@/lib/content';
import { submitFeedback } from '@/lib/actions';
import { SubmitButton } from '@/components/SubmitButton';

export default async function Feedback() {
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g || !g.feedback_open) redirect('/me');
  return (
    <main className="wrap narrow">
      <h1>Анкета обратной связи</h1>
      <p className="muted">Оцените от 1 (плохо) до 5 (отлично). Это помогает нам сделать следующий модуль лучше.</p>
      <form action={submitFeedback}>
        {FEEDBACK_ITEMS.map((t, i) => (
          <fieldset className="q" key={i} style={{ margin: '0 0 12px' }}>
            <legend className="qt" style={{ padding: 0 }}>{t}</legend>
            <div className="row" style={{ gap: 6 }}>
              {[1, 2, 3, 4, 5].map((v) => (
                <label key={v} className="opt" style={{ flex: 1, justifyContent: 'center', margin: 0 }}>
                  <input type="radio" name={`r${i}`} value={v} required /> {v}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <label htmlFor="apply_text">Одно действие, которое я применю в работе на следующей неделе</label>
        <textarea id="apply_text" name="apply_text" />
        <label htmlFor="next_text">Что хотелось бы разобрать дальше</label>
        <textarea id="next_text" name="next_text" />
        <div style={{ marginTop: 16 }}><SubmitButton label="Отправить" pendingLabel="Отправляем…" /></div>
      </form>
    </main>
  );
}
