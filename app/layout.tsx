import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { logout } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Эксперт по диагностике РАС',
  description: 'Учебная платформа тренинга: тесты, интерактив, материалы, сертификаты.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f6e66' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try { user = await currentUser(); } catch { user = null; }
  return (
    <html lang="ru">
      <body>
        <header className="top">
          <div className="wrap">
            <Link href="/" className="logo">РАС·Эксперт<small>тренинг</small></Link>
            <nav>
              {user?.role === 'participant' && (<>
                <Link href="/me">Кабинет</Link>
                <Link href="/live">Интерактив</Link>
                <Link href="/materials">Материалы</Link>
              </>)}
              {user?.role === 'trainer' && (<>
                <Link href="/admin">Группы</Link>
                <Link href="/admin/content">Контент</Link>
              </>)}
              {user ? (
                <form action={logout}><button className="linkbtn">Выйти</button></form>
              ) : (<>
                <Link href="/login">Войти</Link>
              </>)}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
