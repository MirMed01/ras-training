import Link from 'next/link';
import { requireTrainer } from '@/lib/auth';
import { db, type Activity } from '@/lib/db';
import { deleteActivity, deleteMaterial, saveActivity, saveMaterial } from '@/lib/actions';
import { ConfirmButton } from '@/components/ConfirmButton';

const TYPE: Record<string, string> = { myth: 'Миф или факт', quiz: 'Кейс / вопрос с верным ответом', poll: 'Опрос (без верного ответа)', open: 'Открытый вопрос' };

function ActivityForm({ a }: { a?: Activity }) {
  return (
    <form action={saveActivity}>
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="row">
        <div style={{ flex: 1, minWidth: 160 }}><label>Модуль</label>
          <select name="module" defaultValue={String(a?.module ?? 1)}><option value="1">1</option><option value="2">2</option></select></div>
        <div style={{ flex: 2, minWidth: 200 }}><label>Тип</label>
          <select name="type" defaultValue={a?.type ?? 'myth'}>{Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <label>Заголовок</label><input type="text" name="title" defaultValue={a?.title ?? ''} placeholder="Например, Кейс 5. Ребёнок 6 лет" />
      <label>Вопрос или утверждение</label><textarea name="prompt" required defaultValue={a?.prompt ?? ''} />
      <label>Варианты (каждый с новой строки; для «Миф или факт» и открытого вопроса не нужны)</label>
      <textarea name="options" defaultValue={(a?.options ?? []).join('\n')} />
      <label>Номер верного варианта (для «Миф или факт»: 1 = миф, 2 = факт)</label>
      <input type="text" name="correct" inputMode="numeric" defaultValue={a?.correct !== null && a?.correct !== undefined ? String(a.correct + 1) : ''} />
      <label>Пояснение (показывается после ответа)</label><textarea name="explanation" defaultValue={a?.explanation ?? ''} />
      <button className="btn sm" style={{ marginTop: 12 }}>{a ? 'Сохранить' : 'Добавить'}</button>
    </form>
  );
}

export default async function Content() {
  await requireTrainer();
  const sql = await db();
  const acts = await sql<Activity[]>`select * from activities order by module, sort, id`;
  const mats = await sql`select * from materials order by module, sort, id`;
  return (
    <main className="wrap">
      <p className="small"><Link href="/admin">← Кабинет тренера</Link></p>
      <h1>Интерактив и материалы</h1>
      <details className="card"><summary><b>+ Новый вопрос для интерактива</b></summary><ActivityForm /></details>
      {[1, 2].map((m) => (
        <div key={m}>
          <h2>Модуль {m}</h2>
          {acts.filter((a) => a.module === m).map((a) => (
            <details className="card" key={a.id} style={{ padding: 14 }}>
              <summary><span className="small muted">{TYPE[a.type]} · {a.title}</span><br />{a.prompt}</summary>
              <ActivityForm a={a} />
              <form action={deleteActivity} style={{ marginTop: 8 }}><input type="hidden" name="id" value={a.id} /><ConfirmButton className="btn sm danger" text="Удалить вопрос вместе с ответами?">Удалить</ConfirmButton></form>
            </details>
          ))}
        </div>
      ))}

      <h2 style={{ marginTop: 28 }}>Материалы</h2>
      <details className="card"><summary><b>+ Добавить материал</b></summary>
        <form action={saveMaterial}>
          <label>Модуль</label><select name="module" defaultValue="1"><option value="1">1</option><option value="2">2</option></select>
          <label>Название</label><input type="text" name="title" required />
          <label>Текст</label><textarea name="body" style={{ minHeight: 160 }} />
          <label>Ссылка (необязательно: Google Drive, PDF и т. п.)</label><input type="url" name="url" placeholder="https://" />
          <button className="btn sm" style={{ marginTop: 12 }}>Добавить</button>
        </form>
      </details>
      {mats.map((m) => (
        <details className="card" key={m.id} style={{ padding: 14 }}>
          <summary><span className="badge">модуль {m.module}</span> {m.title}</summary>
          <form action={saveMaterial}>
            <input type="hidden" name="id" value={m.id} />
            <label>Модуль</label><select name="module" defaultValue={String(m.module)}><option value="1">1</option><option value="2">2</option></select>
            <label>Название</label><input type="text" name="title" defaultValue={m.title} required />
            <label>Текст</label><textarea name="body" defaultValue={m.body ?? ''} style={{ minHeight: 200 }} />
            <label>Ссылка</label><input type="url" name="url" defaultValue={m.url ?? ''} />
            <button className="btn sm" style={{ marginTop: 12 }}>Сохранить</button>
          </form>
          <form action={deleteMaterial} style={{ marginTop: 8 }}><input type="hidden" name="id" value={m.id} /><ConfirmButton className="btn sm danger" text="Удалить материал?">Удалить</ConfirmButton></form>
        </details>
      ))}
    </main>
  );
}
