import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { LoginForm } from '@/components/AuthForms';

export default async function Login() {
  const u = await currentUser();
  if (u) redirect(u.role === 'trainer' ? '/admin' : '/me');
  return (
    <main className="wrap narrow">
      <div className="card">
        <h1>Вход</h1>
        <LoginForm />
      </div>
    </main>
  );
}
