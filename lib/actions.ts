'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, getSetting } from './db';
import {
  checkPassword, currentUser, endSession, hashPassword, normPhone, requireTrainer, requireUser, startSession, userGroup,
} from './auth';
import { CONFIDENCE, FEEDBACK_ITEMS, PROFESSIONS, TESTS } from './content';

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? '').trim().slice(0, max);

// ---------- Вход и регистрация ----------

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const full_name = str(fd, 'full_name', 120);
  const phone = normPhone(str(fd, 'phone', 40));
  const profession = str(fd, 'profession', 60);
  const workplace = str(fd, 'workplace', 160);
  const password = String(fd.get('password') ?? '');
  const code = str(fd, 'code', 40).toUpperCase();
  if (full_name.split(/\s+/).length < 2) return { error: 'Укажите фамилию и имя (так они будут в сертификате).' };
  if (phone.length < 9) return { error: 'Укажите номер телефона полностью, например +992 90 123 45 67.' };
  if (!PROFESSIONS.includes(profession)) return { error: 'Выберите профессию.' };
  if (password.length < 6) return { error: 'Пароль должен быть не короче 6 символов.' };
  if (!fd.get('consent')) return { error: 'Нужно согласие на обработку данных для участия в тренинге.' };

  const sql = await db();
  const trainerCode = (await getSetting('trainer_code'))?.toUpperCase();
  let role = 'participant';
  let groupId: number | null = null;
  if (trainerCode && code === trainerCode) {
    role = 'trainer';
  } else {
    const g = await sql`select id from groups where upper(code) = ${code}`;
    if (!g[0]) return { error: 'Код группы не найден. Проверьте код у тренера или отсканируйте QR ещё раз.' };
    groupId = g[0].id;
  }
  const exists = await sql`select id from users where phone = ${phone}`;
  if (exists[0]) return { error: 'Этот номер уже зарегистрирован. Нажмите «Войти».' };
  const hash = await hashPassword(password);
  const [u] = await sql`insert into users(full_name, phone, profession, workplace, password_hash, role, group_id)
    values (${full_name}, ${phone}, ${profession}, ${workplace || null}, ${hash}, ${role}, ${groupId}) returning id`;
  await startSession(u.id);
  redirect(role === 'trainer' ? '/admin' : '/me');
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const phone = normPhone(str(fd, 'phone', 40));
  const password = String(fd.get('password') ?? '');
  const sql = await db();
  // Защита от подбора: не больше 8 неудачных попыток на номер за 15 минут.
  const [{ n }] = await sql`select count(*)::int as n from login_fail where phone = ${phone} and at > now() - interval '15 minutes'`;
  if (n >= 8) return { error: 'Слишком много попыток. Подождите 15 минут или попросите тренера сбросить пароль.' };
  const rows = await sql`select id, role, password_hash from users where phone = ${phone}`;
  const u = rows[0];
  if (!u || !(await checkPassword(password, u.password_hash))) {
    await sql`insert into login_fail(phone) values (${phone})`;
    await sql`delete from login_fail where at < now() - interval '1 day'`;
    return { error: 'Неверный телефон или пароль. Если забыли пароль, подойдите к тренеру: он сбросит его за минуту.' };
  }
  await sql`delete from login_fail where phone = ${phone}`;
  await startSession(u.id);
  redirect(u.role === 'trainer' ? '/admin' : '/me');
}

export async function logout() {
  await endSession();
  redirect('/');
}

