import Link from 'next/link';
import { requireUser, userGroup } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { myAttempts, myFeedback } from '@/lib/data';
import { MODULES } from '@/lib/content';
import { ProfileForm } from '@/components/AuthForms';

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
  const canCert = g.cert_open && !!post;

  const tiles: { href: string; t: string; s: React.ReactNode; on: boolean }[] = [
    { href: '/test/pre', t: '1. Входной тест', on: g.pre_open && !pre,
      s: pre ? <span className="badge ok">пройден: {pre.score} из {pre.total}</span> : g.pre_open ? '8 вопросов, 5 минут' : <span className="badge warn">откроется в начале дня</span> },
    { href: '/live', t: '2. Интерактив', on: true, s: 'Голосования, «Миф или факт» и кейсы в реальном времени' },
    { href: '/materials', t: '3. Материалы', on: true, s: 'Программа, шпаргалки по критериям, инструменты' },
    { href: '/test/post', t: '4. Итоговый тест', on: g.post_open && !post,
      s: post ? <span className="badge ok">пройден: {post.score} из {post.total}</span> : g.post_open ? 'Те же вопросы, что утром, с пояснениями' : <span className="badge warn">откроется в конце дня</span> },
    { href: '/feedback', t: '5. Анкета', on: g.feedback_open,
      s: fb ? <span className="badge ok">спасибо, заполнено</span> : g.feedback_open ? '2 минуты: ваша оценка тренинга' : <span className="badge warn">откроется в конце дня</span> },
    { href: '/certificate', t: '6. Сертификат', on: canCert,
      s: canCert ? 'Скачать или распечатать PDF' : <span className="badge warn">после итогового теста</span> },
  ];

  return (
    <main className="wrap">
      {sp.thanks && <div className="okmsg">Спасибо за отзыв!</div>}
      <div className="card">
        <div className="row between">
          <div>
            <h1 style={{ marginBottom: 4 }}>Здравствуйте, {u.full_name.split(' ').slice(-1)[0]}!</h1>
            <div className="muted">{g.name} · {m?.name}</div>
          </div>
          {(pre || post) && <Link className="btn ghost sm" href="/results">Мои результаты</Link>}
        </div>
      </div>
      <div className="grid">
        {tiles.map((x) => x.on || x.href === '/test/pre' || x.href === '/test/post' ? (
          <Link key={x.href} href={x.on ? x.href : (x.href.startsWith('/test') && (pre || post) ? '/results' : '/me')} className={'tile' + (x.on ? '' : ' dim')}>
            <div className="t">{x.t}</div><div className="s">{x.s}</div>
          </Link>
        ) : (
          <div key={x.href} className="tile dim"><div className="t">{x.t}</div><div className="s">{x.s}</div></div>
        ))}
      </div>
      <details className="card" style={{ marginTop: 16 }}>
        <summary><b>Профиль</b> <span className="muted small">· {u.phone}</span></summary>
        <ProfileForm name={u.full_name} workplace={u.workplace ?? ''} />
      </details>
    </main>
  );
}
