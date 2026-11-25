import { requireUser, userGroup } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function Materials() {
  const u = await requireUser();
  const g = await userGroup(u);
  const sql = await db();
  const rows = u.role === 'trainer' || !g
    ? await sql`select * from materials order by module, sort, id`
    : await sql`select * from materials where module <= ${g.module} order by module desc, sort, id`;
  return (
    <main className="wrap narrow">
      <h1>Материалы</h1>
      {rows.length === 0 && <p className="muted">Материалы появятся здесь.</p>}
      {rows.map((m) => (
        <details className="card" key={m.id} open={rows.length <= 2}>
          <summary><b>{m.title}</b> <span className="badge" style={{ marginLeft: 6 }}>модуль {m.module}</span></summary>
          {m.body && <div style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{m.body}</div>}
          {m.url && <p style={{ marginTop: 12 }}><a className="btn sm" href={m.url} target="_blank" rel="noopener noreferrer">Открыть</a></p>}
        </details>
      ))}
    </main>
  );
}
