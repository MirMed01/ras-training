import { EVENT, MODULES } from '@/lib/content';
import { CenterMark, ProtocolArt } from '@/components/Brand';

// Оформление страниц входа и регистрации: слева фирменная панель, справа форма.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth">
      <aside className="auth-side">
        <CenterMark light />
        <div className="auth-title">{EVENT.title}</div>
        <p>{MODULES[1].date}, {EVENT.city}</p>
        <div className="auth-art" aria-hidden="true"><ProtocolArt /></div>
      </aside>
      <div className="auth-main">{children}</div>
    </main>
  );
}
