import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { EVENT, MODULES } from '@/lib/content';

export default async function Home() {
  const u = await currentUser();
  if (u) redirect(u.role === 'trainer' ? '/admin' : '/me');
  return (
    <main className="wrap narrow">
      <section className="hero">
        <div className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>{EVENT.city} · {EVENT.organizer}</div>
        <h1 style={{ marginTop: 12 }}>{EVENT.title}</h1>
        <p>Платформа тренинга: входной и итоговый тест, голосования и кейсы в реальном времени, материалы и сертификат.</p>
        <div className="row">
          <Link className="btn" href="/join">Регистрация</Link>
          <Link className="btn ghost" href="/login">Уже есть аккаунт</Link>
        </div>
      </section>
      {Object.entries(MODULES).map(([k, m]) => (
        <div className="card" key={k}>
          <div className="row between"><h3 style={{ margin: 0 }}>{m.name}</h3><span className="badge">{m.date}</span></div>
          <ul className="muted small" style={{ marginBottom: 0 }}>{m.topics.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      ))}
      <p className="muted small">Спикеры: {EVENT.speakers.join(', ')}. Организатор: {EVENT.coordinator}.</p>
    </main>
  );
}
