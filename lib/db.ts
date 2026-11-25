import postgres from 'postgres';
import crypto from 'crypto';
import { SEED_ACTIVITIES, SEED_MATERIALS } from './content';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __schemaReady: Promise<void> | undefined;
}

function makeSql() {
  const local = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    max: local ? 10 : 3,
    ssl: local ? false : 'require',
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
}

export const sql = globalThis.__sql ?? (globalThis.__sql = makeSql());

const SCHEMA = `
create table if not exists settings(key text primary key, value text not null);
create table if not exists groups(
  id serial primary key, name text not null, code text unique not null, module int not null default 1,
  pre_open boolean not null default false, post_open boolean not null default false,
  feedback_open boolean not null default false, cert_open boolean not null default false,
  created_at timestamptz not null default now());
create table if not exists users(
  id serial primary key, full_name text not null, phone text unique not null, profession text,
  workplace text, password_hash text not null, role text not null default 'participant',
  group_id int references groups(id) on delete set null, created_at timestamptz not null default now());
create table if not exists attempts(
  id serial primary key, user_id int not null references users(id) on delete cascade, module int not null,
  kind text not null, answers jsonb not null, score int not null, total int not null,
  created_at timestamptz not null default now(), unique(user_id, module, kind));
create table if not exists feedback(
  user_id int not null references users(id) on delete cascade, module int not null, ratings jsonb not null,
  apply_text text, next_text text, created_at timestamptz not null default now(), primary key(user_id, module));
create table if not exists activities(
  id serial primary key, module int not null, type text not null, title text not null, prompt text not null,
  options jsonb not null default '[]', correct int, explanation text, sort int not null default 0,
  created_at timestamptz not null default now());
create table if not exists live(
  group_id int primary key references groups(id) on delete cascade,
  activity_id int references activities(id) on delete set null, run_id text, revealed boolean not null default false,
  updated_at timestamptz not null default now());
create table if not exists responses(
  id serial primary key, run_id text not null, activity_id int, group_id int,
  user_id int not null references users(id) on delete cascade, choice int, text text,
  created_at timestamptz not null default now(), unique(run_id, user_id));
create index if not exists responses_run on responses(run_id);
create index if not exists responses_activity on responses(activity_id, group_id);
create table if not exists materials(
  id serial primary key, module int not null, title text not null, body text, url text, sort int not null default 0);
`;

async function setup() {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(424242)`;
    await tx.unsafe(SCHEMA);
    const [{ n }] = await tx`select count(*)::int as n from groups`;
    if (n === 0) {
      await tx`insert into groups(name, code, module, pre_open) values
        ('Модуль 1 · 27 ноября', 'RAS1', 1, true),
        ('Модуль 2 · 5 декабря (медработники)', 'RAS2', 2, false)`;
    }
    const [{ a }] = await tx`select count(*)::int as a from activities`;
    if (a === 0) {
      let i = 0;
      for (const s of SEED_ACTIVITIES) {
        await tx`insert into activities(module, type, title, prompt, options, correct, explanation, sort)
          values (${s.module}, ${s.type}, ${s.title}, ${s.prompt}, ${tx.json(s.options ?? [])},
                  ${s.correct ?? null}, ${s.explanation ?? null}, ${i++})`;
      }
    }
    const [{ m }] = await tx`select count(*)::int as m from materials`;
    if (m === 0) {
      let i = 0;
      for (const s of SEED_MATERIALS) {
        await tx`insert into materials(module, title, body, url, sort)
          values (${s.module}, ${s.title}, ${s.body}, ${s.url ?? null}, ${i++})`;
      }
    }
    await tx`insert into settings(key, value) values ('trainer_code', ${'T-' + crypto.randomBytes(3).toString('hex').toUpperCase()})
      on conflict (key) do nothing`;
    await tx`insert into settings(key, value) values ('auth_secret', ${crypto.randomBytes(32).toString('hex')})
      on conflict (key) do nothing`;
  });
}

export function ensureSchema(): Promise<void> {
  if (!url) return Promise.reject(new Error('DATABASE_URL не задан'));
  if (!globalThis.__schemaReady) {
    globalThis.__schemaReady = setup().catch((e) => {
      globalThis.__schemaReady = undefined;
      throw e;
    });
  }
  return globalThis.__schemaReady;
}

export async function db() {
  await ensureSchema();
  return sql;
}

export async function getSetting(key: string): Promise<string | null> {
  const s = await db();
  const rows = await s`select value from settings where key = ${key}`;
  return rows[0]?.value ?? null;
}

export type Group = {
  id: number; name: string; code: string; module: number;
  pre_open: boolean; post_open: boolean; feedback_open: boolean; cert_open: boolean;
};
export type User = {
  id: number; full_name: string; phone: string; profession: string | null; workplace: string | null;
  role: 'participant' | 'trainer'; group_id: number | null;
};
export type Activity = {
  id: number; module: number; type: 'myth' | 'quiz' | 'poll' | 'open'; title: string; prompt: string;
  options: string[]; correct: number | null; explanation: string | null; sort: number;
};
