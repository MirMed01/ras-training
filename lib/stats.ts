import { db, type Group } from './db';
import { FEEDBACK_ITEMS, TESTS } from './content';

export type Row = {
  id: number; full_name: string; phone: string; profession: string | null; workplace: string | null; created_at: Date;
  pre_score: number | null; post_score: number | null; pre_answers: number[] | null; post_answers: number[] | null;
  has_fb: boolean;
};

export async function groupStats(g: Group) {
  const sql = await db();
  const rows = await sql<Row[]>`
    select u.id, u.full_name, u.phone, u.profession, u.workplace, u.created_at,
      pre.score as pre_score, post.score as post_score, pre.answers as pre_answers, post.answers as post_answers,
      exists(select 1 from feedback f where f.user_id = u.id and f.module = ${g.module}) as has_fb
    from users u
    left join attempts pre on pre.user_id = u.id and pre.kind = 'pre' and pre.module = ${g.module}
    left join attempts post on post.user_id = u.id and post.kind = 'post' and post.module = ${g.module}
    where u.group_id = ${g.id} and u.role = 'participant'
    order by u.full_name`;
  const qs = TESTS[g.module] ?? [];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const preScores = rows.filter((r) => r.pre_score !== null).map((r) => r.pre_score as number);
  const postScores = rows.filter((r) => r.post_score !== null).map((r) => r.post_score as number);
  const paired = rows.filter((r) => r.pre_score !== null && r.post_score !== null);
  const gain = avg(paired.map((r) => (r.post_score as number) - (r.pre_score as number)));
  const items = qs.map((q, i) => {
    const pr = rows.filter((r) => r.pre_answers);
    const po = rows.filter((r) => r.post_answers);
    return {
      q: q.q,
      pre: pr.length ? pr.filter((r) => r.pre_answers![i] === q.correct).length / pr.length : null,
      post: po.length ? po.filter((r) => r.post_answers![i] === q.correct).length / po.length : null,
    };
  });
  const byProf: Record<string, number> = {};
  rows.forEach((r) => { const k = r.profession || '—'; byProf[k] = (byProf[k] || 0) + 1; });

  const fb = await sql`select f.ratings, f.apply_text, f.next_text, u.full_name from feedback f join users u on u.id = f.user_id
    where u.group_id = ${g.id} and f.module = ${g.module} order by f.created_at`;
  const fbAvg = FEEDBACK_ITEMS.map((t, i) => {
    const vs = fb.map((f) => (f.ratings as (number | null)[])[i]).filter((v): v is number => typeof v === 'number');
    return { t, avg: avg(vs), n: vs.length };
  });
  return {
    rows, total: qs.length, items, byProf, fb, fbAvg,
    preAvg: avg(preScores), postAvg: avg(postScores), gain, nPre: preScores.length, nPost: postScores.length, nPaired: paired.length,
  };
}
