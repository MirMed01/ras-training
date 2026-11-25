import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTrainer } from '@/lib/auth';
import { db, type Activity, type Group } from '@/lib/db';
import { liveFor } from '@/lib/live';
import { moderateQuestion, revealActivity, startActivity, stopActivity } from '@/lib/actions';
import { AutoRefresh } from '@/components/AutoRefresh';
import { shortName } from '@/lib/score';
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
  const qs = await sql`select q.*, u.full_name, (select count(*)::int from question_votes v where v.question_id = q.id) as votes
    from questions q join users u on u.id = q.user_id where q.group_id = ${g.id} order by q.answered, q.hidden, votes desc, q.created_at`;
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

      <details className="card" open={qs.some((q) => !q.answered && !q.hidden)}>
        <summary><b>Вопросы из зала ({qs.filter((q) => !q.answered && !q.hidden).length} новых)</b></summary>
        <AutoRefresh seconds={15} />
        <p className="small"><a href={`/screen/${g.id}?view=qa`} target="_blank" rel="noopener">Показать вопросы на проекторе ↗</a> · ★ = лучший вопрос, автору +5 баллов</p>
        {qs.map((q) => (
          <div key={q.id} className="row" style={{ flexWrap: 'nowrap', borderBottom: '1px solid var(--line)', padding: '8px 0', opacity: q.answered || q.hidden ? .5 : 1 }}>
            <b style={{ width: 40 }}>▲{q.votes}</b>
            <div style={{ flex: 1 }}>{q.text}<div className="small muted">{shortName(q.full_name)}{q.anonymous ? ' (анонимно)' : ''}{q.starred ? ' · ★' : ''}{q.hidden ? ' · скрыт' : ''}</div></div>
            {(['answered', 'star', 'hide'] as const).map((op) => (
              <form key={op} action={moderateQuestion}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="op" value={op} />
                <button className="btn sm ghost" title={op === 'answered' ? 'Отвечен' : op === 'star' ? 'Лучший вопрос (+5)' : 'Скрыть'} disabled={op === 'star' && q.starred}>{op === 'answered' ? '✓' : op === 'star' ? '★' : '✕'}</button></form>
            ))}
          </div>
        ))}
        {qs.length === 0 && <p className="muted small">Вопросов пока нет. Участники задают их в разделе «Вопросы».</p>}
      </details>

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
