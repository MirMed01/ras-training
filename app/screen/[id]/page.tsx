import { notFound } from 'next/navigation';
import { requireTrainer } from '@/lib/auth';
import { db, type Group } from '@/lib/db';
import { joinUrl, qrSvg } from '@/lib/url';
import { ScreenClient } from '@/components/Live';

export default async function Screen({ params }: { params: Promise<{ id: string }> }) {
  await requireTrainer();
  const id = Number((await params).id);
  const sql = await db();
  const g = (await sql<Group[]>`select * from groups where id = ${id}`)[0];
  if (!g) notFound();
  const url = await joinUrl(g.code);
  return <ScreenClient groupId={g.id} qr={await qrSvg(url)} joinUrl={url} groupName={g.name} />;
}