export async function setupFirstTrainer(_: FormState, fd: FormData): Promise<FormState> {
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from users where role = 'trainer'`;
  if (n > 0) return { error: 'Тренер уже создан. Войдите или зарегистрируйтесь по коду тренера.' };
  const full_name = str(fd, 'full_name', 120);
  const phone = normPhone(str(fd, 'phone', 40));
  const password = String(fd.get('password') ?? '');
  if (full_name.length < 3 || phone.length < 9) return { error: 'Укажите имя и телефон полностью.' };
  if (password.length < 8) return { error: 'Пароль тренера должен быть не короче 8 символов.' };
  const exists = await sql`select id from users where phone = ${phone}`;
  if (exists[0]) return { error: 'Этот номер уже зарегистрирован.' };
  const [u] = await sql`insert into users(full_name, phone, profession, password_hash, role)
    values (${full_name}, ${phone}, 'врач', ${await hashPassword(password)}, 'trainer') returning id`;
  await startSession(u.id);
  redirect('/admin');
}

// ---------- Участник ----------

export async function submitTest(fd: FormData) {
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g) redirect('/me');
  const kind = str(fd, 'kind', 10);
  if (kind !== 'pre' && kind !== 'post') redirect('/me');
  if ((kind === 'pre' && !g.pre_open) || (kind === 'post' && !g.post_open)) redirect('/me');
  const qs = TESTS[g.module] ?? [];
  const answers = qs.map((_, i) => {
    const v = fd.get(`q${i}`);
    return v === null ? -1 : Number(v);
  });
  const score = answers.reduce((s, a, i) => s + (a === qs[i].correct ? 1 : 0), 0);
  const confidence = (CONFIDENCE[g.module] ?? []).map((_, i) => {
    const v = Number(fd.get(`c${i}`));
    return v >= 1 && v <= 5 ? v : 0;
  });
  const sql = await db();
  await sql`insert into attempts(user_id, module, kind, answers, score, total, confidence)
    values (${u.id}, ${g.module}, ${kind}, ${sql.json(answers)}, ${score}, ${qs.length}, ${sql.json(confidence)})
    on conflict (user_id, module, kind) do nothing`;
  redirect(`/results?just=${kind}`);
}

export async function submitFeedback(fd: FormData) {
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g || !g.feedback_open) redirect('/me');
  const ratings = FEEDBACK_ITEMS.map((_, i) => {
    const v = Number(fd.get(`r${i}`));
    return v >= 1 && v <= 5 ? v : null;
  });
  const sql = await db();
  await sql`insert into feedback(user_id, module, ratings, apply_text, next_text)
    values (${u.id}, ${g.module}, ${sql.json(ratings)}, ${str(fd, 'apply_text', 2000) || null}, ${str(fd, 'next_text', 2000) || null})
    on conflict (user_id, module) do update set ratings = excluded.ratings, apply_text = excluded.apply_text,
      next_text = excluded.next_text, created_at = now()`;
  redirect('/me?thanks=1');
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const full_name = str(fd, 'full_name', 120);
  const workplace = str(fd, 'workplace', 160);
  if (full_name.split(/\s+/).length < 2) return { error: 'Укажите фамилию и имя.' };
  const sql = await db();
  const hide = !!fd.get('hide_board');
  await sql`update users set full_name = ${full_name}, workplace = ${workplace || null}, hide_board = ${hide} where id = ${u.id}`;
  const np = String(fd.get('new_password') ?? '');
  if (np) {
    if (np.length < 6) return { error: 'Новый пароль должен быть не короче 6 символов.' };
    await sql`update users set password_hash = ${await hashPassword(np)}, token_ver = token_ver + 1 where id = ${u.id}`;
    await startSession(u.id);
    revalidatePath('/me');
    return { ok: 'Сохранено. Пароль изменён, на других устройствах нужно войти заново.' };
  }
  revalidatePath('/me');
  return { ok: 'Сохранено.' };
}

// ---------- Тренер: группы ----------

const FLAGS = ['pre_open', 'post_open', 'feedback_open', 'cert_open', 'board_open'] as const;

export async function toggleFlag(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('group_id'));
  const flag = String(fd.get('flag')) as (typeof FLAGS)[number];
  if (!FLAGS.includes(flag)) return;
  const sql = await db();
  await sql`update groups set ${sql(flag)} = not ${sql(flag)} where id = ${id}`;
  revalidatePath(`/admin/group/${id}`);
}

export async function saveGroup(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('group_id') || 0);
  const name = str(fd, 'name', 120);
  const code = str(fd, 'code', 20).toUpperCase().replace(/[^A-Z0-9А-ЯЁ-]/g, '');
  const module = Number(fd.get('module')) === 2 ? 2 : 1;
  if (!name || code.length < 3) return;
  const sql = await db();
  if (id) {
    await sql`update groups set name = ${name}, code = ${code}, module = ${module} where id = ${id}`.catch(() => {});
    revalidatePath(`/admin/group/${id}`);
  } else {
    await sql`insert into groups(name, code, module) values (${name}, ${code}, ${module}) on conflict do nothing`;
  }
  revalidatePath('/admin');
}

export async function regenerateTrainerCode() {
  await requireTrainer();
  const sql = await db();
  const code = 'T-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  await sql`update settings set value = ${code} where key = 'trainer_code'`;
  revalidatePath('/admin');
}

// ---------- Тренер: участники ----------

export async function resetPassword(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('user_id'));
  const pw = String(fd.get('password') ?? '').trim();
  if (pw.length < 6) return;
  const sql = await db();
  await sql`update users set password_hash = ${await hashPassword(pw)}, token_ver = token_ver + 1 where id = ${id}`;
  await sql`delete from login_fail where phone = (select phone from users where id = ${id})`;
  revalidatePath('/admin');
}

export async function moveUser(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('user_id'));
  const gid = Number(fd.get('group_id')) || null;
  const sql = await db();
  await sql`update users set group_id = ${gid} where id = ${id} and role = 'participant'`;
  revalidatePath('/admin');
}

export async function deleteUser(fd: FormData) {
  const me = await requireTrainer();
  const id = Number(fd.get('user_id'));
  if (id === me.id) return;
  const sql = await db();
  await sql`delete from users where id = ${id}`;
  revalidatePath('/admin');
}

export async function resetAttempt(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('user_id'));
  const kind = String(fd.get('kind'));
  const sql = await db();
  await sql`delete from attempts where user_id = ${id} and kind = ${kind}`;
  revalidatePath('/admin');
}

// ---------- Тренер: интерактив ----------

export async function startActivity(fd: FormData) {
  await requireTrainer();
  const gid = Number(fd.get('group_id'));
  const aid = Number(fd.get('activity_id'));
  const run = crypto.randomBytes(8).toString('hex');
  const sql = await db();
  await sql`insert into live(group_id, activity_id, run_id, revealed, updated_at) values (${gid}, ${aid}, ${run}, false, now())
    on conflict (group_id) do update set activity_id = ${aid}, run_id = ${run}, revealed = false, updated_at = now()`;
  await sql`insert into runs(run_id, group_id, activity_id) values (${run}, ${gid}, ${aid}) on conflict do nothing`;
  revalidatePath(`/admin/group/${gid}/live`);
}

export async function revealActivity(fd: FormData) {
  await requireTrainer();
  const gid = Number(fd.get('group_id'));
  const sql = await db();
  await sql`update live set revealed = true, updated_at = now() where group_id = ${gid}`;
  revalidatePath(`/admin/group/${gid}/live`);
}

export async function stopActivity(fd: FormData) {
  await requireTrainer();
  const gid = Number(fd.get('group_id'));
  const sql = await db();
  await sql`update live set activity_id = null, run_id = null, revealed = false, updated_at = now() where group_id = ${gid}`;
  revalidatePath(`/admin/group/${gid}/live`);
}

export async function saveActivity(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('id') || 0);
  const module = Number(fd.get('module')) === 2 ? 2 : 1;
  const type = String(fd.get('type'));
  if (!['myth', 'quiz', 'poll', 'open'].includes(type)) return;
  const title = str(fd, 'title', 120) || 'Вопрос';
  const prompt = str(fd, 'prompt', 1000);
  if (!prompt) return;
  let options = String(fd.get('options') ?? '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8);
  if (type === 'myth') options = ['Миф', 'Факт'];
  if (type === 'open') options = [];
  const c = String(fd.get('correct') ?? '').trim();
  let correct: number | null = c === '' ? null : Number(c) - 1;
  if (type === 'poll' || type === 'open' || correct === null || isNaN(correct) || correct < 0 || correct >= options.length) correct = null;
  const explanation = str(fd, 'explanation', 1500) || null;
  const sql = await db();
  if (id) {
    await sql`update activities set module = ${module}, type = ${type}, title = ${title}, prompt = ${prompt},
      options = ${sql.json(options)}, correct = ${correct}, explanation = ${explanation} where id = ${id}`;
  } else {
    const [{ s }] = await sql`select coalesce(max(sort), 0) + 1 as s from activities`;
    await sql`insert into activities(module, type, title, prompt, options, correct, explanation, sort)
      values (${module}, ${type}, ${title}, ${prompt}, ${sql.json(options)}, ${correct}, ${explanation}, ${s})`;
  }
  revalidatePath('/admin/content');
}

export async function deleteActivity(fd: FormData) {
  await requireTrainer();
  const sql = await db();
  await sql`delete from activities where id = ${Number(fd.get('id'))}`;
  revalidatePath('/admin/content');
}

export async function saveMaterial(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('id') || 0);
  const module = Number(fd.get('module')) === 2 ? 2 : 1;
  const title = str(fd, 'title', 160);
  const body = str(fd, 'body', 20000) || null;
  let url = str(fd, 'url', 500) || null;
  if (url && !/^https?:\/\//.test(url)) url = null;
  if (!title) return;
  const sql = await db();
  if (id) {
    await sql`update materials set module = ${module}, title = ${title}, body = ${body}, url = ${url} where id = ${id}`;
  } else {
    const [{ s }] = await sql`select coalesce(max(sort), 0) + 1 as s from materials`;
    await sql`insert into materials(module, title, body, url, sort) values (${module}, ${title}, ${body}, ${url}, ${s})`;
  }
  revalidatePath('/admin/content');
}

export async function deleteMaterial(fd: FormData) {
  await requireTrainer();
  const sql = await db();
  await sql`delete from materials where id = ${Number(fd.get('id'))}`;
  revalidatePath('/admin/content');
}

export async function whoami() {
  return currentUser();
}

// ---------- Задания рабочей тетради ----------

export async function submitTask(fd: FormData) {
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g) redirect('/me');
  const taskId = Number(fd.get('task_id'));
  const answer = str(fd, 'answer', 8000);
  if (!answer) redirect(`/tasks?err=empty#t${taskId}`);
  const sql = await db();
  const t = (await sql`select id from tasks where id = ${taskId} and module = ${g.module} and open`)[0];
  if (!t) redirect('/tasks');
  // После проверки ответ не меняется, чтобы баллы соответствовали тексту.
  await sql`insert into submissions(task_id, user_id, answer) values (${taskId}, ${u.id}, ${answer})
    on conflict (task_id, user_id) do update set answer = excluded.answer, updated_at = now()
    where submissions.points is null`;
  redirect(`/tasks?ok=${taskId}#t${taskId}`);
}

