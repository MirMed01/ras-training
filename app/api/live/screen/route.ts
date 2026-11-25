import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { liveFor, resultsFor } from '@/lib/live';
import { groupScores, leaderboard } from '@/lib/score';
import type { Group } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== 'trainer') return NextResponse.json({ error: 'auth' }, { status: 401 });
  const gid = Number(new URL(req.url).searchParams.get('g'));
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from users where group_id = ${gid} and role = 'participant'`;
  const live = await liveFor(gid);
  if (!live) {
    const g = (await sql<Group[]>`select * from groups where id = ${gid}`)[0];
    const board = g?.board_open ? leaderboard(await groupScores(g), 10).map((s) => ({ name: s.display, xp: s.xp, level: s.level })) : [];
    return NextResponse.json({ state: 'idle', members: n, board }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const { activity: a, runId, revealed } = live;
  const results = await resultsFor(runId, a.options.length);
  return NextResponse.json({
    state: 'live', runId, revealed, members: n,
    activity: { id: a.id, type: a.type, title: a.title, prompt: a.prompt, options: a.options },
    correct: a.correct, explanation: a.explanation, results,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
