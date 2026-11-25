import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTrainer } from '@/lib/auth';
import { db, type Activity, type Group } from '@/lib/db';
import { liveFor } from '@/lib/live';
import { revealActivity, startActivity, stopActivity } from '@/lib/actions';
import { LiveMonitor } from '@/components/Live';

const TYPE: Record<string, string> = { myth: 'Миф или факт', quiz: 'Кейс', poll: 'Опрос', open: 'Открытый вопрос' };

export default async function LiveControl({ params }: { params: Promise<{ id: string }> }) {
  await requireTrainer();
  const id = Number((await params).id);
  const sql = await db();
  const g = (await sql<Group[]>`select * from groups where id = ${id}`)[0];
  if (!g) notFound();
  const acts = await sql<Activity[]>`select * from activities where module = ${g.module} order by sort, id`;
  const live = await liveFor(g.id);
  const done = new Set((await sql`select distinct activity_id from responses where group_id = ${g.id}`).map((r) => r.activity_id));

  return (
    <main className="wrap">
      <p className="small"><Link href={`/admin/group/${g.id}`}>← {g.name}</Link></p>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Пульт интерактива</h1>
        <a className="btn ghost" href={`/screen/${g.id}`} target="_blank" rel="noopener">Открыть экран для проектора ↗</a>
      </div>
      <p className="muted small">Откройте экран на проекторе, а этот пульт на своём телефоне или ноутбуке. Участники видят вопрос на странице «Интерактив».</p>

      <div className="card" style={{ borderColor: live ? 'var(--brand)' : undefined, borderWidth: live ? 2 : 1 }}>
        {live ? (
          <>
            <div className="row between">
              <span className="badge">{TYPE[live.activity.type]} · идёт сейчас</span>
              <div className="row">
                {!live.revealed && live.activity.type !== 'open' && (
                  <form action={revealActivity}><input type="hidden" name="group_id" value={g.id} />
                    <button className="btn sm warn">{live.activity.correct !== null ? 'Показать ответ' : 'Закрыть голосование'}</button></form>
                )}
                <form action={stopActivity}><input type="hidden" name="group_id" value={g.id} /><button className="btn sm ghost">Завершить</button></form>
              </div>
            </div>
            <h2 style={{ marginTop: 10 }}>{live.activity.prompt}</h2>
            <LiveMonitor groupId={g.id} />
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Сейчас ничего не запущено. Нажмите «Запустить» у нужного вопроса.</p>
        )}
      </div>

      {acts.map((a) => (
        <div className="card" key={a.id} style={{ padding: 14, opacity: live?.activity.id === a.id ? .5 : 1 }}>
          <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <div>
              <div className="small muted">{TYPE[a.type]} · {a.title} {done.has(a.id) && <span className="badge ok">был</span>}</div>
              <div>{a.prompt}</div>
            </div>
            <form action={startActivity}>
              <input type="hidden" name="group_id" value={g.id} /><input type="hidden" name="activity_id" value={a.id} />
              <button className="btn sm">▶ Запустить</button>
            </form>
          </div>
        </div>
      ))}
      <p><Link href="/admin/content">Добавить свой вопрос →</Link></p>
    </main>
  );
}
