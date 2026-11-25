import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTrainer } from '@/lib/auth';
import { db, type Group } from '@/lib/db';
import { groupStats } from '@/lib/stats';
import { deleteUser, moveUser, resetAttempt, resetPassword, saveGroup, toggleFlag } from '@/lib/actions';
import { joinUrl, qrSvg } from '@/lib/url';
import { MODULES } from '@/lib/content';
import { ConfirmButton } from '@/components/ConfirmButton';
import { groupKpi, groupScores } from '@/lib/score';

const fmt = (v: number | null, d = 1) => (v === null ? '—' : v.toFixed(d).replace('.', ','));
const p = (v: number | null) => (v === null ? '—' : Math.round(v * 100) + '%');

const FLAG_LABEL: Record<string, string> = {
  pre_open: 'Входной тест', post_open: 'Итоговый тест', feedback_open: 'Анкета', cert_open: 'Сертификаты', board_open: 'Рейтинг',
};

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTrainer();
  const id = Number((await params).id);
  const sql = await db();
  const g = (await sql<Group[]>`select * from groups where id = ${id}`)[0];
  if (!g) notFound();
  const all = await sql<Group[]>`select * from groups order by id`;
  const s = await groupStats(g);
  const sc = await groupScores(g);
  const byUser = new Map(sc.map((x) => [x.userId, x]));
  const k = groupKpi(sc);
  const url = await joinUrl(g.code);
  const svg = await qrSvg(url);

  return (
    <main className="wrap">
      <p className="small"><Link href="/admin">← Все группы</Link></p>
      <div className="row between">
        <div><h1 style={{ marginBottom: 2 }}>{g.name}</h1><div className="muted">{MODULES[g.module]?.name} · код <b>{g.code}</b></div></div>
        <div className="row">
          <Link className="btn" href={`/admin/group/${g.id}/live`}>▶ Пульт интерактива</Link>
          <a className="btn ghost" href={`/api/export/${g.id}`}>Экспорт в Excel</a>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Что сейчас открыто участникам</h3>
        <div className="row">
          {(['pre_open', 'post_open', 'feedback_open', 'cert_open', 'board_open'] as const).map((f) => (
            <form key={f} action={toggleFlag}>
              <input type="hidden" name="group_id" value={g.id} /><input type="hidden" name="flag" value={f} />
              <button className={'btn sm ' + (g[f] ? '' : 'ghost')}>{g[f] ? '● ' : '○ '}{FLAG_LABEL[f]}: {g[f] ? 'открыт' : 'закрыт'}</button>
            </form>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Нажмите, чтобы открыть или закрыть. Сертификат участник получает, только если прошёл итоговый тест.</p>
      </div>

      <div className="stats">
        <div className="stat"><div className="v">{s.rows.length}</div><div className="l">зарегистрировано</div></div>
        <div className="stat"><div className="v">{fmt(s.preAvg)}<span className="small muted">/{s.total}</span></div><div className="l">средний претест (n={s.nPre})</div></div>
        <div className="stat"><div className="v">{fmt(s.postAvg)}<span className="small muted">/{s.total}</span></div><div className="l">средний посттест (n={s.nPost})</div></div>
        <div className="stat"><div className="v" style={{ color: 'var(--ok)' }}>{s.gain === null ? '—' : (s.gain > 0 ? '+' : '') + fmt(s.gain)}</div><div className="l">прирост, баллов (n={s.nPaired})</div></div>
      </div>

      <div className="card">
        <h3>Показатели эффективности (по Киркпатрику)</h3>
        <div className="stats" style={{ marginBottom: 0 }}>
          <div className="stat"><div className="v">{p(k.normGain)}</div><div className="l">нормализованный прирост знаний (Hake g)</div></div>
          <div className="stat"><div className="v">{fmt(k.confPre)} → {fmt(k.confPost)}</div><div className="l">уверенность, из 5</div></div>
          <div className="stat"><div className="v">{p(k.engagement)}</div><div className="l">вовлечённость в интерактив</div></div>
          <div className="stat"><div className="v">{p(k.accuracy)}</div><div className="l">верных ответов в интерактиве</div></div>
          <div className="stat"><div className="v">{p(k.completion)}</div><div className="l">прошли весь маршрут</div></div>
          <div className="stat"><div className="v">{k.distinction}</div><div className="l">идут на сертификат с отличием</div></div>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Уровень 1 (реакция): анкета ниже. Уровень 2 (знания и уверенность): прирост и самооценка. Уровень 3 (поведение): планы действий участников.</p>
      </div>

      <div className="card">
        <h3>Вопросы теста: доля верных ответов</h3>
        <p className="small muted">Серая полоса: утром, зелёная: вечером. Низкий утренний процент подсказывает, на чём задержаться.</p>
        {s.items.map((it, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div className="small">{i + 1}. {it.q}</div>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <div className="bar pre" style={{ flex: 1 }}><span style={{ width: (it.pre ?? 0) * 100 + '%' }} /></div><span className="small" style={{ width: 42 }}>{p(it.pre)}</span>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <div className="bar" style={{ flex: 1 }}><span style={{ width: (it.post ?? 0) * 100 + '%' }} /></div><span className="small" style={{ width: 42 }}>{p(it.post)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Участники</h3>
          <span className="small muted">{Object.entries(s.byProf).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span></div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>#</th><th>ФИО</th><th>Профессия</th><th>Телефон</th><th>Пре</th><th>Пост</th><th>Баллы</th><th>Вовл.</th><th>Увер.</th><th>Анкета</th><th></th></tr></thead>
            <tbody>
              {s.rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{r.full_name}{r.workplace ? <div className="small muted">{r.workplace}</div> : null}</td>
                  <td>{r.profession}</td>
                  <td className="small">{r.phone}</td>
                  <td>{r.pre_score ?? '—'}</td>
                  <td>{r.post_score ?? '—'}{r.pre_score !== null && r.post_score !== null && r.post_score > r.pre_score ? <span className="small" style={{ color: 'var(--ok)' }}> +{r.post_score - r.pre_score}</span> : null}</td>
                  <td><b>{byUser.get(r.id)?.xp ?? 0}</b>{byUser.get(r.id)?.distinction && <span title="идёт на отличие"> ★</span>}<div className="small muted">{byUser.get(r.id)?.level}</div></td>
                  <td>{p(byUser.get(r.id)?.engagement ?? null)}</td>
                  <td className="small">{fmt(byUser.get(r.id)?.confPre ?? null)}→{fmt(byUser.get(r.id)?.confPost ?? null)}</td>
                  <td>{r.has_fb ? '✓' : ''}</td>
                  <td>
                    <details>
                      <summary className="small">действия</summary>
                      <div style={{ minWidth: 230, paddingTop: 6 }}>
                        <form action={resetPassword} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          <input type="hidden" name="user_id" value={r.id} />
                          <input type="text" name="password" placeholder="новый пароль" required minLength={6} style={{ padding: 6 }} />
                          <button className="btn sm">OK</button>
                        </form>
                        <form action={moveUser} className="row" style={{ gap: 6, flexWrap: 'nowrap', marginTop: 6 }}>
                          <input type="hidden" name="user_id" value={r.id} />
                          <select name="group_id" defaultValue={g.id} style={{ padding: 6 }}>{all.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                          <button className="btn sm ghost">Перевести</button>
                        </form>
                        <div className="row" style={{ gap: 6, marginTop: 6 }}>
                          {r.pre_score !== null && <form action={resetAttempt}><input type="hidden" name="user_id" value={r.id} /><input type="hidden" name="kind" value="pre" /><ConfirmButton className="btn sm ghost" text="Сбросить претест этого участника?">Сбросить пре</ConfirmButton></form>}
                          {r.post_score !== null && <form action={resetAttempt}><input type="hidden" name="user_id" value={r.id} /><input type="hidden" name="kind" value="post" /><ConfirmButton className="btn sm ghost" text="Сбросить посттест этого участника?">Сбросить пост</ConfirmButton></form>}
                          <form action={deleteUser}><input type="hidden" name="user_id" value={r.id} /><ConfirmButton className="btn sm danger" text={`Удалить ${r.full_name} и все его ответы?`}>Удалить</ConfirmButton></form>
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {s.rows.length === 0 && <tr><td colSpan={11} className="muted">Пока никто не зарегистрировался. Покажите QR-код ниже.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Анкета обратной связи ({s.fb.length})</h3>
        {s.fbAvg.map((f) => (
          <div key={f.t} className="row between small" style={{ borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
            <span>{f.t}</span><b>{f.avg === null ? '—' : f.avg.toFixed(2).replace('.', ',')} / 5</b>
          </div>
        ))}
        {s.fb.some((f) => f.apply_text || f.next_text) && (
          <details style={{ marginTop: 10 }}>
            <summary>Ответы участников</summary>
            {s.fb.filter((f) => f.apply_text || f.next_text).map((f, i) => (
              <div key={i} className="small" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                {f.apply_text && <div><b>Применю:</b> {f.apply_text}</div>}
                {f.next_text && <div><b>Хочу разобрать:</b> {f.next_text}</div>}
              </div>
            ))}
          </details>
        )}
      </div>

      <div className="card">
        <h3>Вход для участников</h3>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ width: 170 }} dangerouslySetInnerHTML={{ __html: svg }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <p className="small" style={{ wordBreak: 'break-all' }}>{url}</p>
            <div className="row">
              <Link className="btn sm" href={`/qr/${g.id}`}>QR для печати</Link>
              <Link className="btn sm ghost" href={`/screen/${g.id}`}>Экран для проектора</Link>
            </div>
          </div>
        </div>
      </div>

      <details className="card">
        <summary><b>Настройки группы</b></summary>
        <form action={saveGroup}>
          <input type="hidden" name="group_id" value={g.id} />
          <label>Название</label><input type="text" name="name" defaultValue={g.name} required />
          <label>Код</label><input type="text" name="code" defaultValue={g.code} required />
          <label>Модуль</label>
          <select name="module" defaultValue={String(g.module)}><option value="1">Модуль 1</option><option value="2">Модуль 2</option></select>
          <button className="btn sm" style={{ marginTop: 12 }}>Сохранить</button>
        </form>
      </details>
    </main>
  );
}
