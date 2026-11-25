import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { RegisterForm } from '@/components/AuthForms';

export default async function Join({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const u = await currentUser();
  if (u) redirect(u.role === 'trainer' ? '/admin' : '/me');
  const code = ((await searchParams).code || '').toUpperCase().slice(0, 40);
  let groupName = '';
  if (code) {
    const sql = await db();
    const g = await sql`select name from groups where upper(code) = ${code}`;
    groupName = g[0]?.name ?? '';
  }
  return (
    <main className="wrap narrow">
      <div className="card">
        <h1>Регистрация</h1>
        {groupName ? <p>Группа: <span className="badge">{groupName}</span></p>
          : <p className="muted">Введите код группы, который назвал тренер, или отсканируйте QR-код в зале.</p>}
        <RegisterForm code={code} />
      </div>
    </main>
  );
}
