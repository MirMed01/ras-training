import { notFound } from 'next/navigation';
import { requireTrainer } from '@/lib/auth';
import { db, type Group } from '@/lib/db';
import { joinUrl, qrSvg } from '@/lib/url';
import { EVENT } from '@/lib/content';
import { PrintButton } from '@/components/PrintButton';

export default async function QrPoster({ params }: { params: Promise<{ id: string }> }) {
  await requireTrainer();
  const id = Number((await params).id);
  const sql = await db();
  const g = (await sql<Group[]>`select * from groups where id = ${id}`)[0];
  if (!g) notFound();
  const url = await joinUrl(g.code);
  const svg = await qrSvg(url);
  return (
    <main className="wrap narrow" style={{ textAlign: 'center' }}>
      <div className="noprint" style={{ marginBottom: 12 }}><PrintButton /></div>
      <h1>{EVENT.title}</h1>
      <p style={{ fontSize: '1.2rem' }}>Отсканируйте камерой телефона и зарегистрируйтесь</p>
      <div style={{ maxWidth: 380, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: svg }} />
      <p style={{ fontSize: '1.1rem', wordBreak: 'break-all' }}>{url.replace(/^https?:\/\//, '')}</p>
      <p style={{ fontSize: '1.4rem' }}>Код группы: <b>{g.code}</b></p>
      <p className="muted">{g.name}</p>
    </main>
  );
}
