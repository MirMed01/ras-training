import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SetupForm } from '@/components/AuthForms';

export default async function Setup() {
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from users where role = 'trainer'`;
  if (n > 0) redirect('/login');
  return (
    <main className="wrap narrow">
      <div className="card">
        <h1>Первый запуск</h1>
        <p className="muted">Создайте аккаунт главного тренера. Эта страница работает только один раз. Остальные тренеры регистрируются по коду тренера из кабинета.</p>
        <SetupForm />
      </div>
    </main>
  );
}
