import Link from 'next/link';
import { requireTrainer } from '@/lib/auth';
import { db, getSetting } from '@/lib/db';
import { regenerateTrainerCode, saveGroup } from '@/lib/actions';
import { baseUrl } from '@/lib/url';

export default async function Admin() {
  const me = await requireTrainer();
  const sql = await db();
  const groups = await sql`select g.*,
      (select count(*)::int from users u where u.group_id = g.id and u.role = 'participant') as n,
      (select count(*)::int from attempts a join users u on u.id = a.user_id where u.group_id = g.id and a.kind = 'pre' and a.module = g.module) as npre,
      (select count(*)::int from attempts a join users u on u.id = a.user_id where u.group_id = g.id and a.kind = 'post' and a.module = g.module) as npost
    from groups g order by g.id`;
  const trainers = await sql`select full_name, phone from users where role = 'trainer' order by id`;
  const code = await getSetting('trainer_code');
  const base = await baseUrl();
  return (
    <main className="wrap">
      <div className="row between"><h1>Кабинет тренера</h1><span className="muted small">{me.full_name}</span></div>
      <div className="grid" style={{ marginBottom: 16 }}>
        {groups.map((g) => (
          <Link className="tile" key={g.id} href={`/admin/group/${g.id}`}>
            <div className="t">{g.name}</div>
            <div className="s">Модуль {g.module} · код <b>{g.code}</b></div>
            <div className="s" style={{ marginTop: 6 }}>Участников: <b>{g.n}</b> · претест: {g.npre} · посттест: {g.npost}</div>
          </Link>
        ))}
      </div>
      <details className="card">
        <summary><b>Создать группу</b></summary>
        <form action={saveGroup}>
          <label>Название</label><input type="text" name="name" required placeholder="Например, Модуль 1 · поток 2" />
          <label>Код для входа (латиница/цифры)</label><input type="text" name="code" required placeholder="RAS1B" />
          <label>Модуль (определяет тест и интерактив)</label>
          <select name="module" defaultValue="1"><option value="1">Модуль 1</option><option value="2">Модуль 2</option></select>
          <button className="btn sm" style={{ marginTop: 12 }}>Создать</button>
        </form>
      </details>
      <div className="card">
        <h3>Тренеры и доступ</h3>
        <p className="small">Код тренера: <b style={{ fontSize: '1.1rem' }}>{code}</b>. Другой тренер регистрируется на <span className="muted">{base}/join</span> и вводит этот код вместо кода группы.</p>
        <form action={regenerateTrainerCode}><button className="btn ghost sm">Сменить код тренера</button></form>
        <ul className="small" style={{ marginTop: 12 }}>{trainers.map((t) => <li key={t.phone}>{t.full_name} · {t.phone}</li>)}</ul>
      </div>
      <p><Link href="/admin/content">Интерактив и материалы →</Link></p>
    </main>
  );
}
