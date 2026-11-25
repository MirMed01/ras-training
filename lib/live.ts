import { db, type Activity } from './db';

export type LiveResults = { counts: number[]; texts: string[]; total: number };

export async function liveFor(groupId: number) {
  const sql = await db();
  const rows = await sql`select l.run_id, l.revealed, a.id, a.module, a.type, a.title, a.prompt, a.options, a.correct, a.explanation
    from live l join activities a on a.id = l.activity_id where l.group_id = ${groupId} and l.run_id is not null`;
  if (!rows[0]) return null;
  const r = rows[0];
  const activity: Activity = {
    id: r.id, module: r.module, type: r.type, title: r.title, prompt: r.prompt,
    options: r.options ?? [], correct: r.correct, explanation: r.explanation, sort: 0,
  };
  return { runId: r.run_id as string, revealed: r.revealed as boolean, activity };
}

export async function resultsFor(runId: string, nOptions: number): Promise<LiveResults> {
  const sql = await db();
  const rows = await sql`select choice, text from responses where run_id = ${runId} order by created_at`;
  const counts = Array.from({ length: nOptions }, () => 0);
  const texts: string[] = [];
  for (const r of rows) {
    if (r.choice !== null && r.choice >= 0 && r.choice < nOptions) counts[r.choice]++;
    if (r.text) texts.push(r.text);
  }
  return { counts, texts, total: rows.length };
}
