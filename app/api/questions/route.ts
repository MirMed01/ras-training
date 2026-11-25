import { NextResponse } from 'next/server';
import { currentUser, userGroup } from '@/lib/auth';
import { db } from '@/lib/db';
import { shortName } from '@/lib/score';

export const dynamic = 'force-dynamic';

async function groupFor(req: Request) {
  const u = await currentUser();
  if (!u) return { u: null, gid: 0 };
  if (u.role === 'trainer') return { u, gid: Number(new URL(req.url).searchParams.get('g')) };
  const g = await userGroup(u);
  return { u, gid: g?.id ?? 0 };
}

export async function GET(req: Request) {
  const { u, gid } = await groupFor(req);
  if (!u) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const sql = await db();
  const rows = await sql`select q.id, q.text, q.anonymous, q.answered, q.hidden, q.starred, q.user_id, u.full_name,
      (select count(*)::int from question_votes v where v.question_id = q.id) as votes,
      exists(select 1 from question_votes v where v.question_id = q.id and v.user_id = ${u.id}) as voted
    from questions q join users u on u.id = q.user_id
    where q.group_id = ${gid} ${u.role === 'trainer' ? sql`` : sql`and not q.hidden`}
    order by q.answered, votes desc, q.created_at`;
  const isTrainer = u.role === 'trainer';
  return NextResponse.json({
    questions: rows.map((r) => ({
      id: r.id, text: r.text, votes: r.votes, voted: r.voted, answered: r.answered, hidden: r.hidden, starred: r.starred,
      mine: r.user_id === u.id,
      author: r.anonymous ? (isTrainer ? `аноним (${shortName(r.full_name)})` : 'аноним') : shortName(r.full_name),
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const { u, gid } = await groupFor(req);
  if (!u || !gid) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sql = await db();
  if (body.vote) {
    const qid = Number(body.vote);
    const ok = (await sql`select 1 from questions where id = ${qid} and group_id = ${gid}`)[0];
    if (!ok) return NextResponse.json({ error: 'нет вопроса' }, { status: 404 });
    const del = await sql`delete from question_votes where question_id = ${qid} and user_id = ${u.id} returning 1`;
    if (!del.length) await sql`insert into question_votes(question_id, user_id) values (${qid}, ${u.id}) on conflict do nothing`;
    return NextResponse.json({ ok: true });
  }
  const text = String(body.text ?? '').trim().slice(0, 500);
  if (text.length < 3) return NextResponse.json({ error: 'Слишком короткий вопрос' }, { status: 400 });
  const [{ n }] = await sql`select count(*)::int as n from questions where user_id = ${u.id} and created_at > now() - interval '1 minute'`;
  if (n >= 3) return NextResponse.json({ error: 'Не больше 3 вопросов в минуту' }, { status: 429 });
  await sql`insert into questions(group_id, user_id, text, anonymous) values (${gid}, ${u.id}, ${text}, ${body.anonymous !== false})`;
  return NextResponse.json({ ok: true });
}
