import { redirect } from 'next/navigation';
import { requireUser, userGroup } from '@/lib/auth';
import { certNo, myAttempts } from '@/lib/data';
import { EVENT, MODULES } from '@/lib/content';
import { PrintButton } from '@/components/PrintButton';
import { groupScores } from '@/lib/score';

export default async function Certificate() {
  const u = await requireUser();
  const g = await userGroup(u);
  if (!g) redirect('/me');
  const { post } = await myAttempts(u, g.module);
  if (!g.cert_open || !post) redirect('/me');
  const m = MODULES[g.module];
  const me = (await groupScores(g)).find((s) => s.userId === u.id);
  return (
    <main className="wrap">
      <div className="noprint row between" style={{ marginBottom: 12 }}>
        <p className="muted small" style={{ margin: 0 }}>Нажмите «Сохранить PDF» и выберите «Сохранить как PDF» (на телефоне: «Поделиться» → «Печать» → «Сохранить»).</p>
        <PrintButton />
      </div>
      <div className="cert">
        <div className="tx muted">{EVENT.organizer} · {EVENT.city}</div>
        <div className="ct" style={{ marginTop: '3%' }}>Сертификат</div>
        <div className="tx">подтверждает, что</div>
        <div className="nm">{u.full_name}</div>
        <div className="tx">прошёл(ла) обучение на тренинге</div>
        <div className="tx" style={{ fontWeight: 700, fontSize: 'clamp(1rem,2.4vw,1.6rem)', margin: '1% 0' }}>«{EVENT.title}»</div>
        <div className="tx">{m.name}</div>
        <div className="tx muted">{m.date}, {m.hours} часов</div>
        {me?.distinction && <div className="tx" style={{ color: '#a16207', fontWeight: 700, letterSpacing: 2, marginTop: '1%' }}>С ОТЛИЧИЕМ</div>}
        <div className="sig">
          {EVENT.speakers.map((s) => <div key={s}>{s}<br /><span className="muted">спикер</span></div>)}
          <div>{EVENT.coordinator}<br /><span className="muted">организатор</span></div>
        </div>
        <div className="no">№ {certNo(u, g)}</div>
      </div>
    </main>
  );
}
