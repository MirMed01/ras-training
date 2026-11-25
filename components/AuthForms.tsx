'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login, register, setupFirstTrainer, updateProfile, type FormState } from '@/lib/actions';
import { PROFESSIONS } from '@/lib/content';

function Msg({ s }: { s: FormState }) {
  if (!s) return null;
  if (s.error) return <div className="err" role="alert">{s.error}</div>;
  if (s.ok) return <div className="okmsg">{s.ok}</div>;
  return null;
}

export function RegisterForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action}>
      <Msg s={state} />
      <label htmlFor="full_name">Фамилия и имя (для сертификата)</label>
      <input id="full_name" name="full_name" type="text" autoComplete="name" required placeholder="Каримова Нигора" />
      <label htmlFor="phone">Телефон (будет вашим логином)</label>
      <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+992 90 123 45 67" />
      <label htmlFor="profession">Профессия</label>
      <select id="profession" name="profession" required defaultValue="">
        <option value="" disabled>Выберите</option>
        {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <label htmlFor="workplace">Место работы <span className="muted">(необязательно)</span></label>
      <input id="workplace" name="workplace" type="text" placeholder="Например, центр INSIGHT" />
      <label htmlFor="password">Придумайте пароль (от 6 символов)</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
      <label htmlFor="code">Код группы</label>
      <input id="code" name="code" type="text" required defaultValue={code} autoCapitalize="characters" placeholder="Например, RAS1" />
      <label className="check" style={{ marginTop: 16 }}>
        <input type="checkbox" name="consent" required />
        <span className="small">Согласен(на) на обработку указанных данных организатором тренинга для учёта участия, результатов тестов и выдачи сертификата. <a href="/privacy" target="_blank">Подробнее</a></span>
      </label>
      <button className="btn block" style={{ marginTop: 16 }} disabled={pending}>{pending ? 'Регистрируем…' : 'Зарегистрироваться'}</button>
      <p className="small muted" style={{ marginTop: 12 }}>Уже регистрировались? <Link href="/login">Войти</Link></p>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action}>
      <Msg s={state} />
      <label htmlFor="phone">Телефон</label>
      <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+992 90 123 45 67" />
      <label htmlFor="password">Пароль</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <button className="btn block" style={{ marginTop: 16 }} disabled={pending}>{pending ? 'Входим…' : 'Войти'}</button>
      <p className="small muted" style={{ marginTop: 12 }}>Нет аккаунта? <Link href="/join">Регистрация</Link></p>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState(setupFirstTrainer, undefined);
  return (
    <form action={action}>
      <Msg s={state} />
      <label htmlFor="full_name">Имя тренера</label>
      <input id="full_name" name="full_name" type="text" required />
      <label htmlFor="phone">Телефон (логин)</label>
      <input id="phone" name="phone" type="tel" required />
      <label htmlFor="password">Пароль (от 8 символов)</label>
      <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      <button className="btn block" style={{ marginTop: 16 }} disabled={pending}>Создать аккаунт тренера</button>
    </form>
  );
}

export function ProfileForm({ name, workplace, hideBoard }: { name: string; workplace: string; hideBoard: boolean }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action}>
      <Msg s={state} />
      <label htmlFor="full_name">Фамилия и имя (как в сертификате)</label>
      <input id="full_name" name="full_name" type="text" defaultValue={name} required />
      <label htmlFor="workplace">Место работы</label>
      <input id="workplace" name="workplace" type="text" defaultValue={workplace} />
      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" name="hide_board" defaultChecked={hideBoard} />
        <span className="small">Не показывать меня в рейтинге группы (баллы и значки останутся видны только мне)</span>
      </label>
      <label htmlFor="new_password">Новый пароль <span className="muted">(оставьте пустым, если не меняете)</span></label>
      <input id="new_password" name="new_password" type="password" autoComplete="new-password" />
      <button className="btn sm" style={{ marginTop: 12 }} disabled={pending}>Сохранить</button>
    </form>
  );
}
