import { currentUser } from '@/lib/auth';
import { db, type Group } from '@/lib/db';
import { groupStats } from '@/lib/stats';
import { FEEDBACK_ITEMS, TESTS } from '@/lib/content';
import { certNo } from '@/lib/data';

export const dynamic = 'force-dynamic';

function cell(v: unknown) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // защита от формул в Excel
  return '"' + s.replace(/"/g, '""') + '"';
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await currentUser();
  if (!u || u.role !== 'trainer') return new Response('Нет доступа', { status: 401 });
  const id = Number((await params).id);
  const sql = await db();
  const g = (await sql<Group[]>`select * from groups where id = ${id}`)[0];
  if (!g) return new Response('Нет группы', { status: 404 });
  const s = await groupStats(g);
  const qs = TESTS[g.module] ?? [];
  const fbRows = await sql`select f.user_id, f.ratings, f.apply_text, f.next_text from feedback f join users u on u.id = f.user_id
    where u.group_id = ${g.id} and f.module = ${g.module}`;
  const fbBy = new Map(fbRows.map((f) => [f.user_id, f]));
  const head = ['№', 'ФИО', 'Профессия', 'Место работы', 'Телефон', 'Регистрация',
    `Претест (из ${qs.length})`, `Посттест (из ${qs.length})`, 'Прирост',
    ...qs.map((_, i) => `Пре В${i + 1}`), ...qs.map((_, i) => `Пост В${i + 1}`),
    ...FEEDBACK_ITEMS, 'Применю в работе', 'Хочу разобрать', 'Номер сертификата'];
  const lines = [head.map(cell).join(';')];
  s.rows.forEach((r, i) => {
    const f = fbBy.get(r.id);
    const mark = (ans: number[] | null, k: number) => (ans ? (ans[k] === qs[k].correct ? 1 : 0) : '');
    lines.push([
      i + 1, r.full_name, r.profession, r.workplace, r.phone, new Date(r.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Dushanbe' }),
      r.pre_score, r.post_score, r.pre_score !== null && r.post_score !== null ? r.post_score - r.pre_score : '',
      ...qs.map((_, k) => mark(r.pre_answers, k)), ...qs.map((_, k) => mark(r.post_answers, k)),
      ...FEEDBACK_ITEMS.map((_, k) => (f ? (f.ratings as (number | null)[])[k] : '')),
      f?.apply_text, f?.next_text, r.post_score !== null ? certNo({ id: r.id } as never, g) : '',
    ].map(cell).join(';'));
  });
  const body = '﻿' + lines.join('\r\n');
  const name = encodeURIComponent(`РАС_${g.code}_результаты.csv`);
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="results.csv"; filename*=UTF-8''${name}`,
      'Cache-Control': 'no-store',
    },
  });
}
