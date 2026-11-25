import { NextResponse } from 'next/server';
import { currentUser, userGroup } from '@/lib/auth';
import { db } from '@/lib/db';
import { liveFor, resultsFor } from '@/lib/live';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const g = await userGroup(u);
  if (!g) return NextResponse.json({ state: 'nogroup' });
  const live = await liveFor(g.id);
  if (!live) return NextResponse.json({ state: 'idle' });
  const { activity: a, runId, revealed } = live;
  const sql = await db();
  const mine = (await sql`select choice, text from responses where run_id = ${runId} and user_id = ${u.id}`)[0] ?? null;
  const showResults = revealed || a.type === 'poll' || a.type === 'open';
  const results = showResults && (mine || revealed) ? await resultsFor(runId, a.options.length) : null;
  return NextResponse.json({
    state: 'live', runId, revealed,
    activity: { id: a.id, type: a.type, title: a.title, prompt: a.prompt, options: a.options },
    correct: revealed ? a.correct : null,
    explanation: revealed ? a.explanation : null,
    mine, results,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const g = await userGroup(u);
  if (!g) return NextResponse.json({ error: 'nogroup' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const live = await liveFor(g.id);
  if (!live || live.runId !== body.runId) return NextResponse.json({ error: 'Вопрос уже сменился' }, { status: 409 });
  if (live.revealed) return NextResponse.json({ error: 'Ответы уже показаны' }, { status: 409 });
  const a = live.activity;
  let choice: number | null = null;
  let text: string | null = null;
  if (a.type === 'open') {
    text = String(body.text ?? '').trim().slice(0, 200);
    if (!text) return NextResponse.json({ error: 'Пустой ответ' }, { status: 400 });
  } else {
    choice = Number(body.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice >= a.options.length) return NextResponse.json({ error: 'Неверный вариант' }, { status: 400 });
  }
  const sql = await db();
  await sql`insert into responses(run_id, activity_id, group_id, user_id, choice, text)
    values (${live.runId}, ${a.id}, ${g.id}, ${u.id}, ${choice}, ${text})
    on conflict (run_id, user_id) do update set choice = excluded.choice, text = excluded.text, created_at = now()`;
  return NextResponse.json({ ok: true });
}