export async function reviewSubmission(fd: FormData) {
  const me = await requireTrainer();
  const id = Number(fd.get('submission_id'));
  const sql = await db();
  const row = (await sql`select s.id, t.max_points from submissions s join tasks t on t.id = s.task_id where s.id = ${id}`)[0];
  if (!row) return;
  const raw = String(fd.get('points') ?? '').trim();
  const pts = raw === '' ? null : Math.max(0, Math.min(row.max_points, Math.round(Number(raw))));
  const comment = str(fd, 'comment', 1000) || null;
  await sql`update submissions set points = ${pts}, comment = ${comment}, reviewed_by = ${me.id},
    reviewed_at = ${pts === null ? null : new Date()} where id = ${id}`;
  revalidatePath('/admin');
}

export async function saveTask(fd: FormData) {
  await requireTrainer();
  const id = Number(fd.get('id') || 0);
  const module = Number(fd.get('module')) === 2 ? 2 : 1;
  const title = str(fd, 'title', 160);
  const instructions = str(fd, 'instructions', 8000);
  const max = Math.max(1, Math.min(100, Number(fd.get('max_points')) || 10));
  if (!title || !instructions) return;
  const sql = await db();
  if (id) {
    await sql`update tasks set module = ${module}, title = ${title}, instructions = ${instructions}, max_points = ${max} where id = ${id}`;
  } else {
    const [{ s }] = await sql`select coalesce(max(sort), 0) + 1 as s from tasks`;
    await sql`insert into tasks(module, title, instructions, max_points, sort) values (${module}, ${title}, ${instructions}, ${max}, ${s})`;
  }
  revalidatePath('/admin/content');
}

