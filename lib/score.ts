// Система баллов и показателей участника.
// Принципы: баллы даются за учебные действия, а не только за «клики»; утренний тест
// не штрафует (баллы за участие), главный вес у итоговых знаний и прироста;
// рейтинг показывает только верх таблицы и позволяет скрыть себя.
import { db, type Group } from './db';
import { TESTS } from './content';

export const RULES = [
  { what: 'Входной тест пройден', pts: '+10', note: 'за участие, результат не важен' },
  { what: 'Итоговый тест', pts: '+5', note: 'за каждый верный ответ' },
  { what: 'Прирост знаний', pts: '+5', note: 'за каждый вопрос, где утром ошиблись, а вечером ответили верно' },
  { what: 'Ответ в интерактиве', pts: '+2', note: 'за каждый вопрос, «Миф или факт», кейс, опрос' },
  { what: 'Верный ответ в «Миф или факт» и кейсах', pts: '+3', note: 'дополнительно' },
  { what: 'Анкета обратной связи', pts: '+10', note: '' },
  { what: 'План действий на неделю', pts: '+5', note: 'поле «Одно действие, которое я применю»' },
];

export const LEVELS = [
  { min: 0, name: 'Слушатель' },
  { min: 25, name: 'Участник' },
  { min: 60, name: 'Практик' },
  { min: 100, name: 'Эксперт' },
  { min: 140, name: 'Мастер диагностики' },
];

export type Badge = { id: string; icon: string; name: string; how: string; got: boolean };

