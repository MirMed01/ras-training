import { redirect } from 'next/navigation';
import { requireUser, userGroup } from '@/lib/auth';
import { myAttempts } from '@/lib/data';
import { TESTS, MODULES, CONFIDENCE } from '@/lib/content';
import { submitTest } from '@/lib/actions';
import { SubmitButton } from '@/components/SubmitButton';
import { TestProgress } from '@/components/TestProgress';

export default async function TestPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (kind !== 'pre' && kind !== 'post') redirect('/me');
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g) redirect('/me');
  const att = await myAttempts(u, g.module);
  if (att[kind]) redirect('/results');
  const open = kind === 'pre' ? g.pre_open : g.post_open;
  if (!open) {
    return <main className="wrap narrow"><div className="card"><h1>Тест пока закрыт</h1><p>Тренер откроет его в нужный момент. Обновите страницу чуть позже.</p></div></main>;
  }
  const qs = TESTS[g.module] ?? [];
  return (
    <main className="wrap narrow">
      <h1>{kind === 'pre' ? 'Входной тест' : 'Итоговый тест'}</h1>
      <p className="muted">{MODULES[g.module]?.name}. {qs.length} вопросов. {kind === 'pre'
        ? 'Это не экзамен: тест покажет, с чем мы приходим. В конце дня вы сравните результат.'
        : 'Те же вопросы, что утром. После отправки увидите правильные ответы с пояснениями и свой прогресс.'}</p>
      <form action={submitTest}>
        <input type="hidden" name="kind" value={kind} />
        <TestProgress storageKey={`ras-test-${u.id}-${g.module}-${kind}`} total={qs.length + (CONFIDENCE[g.module] ?? []).length} />
        {qs.map((q, i) => (
          <fieldset className="q" key={i} style={{ margin: '0 0 12px' }}>
            <legend className="qt" style={{ padding: 0 }}>{i + 1}. {q.q}</legend>
            {q.opts.map((o, j) => (
              <label className="opt" key={j}><input type="radio" name={`q${i}`} value={j} required /> {o}</label>
            ))}
          </fieldset>
        ))}
 {(CONFIDENCE[g.module] ?? []).length > 0 && (
          <div className="q">
            <div className="qt">Самооценка: насколько уверенно вы сейчас можете…</div>
            <p className="small muted">1 — совсем не уверен(а), 5 — полностью уверен(а). Это не оценка, а точка отсчёта: вечером сравним.</p>
            {(CONFIDENCE[g.module] ?? []).map((c, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="small" style={{ marginBottom: 4 }}>{c}</div>
                <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <label key={v} className="opt" style={{ flex: 1, justifyContent: 'center', margin: 0, padding: '8px 4px' }}>
                      <input type="radio" name={`c${i}`} value={v} required /> {v}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <SubmitButton label="Отправить ответы" pendingLabel="Отправляем…" />
        <p className="small muted" style={{ marginTop: 8 }}>Отправить можно один раз.</p>
      </form>
    </main>
  );
}
