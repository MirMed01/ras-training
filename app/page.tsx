import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { EVENT, MODULES, SEED_MATERIALS } from '@/lib/content';
import { CenterMark, ProtocolArt } from '@/components/Brand';

// Программа дня берётся из того же текста, что и материал «Программа дня».
function program(module: number) {
  const body = SEED_MATERIALS.find((m) => m.module === module && m.title.startsWith('Программа'))?.body ?? '';
  return body.split('\n').map((l) => {
    const m = l.match(/^(\d{1,2}:\d{2})–(\d{1,2}:\d{2})\s+(.*)$/);
    if (!m) return null;
    const who = m[3].match(/\(([^)]+)\)\s*$/);
    const title = who ? m[3].slice(0, who.index).trim() : m[3];
    const pause = /брейк|Обед/i.test(title);
    return { from: m[1], to: m[2], title, who: who?.[1] ?? '', pause };
  }).filter((x): x is NonNullable<typeof x> => !!x);
}

const SPEAKERS = [
  { name: 'Мирсафо Миршарофов', role: 'Врач-психиатр', photo: '/speaker-mirsharofov.jpg', part: 'Блоки 1 и 3: история понятия, инструменты оценки, дифференциальная диагностика' },
  { name: 'Мадина Атласова', role: 'Врач-психиатр', photo: '/speaker-atlasova.jpg', part: 'Блок 2: критерии DSM-5-TR и МКБ-11, уровни поддержки, маскинг' },
];

export default async function Home() {
  const u = await currentUser();
  if (u) redirect(u.role === 'trainer' ? '/admin' : '/me');
  const day = program(1);
  const m1 = MODULES[1];

  return (
    <main className="lp">
      <section className="lp-hero">
        <div className="lp-hero-in">
          <div className="lp-hero-text">
            <CenterMark light />
            <h1>{EVENT.title}</h1>
            <p className="lp-lead">
              Двухмодульный тренинг для врачей, психологов и педагогов: критерии DSM-5-TR и МКБ-11,
              инструменты оценки и разбор клинических случаев.
            </p>
            <p className="lp-when">
              <strong>{m1.date}</strong>, {EVENT.city}, 10:00–15:00
            </p>
            <div className="lp-cta">
              <Link className="btn lp-btn-main" href="/join">Зарегистрироваться</Link>
              <Link className="btn lp-btn-alt" href="/login">Войти в кабинет</Link>
            </div>
            <p className="lp-hint">В зале отсканируйте QR-код на экране, и группа подставится сама.</p>
          </div>
          <div className="lp-hero-art" aria-hidden="false"><ProtocolArt /></div>
        </div>
      </section>

      <section className="lp-sec">
        <div className="lp-in">
          <h2>Что вы будете делать на платформе</h2>
          <div className="lp-feats">
            <div><b>Входной и итоговый тест</b><span>Утром фиксируете исходный уровень, вечером видите свой прирост по каждому вопросу.</span></div>
            <div><b>«Миф или факт» и кейсы</b><span>Голосуете с телефона, результаты группы сразу появляются на экране в зале.</span></div>
            <div><b>Рабочая тетрадь</b><span>Сдаёте задания по ходу дня, тренер проверяет их и ставит баллы.</span></div>
            <div><b>Вопросы спикеру</b><span>Задаёте вопрос в любой момент и поддерживаете вопросы коллег.</span></div>
            <div><b>Материалы</b><span>Шпаргалки по критериям и инструментам остаются в кабинете после тренинга.</span></div>
            <div><b>Сертификат</b><span>Именной сертификат открывается после итогового теста и анкеты.</span></div>
          </div>
        </div>
      </section>

      <section className="lp-sec lp-alt">
        <div className="lp-in lp-two">
          <div>
            <h2>Программа модуля 1</h2>
            <p className="muted">{m1.date}. {m1.hours} академических часов.</p>
            <ol className="lp-day">
              {day.map((d) => (
                <li key={d.from} className={d.pause ? 'pause' : ''}>
                  <time>{d.from}</time>
                  <div><span>{d.title}</span>{d.who && <small>{d.who}</small>}</div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lp-mods">
            {Object.entries(MODULES).map(([k, m]) => (
              <article key={k} className={`lp-mod${k === '1' ? ' now' : ''}`}>
                <div className="lp-mod-date">{m.date}</div>
                <h3>{m.name}</h3>
                <ul>{m.topics.map((t) => <li key={t}>{t}</li>)}</ul>
                {k === '2' && <p className="small muted">Только для медицинских работников.</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec">
        <div className="lp-in">
          <h2>Кто ведёт тренинг</h2>
          <div className="lp-speakers">
            {SPEAKERS.map((s) => (
              <figure key={s.name} className="lp-speaker">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photo} alt={s.name} width={186} height={293} loading="lazy" />
                <figcaption><b>{s.name}</b><span>{s.role}</span><small>{s.part}</small></figcaption>
              </figure>
            ))}
          </div>
          <p className="muted small lp-org">Организатор тренинга: {EVENT.coordinator}.</p>
        </div>
      </section>

      <section className="lp-sec lp-alt">
        <div className="lp-in lp-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lp-team" src="/team.jpg" alt={`Команда центра ${EVENT.organizer}`} width={640} height={640} loading="lazy" />
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mhc.jpg" alt={`${EVENT.organizer} Mental Health Center`} width={96} height={96} className="lp-mhc" />
            <h2>Центр ментального здоровья {EVENT.organizer}</h2>
            <p>Тренинг проводит Академия {EVENT.organizer}, образовательное направление центра.
              Спикеры тренинга — врачи-психиатры.</p>
            <p className="muted">После тренинга материалы, результаты тестов и сертификат остаются в вашем кабинете.</p>
          </div>
        </div>
      </section>

      <section className="lp-end">
        <div className="lp-in">
          <h2>Регистрация занимает минуту</h2>
          <p>Понадобятся имя, телефон и код группы, который назовёт тренер.</p>
          <Link className="btn lp-btn-main" href="/join">Зарегистрироваться</Link>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-in">
          <CenterMark />
          <span>Тренинг центра {EVENT.organizer}, {EVENT.city}, 2026</span>
          <Link href="/privacy">Обработка персональных данных</Link>
        </div>
      </footer>
    </main>
  );
}
