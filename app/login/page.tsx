import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { currentUser } from '@/lib/auth';
import { LoginForm } from '@/components/AuthForms';

export default async function Login() {
  const u = await currentUser();
  if (u) redirect(u.role === 'trainer' ? '/admin' : '/me');
  return (
    <AuthShell>
      <div className="card">
        <h1>Вход</h1>
        <LoginForm />
      </div>
    </AuthShell>
  );
}
