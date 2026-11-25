import { notFound } from 'next/navigation';
import { requireTrainer } from '@/lib/auth';
import { db, type Group } from '@/lib/db';
import { joinUrl, qrSvg } from '@/lib/url';
import { ScreenClient } from '@/components/Live';
import { QuestionsScreen } from '@/components/Questions';

export default async function Screen({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  await requireTrainer();
  const id = Number((await params).id);
  const sql = await db();
  const g = (await sql<Group[]>`select * from groups where id = ${id}`)[0];
  if (!g) notFound();
  if ((await searchParams).view === 'qa') return <QuestionsScreen groupId={g.id} />;
  const url = await joinUrl(g.code);
  return <ScreenClient groupId={g.id} qr={await qrSvg(url)} joinUrl={url} groupName={g.name} />;
}
