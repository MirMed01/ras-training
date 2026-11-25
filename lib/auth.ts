import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db, getSetting, type User, type Group } from './db';

const COOKIE = 'ras_session';
let secretCache: Uint8Array | null = null;

async function secret(): Promise<Uint8Array> {
  if (secretCache) return secretCache;
  const s = process.env.AUTH_SECRET || (await getSetting('auth_secret'));
  if (!s) throw new Error('Нет секрета сессии');
  secretCache = new TextEncoder().encode(s);
  return secretCache;
}

export function normPhone(p: string): string {
  return (p || '').replace(/\D/g, '').slice(-12);
}

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 10);
}

export async function checkPassword(p: string, h: string) {
  return bcrypt.compare(p, h);
}

export async function startSession(userId: number) {
  const sql = await db();
  const [row] = await sql`select token_ver from users where id = ${userId}`;
  const token = await new SignJWT({ uid: userId, v: row?.token_ver ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60d')
    .sign(await secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    const uid = Number(payload.uid);
    const sql = await db();
    const rows = await sql<(User & { token_ver: number })[]>`select id, full_name, phone, profession, workplace, role, group_id, hide_board, token_ver from users where id = ${uid}`;
    const u = rows[0];
    // После смены или сброса пароля старые сессии (другие телефоны) перестают действовать.
    if (!u || (u.token_ver ?? 0) !== Number(payload.v ?? 0)) return null;
    return u;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect('/login');
  return u;
}

export async function requireTrainer(): Promise<User> {
  const u = await requireUser();
  if (u.role !== 'trainer') redirect('/me');
  return u;
}

export async function userGroup(u: User): Promise<Group | null> {
  if (!u.group_id) return null;
  const sql = await db();
  const rows = await sql<Group[]>`select * from groups where id = ${u.group_id}`;
  return rows[0] ?? null;
}
