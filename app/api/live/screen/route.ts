import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { liveFor, resultsFor } from '@/lib/live';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== 'trainer') return NextResponse.json({ error: 'auth' }, { status: 401 });
  const gid = Number(new URL(req.url).searchParams.get('g'));
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from users where group_id = ${gid} and role = 'participant'`;
  const live = await liveFor(gid);
  if (!live) return NextResponse.json({ state: 'idle', members: n }, { headers: { 'Cache-Control': 'no-store' } });
  const { activity: a, runId, revealed } = live;
  const results = await resultsFor(runId, a.options.length);
  return NextResponse.json({
    state: 'live', runId, revealed, members: n,
    activity: { id: a.id, type: a.type, title: a.title, prompt: a.prompt, options: a.options },
    correct: a.correct, explanation: a.explanation, results,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
