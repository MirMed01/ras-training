import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, userGroup } from '@/lib/auth';
import { myAttempts, pct } from '@/lib/data';
import { TESTS, CONFIDENCE } from '@/lib/content';
import { db } from '@/lib/db';

export default async function Results({ searchParams }: { searchParams: Promise<{ just?: string }> }) {
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g) redirect('/me');
  const { pre, post } = await myAttempts(u, g.module);
  const qs = TESTS[g.module] ?? [];
  const sp = await searchParams;
  if (!pre && !post) redirect('/me');
  const gain = pre && post ? post.score - pre.score : null;
  return (
    <main className="wrap narrow">
      {sp.just === 'pre' && <div className="okmsg">Ответы приняты. Правильные ответы разберём в течение дня, а в конце вы сравните результат.</div>}
      {sp.just === 'post' && <div className="okmsg">Итоговый тест принят. Ниже ваш прогресс и разбор.</div>}
      <h1>Мои результаты</h1>
      <div className="stats">
        <div className="stat"><div className="v">{pre ? `${pre.score}/${pre.total}` : '—'}</div><div className="l">входной тест</div></div>
        <div className="stat"><div className="v">{post ? `${post.score}/${post.total}` : '—'}</div><div className="l">итоговый тест</div></div>
        {gain !== null && <div className="stat"><div className="v" style={{ color: gain > 0 ? 'var(--ok)' : undefined }}>{gain > 0 ? '+' : ''}{gain}</div><div className="l">прирост</div></div>}
      </div>
      {pre && <div style={{ marginBottom: 6 }}><div className="small muted">Утром: {pct(pre.score, pre.total)}%</div><div className="bar pre"><span style={{ width: pct(pre.score, pre.total) + '%' }} /></div></div>}
      {post && <div style={{ marginBottom: 16 }}><div className="small muted">Вечером: {pct(post.score, post.total)}%</div><div className="bar"><span style={{ width: pct(post.score, post.total) + '%' }} /></div></div>}

      <Confidence userId={u.id} module={g.module} />
      {post ? (
        <>
          <h2 style={{ marginTop: 20 }}>Разбор вопросов</h2>
          {qs.map((q, i) => {
            const a = post.answers[i];
            const b = pre?.answers[i];
            return (
              <div className="q" key={i}>
                <div className="qt">{i + 1}. {q.q}</div>
                {q.opts.map((o, j) => (
                  <div key={j} className={'opt' + (j === q.correct ? ' right' : j === a ? ' wrong' : '')} style={{ cursor: 'default' }}>
                    {j === q.correct ? '✓' : j === a ? '✗' : '•'} {o}
                    {j === a && <span className="badge" style={{ marginLeft: 'auto' }}>ваш ответ</span>}
                  </div>
                ))}
                {b !== undefined && b !== a && <div className="small muted">Утром вы ответили: {q.opts[b] ?? '—'}</div>}
                <div className="why">{q.why}</div>
              </div>
            );
          })}
        </>
      ) : (
        <p className="muted">Правильные ответы с пояснениями появятся здесь после итогового теста.</p>
      )}
      <Link className="btn ghost" href="/me">В кабинет</Link>
    </main>
  );
}

async function Confidence({ userId, module }: { userId: number; module: number }) {
  const sql = await db();
  const rows = await sql`select kind, confidence from attempts where user_id = ${userId} and module = ${module}`;
  const pre = rows.find((r) => r.kind === 'pre')?.confidence as number[] | undefined;
  const post = rows.find((r) => r.kind === 'post')?.confidence as number[] | undefined;
  const items = CONFIDENCE[module] ?? [];
  if (!pre && !post) return null;
  return (
    <div className="card">
      <h3>Уверенность (из 5)</h3>
      {items.map((t, i) => (
        <div key={i} className="row between small" style={{ borderBottom: '1px solid var(--line)', padding: '6px 0', flexWrap: 'nowrap' }}>
          <span>{t}</span>
          <b style={{ whiteSpace: 'nowrap' }}>{pre?.[i] || '—'} → {post?.[i] || '—'}</b>
        </div>
      ))}
    </div>
  );
}
