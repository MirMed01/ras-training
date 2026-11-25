import { redirect } from 'next/navigation';
import { requireUser, userGroup } from '@/lib/auth';
import { db, type Task } from '@/lib/db';
import { submitTask } from '@/lib/actions';
import { SubmitButton } from '@/components/SubmitButton';

export default async function Tasks({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g) redirect('/me');
  const sp = await searchParams;
  const sql = await db();
  const tasks = await sql<Task[]>`select * from tasks where module = ${g.module} and open order by sort, id`;
  const subs = await sql`select task_id, answer, points, comment from submissions where user_id = ${u.id}`;
  const by = new Map(subs.map((s) => [s.task_id, s]));
  const earned = subs.reduce((a, s) => a + (s.points ?? 0), 0);
  const max = tasks.reduce((a, t) => a + t.max_points, 0);
  return (
    <main className="wrap narrow">
      <h1>Задания рабочей тетради</h1>
      <p className="muted">Сдано {tasks.filter((t) => by.has(t.id)).length} из {tasks.length} · баллы за задания: <b>{earned}</b> из {max}. Ответ можно исправлять, пока тренер его не проверил.</p>
      {sp.err === 'empty' && <div className="err">Ответ пустой.</div>}
      {tasks.map((t, i) => {
        const s = by.get(t.id);
        const reviewed = s && s.points !== null;
        return (
          <div className="card" key={t.id} id={`t${t.id}`}>
            <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0 }}>{i + 1}. {t.title}</h3>
              {reviewed ? <span className="badge ok">{s.points} из {t.max_points}</span>
                : s ? <span className="badge warn">на проверке</span>
                : <span className="badge">до {t.max_points} баллов</span>}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', margin: '10px 0' }} className="small">{t.instructions}</div>
            {sp.ok === String(t.id) && <div className="okmsg">Ответ сохранён и отправлен тренеру.</div>}
            {reviewed ? (
              <>
                <div className="q small" style={{ whiteSpace: 'pre-wrap' }}>{s.answer}</div>
                {s.comment && <div className="okmsg" style={{ background: 'var(--brand-soft)', color: 'var(--ink)' }}><b>Комментарий тренера:</b> {s.comment}</div>}
              </>
            ) : (
              <form action={submitTask}>
                <input type="hidden" name="task_id" value={t.id} />
                <textarea name="answer" required defaultValue={s?.answer ?? ''} style={{ minHeight: 140 }} placeholder="Ваш ответ" />
                <div style={{ marginTop: 8 }}><SubmitButton className="btn" label={s ? 'Обновить ответ' : 'Сдать'} pendingLabel="Сохраняем…" /></div>
              </form>
            )}
          </div>
        );
      })}
      {tasks.length === 0 && <p className="muted">Задания появятся здесь, когда тренер их откроет.</p>}
    </main>
  );
}