export type PScore = {
  userId: number; fullName: string; display: string; hidden: boolean;
  xp: number; level: string; levelIdx: number; nextMin: number | null; curMin: number;
  rank: number | null;
  pre: number | null; post: number | null; total: number; fixed: number;
  normGain: number | null; // доля «незнания» утром, закрытая к вечеру
  answered: number; launched: number; engagement: number | null;
  gradable: number; correctLive: number; mythCorrect: number; caseCorrect: number;
  confPre: number | null; confPost: number | null;
  feedback: boolean; plan: boolean; distinction: boolean;
  badges: Badge[];
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function shortName(full: string) {
  const p = full.trim().split(/\s+/);
  if (p.length < 2) return p[0] ?? '';
  return `${p[1]} ${p[0][0]}.`;
}

export async function groupScores(g: Group): Promise<PScore[]> {
  const sql = await db();
  const qs = TESTS[g.module] ?? [];
  const [users, atts, resp, launchedRows, fbs] = await Promise.all([
    sql`select id, full_name, hide_board, created_at from users where group_id = ${g.id} and role = 'participant' order by created_at`,
    sql`select a.user_id, a.kind, a.score, a.answers, a.confidence from attempts a join users u on u.id = a.user_id
        where u.group_id = ${g.id} and a.module = ${g.module}`,
    sql`select distinct on (r.user_id, r.activity_id) r.user_id, r.activity_id, r.choice, a.correct, a.type
        from responses r join activities a on a.id = r.activity_id
        where r.group_id = ${g.id} order by r.user_id, r.activity_id, r.created_at desc`,
    sql`select count(distinct activity_id)::int as n from (
          select activity_id from runs where group_id = ${g.id}
          union select activity_id from responses where group_id = ${g.id}) x`,
    sql`select f.user_id, f.apply_text from feedback f join users u on u.id = f.user_id where u.group_id = ${g.id} and f.module = ${g.module}`,
  ]);
  const launched = launchedRows[0]?.n ?? 0;

  const scores: PScore[] = users.map((u) => {
    const pre = atts.find((a) => a.user_id === u.id && a.kind === 'pre');
    const post = atts.find((a) => a.user_id === u.id && a.kind === 'post');
    const mine = resp.filter((r) => r.user_id === u.id);
    const fb = fbs.find((f) => f.user_id === u.id);

    const graded = mine.filter((r) => r.correct !== null && r.correct !== undefined);
    const right = graded.filter((r) => r.choice === r.correct);
    const mythCorrect = right.filter((r) => r.type === 'myth').length;
    const caseCorrect = right.filter((r) => r.type === 'quiz').length;

    let fixed = 0;
    if (pre && post) {
      qs.forEach((q, i) => { if (pre.answers[i] !== q.correct && post.answers[i] === q.correct) fixed++; });
    }
    const preScore: number | null = pre ? pre.score : null;
    const postScore: number | null = post ? post.score : null;
    const normGain = preScore !== null && postScore !== null && qs.length > preScore
      ? Math.max(0, (postScore - preScore) / (qs.length - preScore)) : null;
    const plan = !!(fb?.apply_text && String(fb.apply_text).trim().length >= 5);

    const xp = (pre ? 10 : 0) + (postScore ?? 0) * 5 + fixed * 5
      + mine.length * 2 + right.length * 3 + (fb ? 10 : 0) + (plan ? 5 : 0);

    let levelIdx = 0;
    LEVELS.forEach((l, i) => { if (xp >= l.min) levelIdx = i; });
    const engagement = launched ? Math.min(1, mine.length / launched) : null;
    const confPre = pre?.confidence ? avg((pre.confidence as number[]).filter((v) => v > 0)) : null;
    const confPost = post?.confidence ? avg((post.confidence as number[]).filter((v) => v > 0)) : null;
    const distinction = postScore !== null && qs.length > 0 && postScore / qs.length >= 0.85
      && (engagement === null || engagement >= 0.7);

    const badges: Badge[] = [
      { id: 'start', icon: '🎯', name: 'Старт', how: 'Пройти входной тест', got: !!pre },
      { id: 'voice', icon: '💬', name: 'Голос группы', how: 'Ответить на 5 вопросов интерактива', got: mine.length >= 5 },
      { id: 'myth', icon: '🧠', name: 'Разрушитель мифов', how: 'Верно ответить на 5 «Миф или факт»', got: mythCorrect >= 5 },
      { id: 'clin', icon: '🩺', name: 'Клиницист', how: 'Верно решить 3 кейса', got: caseCorrect >= 3 },
      { id: 'active', icon: '🔥', name: 'Активист', how: 'Ответить на 80% запущенных вопросов', got: launched >= 5 && (engagement ?? 0) >= 0.8 },
      { id: 'growth', icon: '📈', name: 'Рост', how: 'Исправить к вечеру 3 утренние ошибки', got: fixed >= 3 },
      { id: 'top', icon: '🏆', name: 'Отличник', how: 'Итоговый тест без ошибок', got: postScore !== null && postScore === qs.length },
      { id: 'full', icon: '✅', name: 'Полный маршрут', how: 'Входной и итоговый тест, анкета и план действий', got: !!pre && !!post && !!fb && plan },
    ];

    return {
      userId: u.id, fullName: u.full_name, display: shortName(u.full_name), hidden: !!u.hide_board,
      xp, level: LEVELS[levelIdx].name, levelIdx, curMin: LEVELS[levelIdx].min,
      nextMin: LEVELS[levelIdx + 1]?.min ?? null, rank: null,
      pre: preScore, post: postScore, total: qs.length, fixed, normGain,
      answered: mine.length, launched, engagement, gradable: graded.length, correctLive: right.length,
      mythCorrect, caseCorrect, confPre, confPost, feedback: !!fb, plan, distinction, badges,
    };
  });

  // Место в группе: по баллам, при равенстве раньше зарегистрированный выше (стабильный порядок).
  const sorted = [...scores].sort((a, b) => b.xp - a.xp);
  let prevXp = -1; let prevRank = 0;
  sorted.forEach((s, i) => {
    const r = s.xp === prevXp ? prevRank : i + 1;
    s.rank = r; prevXp = s.xp; prevRank = r;
  });
  return scores;
}

export function leaderboard(scores: PScore[], n = 10) {
  return [...scores].filter((s) => !s.hidden && s.xp > 0).sort((a, b) => b.xp - a.xp || (a.rank ?? 0) - (b.rank ?? 0)).slice(0, n);
}

export function groupKpi(scores: PScore[]) {
  const pick = (f: (s: PScore) => number | null) => scores.map(f).filter((v): v is number => v !== null);
  return {
    n: scores.length,
    normGain: avg(pick((s) => s.normGain)),
    engagement: avg(pick((s) => s.engagement)),
    accuracy: avg(pick((s) => (s.gradable ? s.correctLive / s.gradable : null))),
    confPre: avg(pick((s) => s.confPre)),
    confPost: avg(pick((s) => s.confPost)),
    completion: scores.length ? scores.filter((s) => s.badges.find((b) => b.id === 'full')?.got).length / scores.length : null,
    distinction: scores.filter((s) => s.distinction).length,
    avgXp: avg(scores.map((s) => s.xp)),
  };
}