export async function toggleTask(fd: FormData) {
  await requireTrainer();
  const sql = await db();
  await sql`update tasks set open = not open where id = ${Number(fd.get('id'))}`;
  revalidatePath('/admin');
}

export async function deleteTask(fd: FormData) {
  await requireTrainer();
  const sql = await db();
  await sql`delete from tasks where id = ${Number(fd.get('id'))}`;
  revalidatePath('/admin/content');
}

// ---------- Бонусы от тренера ----------

export async function awardPoints(fd: FormData) {
  const me = await requireTrainer();
  const pts = Math.max(-50, Math.min(50, Math.round(Number(fd.get('points')) || 0)));
  const reason = str(fd, 'reason', 200) || 'Активное участие';
  if (!pts) return;
  const sql = await db();
  const userId = Number(fd.get('user_id') || 0);
  const groupId = Number(fd.get('group_id') || 0);
  if (userId) {
    await sql`insert into awards(user_id, points, reason, by_user) values (${userId}, ${pts}, ${reason}, ${me.id})`;
  } else if (groupId) {
    await sql`insert into awards(user_id, points, reason, by_user)
      select id, ${pts}, ${reason}, ${me.id} from users where group_id = ${groupId} and role = 'participant'`;
  }
  revalidatePath('/admin');
}

export async function deleteAward(fd: FormData) {
  await requireTrainer();
  const sql = await db();
  await sql`delete from awards where id = ${Number(fd.get('id'))}`;
  revalidatePath('/admin');
}

// ---------- Вопросы спикеру (модерация) ----------

export async function moderateQuestion(fd: FormData) {
  const me = await requireTrainer();
  const id = Number(fd.get('id'));
  const op = String(fd.get('op'));
  const sql = await db();
  if (op === 'answered') await sql`update questions set answered = not answered where id = ${id}`;
  if (op === 'hide') await sql`update questions set hidden = not hidden where id = ${id}`;
  if (op === 'star') {
    const q = (await sql`update questions set starred = true where id = ${id} and not starred returning user_id`)[0];
    if (q) await sql`insert into awards(user_id, points, reason, by_user) values (${q.user_id}, 5, 'Лучший вопрос спикеру', ${me.id})`;
  }
  revalidatePath('/admin');
}
