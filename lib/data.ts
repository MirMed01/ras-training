import { db, type Group, type User } from './db';

export type Attempt = { kind: 'pre' | 'post'; score: number; total: number; answers: number[]; created_at: Date };

export async function myAttempts(u: User, module: number) {
  const sql = await db();
  const rows = await sql<Attempt[]>`select kind, score, total, answers, created_at from attempts where user_id = ${u.id} and module = ${module}`;
  return { pre: rows.find((r) => r.kind === 'pre'), post: rows.find((r) => r.kind === 'post') };
}

export async function myFeedback(u: User, module: number) {
  const sql = await db();
  const rows = await sql`select 1 from feedback where user_id = ${u.id} and module = ${module}`;
  return rows.length > 0;
}

export function certNo(u: User, g: Group) {
  return `RAS-M${g.module}-2026-${String(u.id).padStart(4, '0')}`;
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
