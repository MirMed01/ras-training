import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTrainer } from '@/lib/auth';
import { db, type Group, type Task } from '@/lib/db';
import { reviewSubmission, toggleTask } from '@/lib/actions';
import { AutoRefresh } from '@/components/AutoRefresh';

export default async function TaskReview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  await requireTrainer();
  const id = Number((await params).id);
  const sql = await db();
  const g = (await sql<Group[]>`select * from groups where id = ${id}`)[0];
  if (!g) notFound();
  const tasks = await sql<Task[]>`select * from tasks where module = ${g.module} order by sort, id`;
  const subs = await sql`select s.*, u.full_name, u.profession from submissions s join users u on u.id = s.user_id
    where u.group_id = ${g.id} order by s.points nulls first, s.updated_at`;
  const [{ n }] = await sql`select count(*)::int as n from users where group_id = ${g.id} and role = 'participant'`;
  const sel = Number((await searchParams).t) || 0;
  const shown = sel ? tasks.filter((t) => t.id === sel) : tasks;
  return (
    <main className="wrap">
      <AutoRefresh seconds={30} />
      <p className="small"><Link href={`/admin/group/${g.id}`}>← {g.name}</Link></p>
      <h1>Проверка заданий</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link className={'btn sm ' + (sel ? 'ghost' : '')} href={`/admin/group/${g.id}/tasks`}>Все</Link>
        {tasks.map((t, i) => {
          const ts = subs.filter((s) => s.task_id === t.id);
          const pend = ts.filter((s) => s.points === null).length;
          return <Link key={t.id} className={'btn sm ' + (sel === t.id ? '' : 'ghost')} href={`/admin/group/${g.id}/tasks?t=${t.id}`}>{i + 1}. {ts.length}/{n}{pend ? ` · ${pend} ждут` : ''}</Link>;
        })}
      </div>
      {shown.map((t) => {
        const ts = subs.filter((s) => s.task_id === t.id);
        return (
          <div key={t.id} className="card">
            <div className="row between">
              <h2 style={{ margin: 0 }}>{t.title}</h2>
              <form action={toggleTask}><input type="hidden" name="id" value={t.id} /><button className={'btn sm ' + (t.open ? '' : 'ghost')}>{t.open ? '● открыто участникам' : '○ скрыто'}</button></form>
            </div>
            <p className="small muted">Сдали {ts.length} из {n} · максимум {t.max_points} баллов</p>
            {ts.map((s) => (
              <div key={s.id} className="q" style={{ borderColor: s.points === null ? 'var(--accent)' : undefined }}>
                <div className="row between small"><b>{s.full_name}</b><span className="muted">{s.profession}</span></div>
                <div style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{s.answer}</div>
                <form action={reviewSubmission} className="row" style={{ gap: 6 }}>
                  <input type="hidden" name="submission_id" value={s.id} />
                  <input type="text" inputMode="numeric" name="points" defaultValue={s.points ?? ''} placeholder={`0–${t.max_points}`} style={{ width: 80, padding: 8 }} />
                  <input type="text" name="comment" defaultValue={s.comment ?? ''} placeholder="Комментарий участнику (необязательно)" style={{ flex: 1, minWidth: 180, padding: 8 }} />
                  <button className="btn sm">{s.points === null ? 'Оценить' : 'Изменить'}</button>
                </form>
              </div>
            ))}
            {ts.length === 0 && <p className="muted small">Пока никто не сдал.</p>}
          </div>
        );
      })}
    </main>
  );
}
