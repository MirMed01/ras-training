import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, userGroup } from '@/lib/auth';
import { myAttempts, myFeedback } from '@/lib/data';
import { MODULES } from '@/lib/content';
import { groupScores, leaderboard, LEVELS, RULES } from '@/lib/score';
import { ProfileForm } from '@/components/AuthForms';
import { AutoRefresh } from '@/components/AutoRefresh';

const pc = (v: number | null) => (v === null ? '—' : Math.round(v * 100) + '%');
const f1 = (v: number | null) => (v === null ? '—' : v.toFixed(1).replace('.', ','));

export default async function Me({ searchParams }: { searchParams: Promise<{ thanks?: string }> }) {
  const u = await requireUser();
  if (u.role === 'trainer') redirect('/admin');
  const g = await userGroup(u);
  const sp = await searchParams;
  if (!g) {
    return <main className="wrap narrow"><div className="card"><h1>Вы пока не в группе</h1><p>Подойдите к тренеру: он добавит вас в группу.</p></div></main>;
  }
  const m = MODULES[g.module];
  const { pre, post } = await myAttempts(u, g.module);
  const fb = await myFeedback(u, g.module);
  const scores = await groupScores(g);
  const me = scores.find((s) => s.userId === u.id)!;
  const board = g.board_open ? leaderboard(scores, 5) : [];
  const canCert = g.cert_open && !!post;
  const toNext = me.nextMin !== null ? me.nextMin - me.xp : 0;
  const lvlPct = me.nextMin !== null ? Math.round(((me.xp - me.curMin) / (me.nextMin - me.curMin)) * 100) : 100;

  const tiles: { href: string | null; t: string; s: React.ReactNode }[] = [
    { href: g.pre_open && !pre ? '/test/pre' : pre ? '/results' : null, t: '1. Входной тест',
      s: pre ? <span className="badge ok">пройден: {pre.score} из {pre.total}</span> : g.pre_open ? '8 вопросов и самооценка, 5 минут · +10' : <span className="badge warn">откроется в начале дня</span> },
    { href: '/live', t: '2. Интерактив', s: `Отвечено ${me.answered} из ${me.launched} · +2 за ответ, +3 за верный` },
    { href: '/materials', t: '3. Материалы', s: 'Программа, шпаргалки по критериям, инструменты' },
    { href: g.post_open && !post ? '/test/post' : post ? '/results' : null, t: '4. Итоговый тест',
      s: post ? <span className="badge ok">пройден: {post.score} из {post.total}</span> : g.post_open ? 'Те же вопросы · +5 за каждый верный' : <span className="badge warn">откроется в конце дня</span> },
    { href: g.feedback_open ? '/feedback' : null, t: '5. Анкета и план действий',
      s: fb ? <span className="badge ok">заполнено{me.plan ? ', план есть' : ''}</span> : g.feedback_open ? '2 минуты · +10, план действий +5' : <span className="badge warn">откроется в конце дня</span> },
    { href: canCert ? '/certificate' : null, t: '6. Сертификат',
      s: canCert ? (me.distinction ? 'С отличием! Скачать PDF' : 'Скачать или распечатать PDF') : <span className="badge warn">после итогового теста</span> },
  ];

  return (
    <main className="wrap">
      <AutoRefresh seconds={20} />
      {sp.thanks && <div className="okmsg">Спасибо за отзыв! +10 баллов{me.plan ? ', и ещё +5 за план действий' : ''}.</div>}

      <section className="hero" style={{ padding: '20px 20px 18px' }}>
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{ opacity: .85, fontSize: '.9rem' }}>{g.name} · {m?.name}</div>
            <h1 style={{ margin: '4px 0 2px' }}>{u.full_name.split(' ').slice(1).join(' ') || u.full_name}</h1>
            <div style={{ fontSize: '1.05rem' }}>Уровень: <b>{me.level}</b></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{me.xp}</div>
            <div style={{ opacity: .85, fontSize: '.85rem' }}>баллов</div>
            {g.board_open && me.rank && !me.hidden && <div className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', marginTop: 6 }}>{me.rank} место из {scores.length}</div>}
          </div>
        </div>
        <div className="bar" style={{ background: 'rgba(255,255,255,.2)', marginTop: 14, height: 12 }}>
          <span style={{ width: lvlPct + '%', background: '#fcd34d' }} />
        </div>
        <div style={{ fontSize: '.85rem', opacity: .9, marginTop: 6 }}>
          {me.nextMin !== null ? <>До уровня «{LEVELS[me.levelIdx + 1].name}»: {toNext} баллов</> : 'Максимальный уровень!'}
        </div>
      </section>

      <div className="stats">
        <div className="stat"><div className="v">{me.pre === null ? '—' : pc(me.pre / me.total)} → {me.post === null ? '—' : pc(me.post / me.total)}</div><div className="l">знания: утро → вечер</div></div>
        <div className="stat"><div className="v">{pc(me.normGain)}</div><div className="l">освоено из того, что утром было неизвестно</div></div>
        <div className="stat"><div className="v">{pc(me.engagement)}</div><div className="l">вовлечённость: ответы в интерактиве</div></div>
        <div className="stat"><div className="v">{me.gradable ? `${me.correctLive}/${me.gradable}` : '—'}</div><div className="l">верно в «Миф или факт» и кейсах</div></div>
        <div className="stat"><div className="v">{f1(me.confPre)} → {f1(me.confPost)}</div><div className="l">уверенность (из 5): утро → вечер</div></div>
      </div>

      <div className="grid">
        {tiles.map((x) => x.href ? (
          <Link key={x.t} href={x.href} className="tile"><div className="t">{x.t}</div><div className="s">{x.s}</div></Link>
        ) : (
          <div key={x.t} className="tile dim"><div className="t">{x.t}</div><div className="s">{x.s}</div></div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row between"><h3 style={{ margin: 0 }}>Значки</h3><span className="small muted">{me.badges.filter((b) => b.got).length} из {me.badges.length}</span></div>
        <div className="badges">
          {me.badges.map((b) => (
            <div key={b.id} className={'bdg' + (b.got ? ' got' : '')} title={b.how}>
              <div className="i">{b.icon}</div><div className="n">{b.name}</div><div className="h">{b.how}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Цель: сертификат с отличием</h3>
        <ul className="goals">
          <li className={me.post !== null && me.post / me.total >= 0.85 ? 'done' : ''}>Итоговый тест: не меньше {Math.ceil(me.total * 0.85)} из {me.total} {me.post !== null && <span className="muted">(у вас {me.post})</span>}</li>
          <li className={me.engagement === null || me.engagement >= 0.7 ? 'done' : ''}>Ответить не меньше чем на 70% вопросов интерактива <span className="muted">(у вас {pc(me.engagement)})</span></li>
        </ul>
      </div>

      {g.board_open && board.length > 0 && (
        <div className="card">
          <h3>Рейтинг группы</h3>
          <ol className="board">
            {board.map((s) => (
              <li key={s.userId} className={s.userId === u.id ? 'me' : ''}><span>{s.display}</span><span className="muted small">{s.level}</span><b>{s.xp}</b></li>
            ))}
          </ol>
          {!board.some((s) => s.userId === u.id) && !me.hidden && <p className="small muted" style={{ margin: '8px 0 0' }}>Вы на {me.rank} месте с {me.xp} баллами.</p>}
          <p className="small muted" style={{ margin: '8px 0 0' }}>Показываем только первую пятёрку. Скрыть себя можно в профиле.</p>
        </div>
      )}

      <details className="card">
        <summary><b>Как начисляются баллы</b></summary>
        <table style={{ marginTop: 10 }}>
          <tbody>{RULES.map((r) => <tr key={r.what}><td>{r.what}{r.note && <div className="small muted">{r.note}</div>}</td><td style={{ whiteSpace: 'nowrap' }}><b>{r.pts}</b></td></tr>)}</tbody>
        </table>
        <p className="small muted" style={{ marginTop: 10 }}>Уровни: {LEVELS.map((l) => `${l.name} (${l.min}+)`).join(' → ')}.</p>
      </details>

      <details className="card">
        <summary><b>Профиль</b> <span className="muted small">· {u.phone}</span></summary>
        <ProfileForm name={u.full_name} workplace={u.workplace ?? ''} hideBoard={!!u.hide_board} />
      </details>
    </main>
  );
}
