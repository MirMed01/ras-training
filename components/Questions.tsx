'use client';
import { useCallback, useEffect, useState } from 'react';

type Q = { id: number; text: string; votes: number; voted: boolean; answered: boolean; hidden: boolean; starred: boolean; mine: boolean; author: string };

export function useQuestions(url: string, ms = 4000) {
  const [qs, setQs] = useState<Q[]>([]);
  const load = useCallback(async () => {
    try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok) setQs((await r.json()).questions); } catch {}
  }, [url]);
  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load(); }, ms); return () => clearInterval(t); }, [load, ms]);
  return { qs, load };
}

export function QuestionsClient() {
  const { qs, load } = useQuestions('/api/questions');
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(true);
  const [msg, setMsg] = useState('');
  async function post(body: object) {
    const r = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error || 'Ошибка'); else setMsg('');
    load();
    return r.ok;
  }
  return (
    <>
      <form className="card" onSubmit={async (e) => { e.preventDefault(); if (await post({ text, anonymous: anon })) setText(''); }}>
        <label htmlFor="qtext" style={{ marginTop: 0 }}>Ваш вопрос спикеру</label>
        <textarea id="qtext" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Например: как отличить РАС от селективного мутизма у 4-летнего ребёнка?" />
        <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /><span className="small">Задать анонимно (тренер видит автора, чтобы начислить баллы за лучший вопрос)</span></label>
        {msg && <div className="err">{msg}</div>}
        <button className="btn block" style={{ marginTop: 10 }} disabled={text.trim().length < 3}>Отправить</button>
      </form>
      <p className="small muted">Поддержите вопросы, которые важны и вам: спикер ответит сначала на самые популярные.</p>
      {qs.map((q) => (
        <div key={q.id} className="card qa" style={{ opacity: q.answered ? .6 : 1 }}>
          <button className={'vote-btn' + (q.voted ? ' on' : '')} onClick={() => post({ vote: q.id })} aria-label="Поддержать">▲<b>{q.votes}</b></button>
          <div>
            <div>{q.text}</div>
            <div className="small muted">{q.author}{q.mine ? ' · ваш вопрос' : ''}{q.answered ? ' · ✓ отвечен' : ''}{q.starred ? ' · ★ лучший вопрос' : ''}</div>
          </div>
        </div>
      ))}
      {qs.length === 0 && <p className="muted">Вопросов пока нет. Будьте первым!</p>}
    </>
  );
}

export function QuestionsScreen({ groupId }: { groupId: number }) {
  const { qs } = useQuestions(`/api/questions?g=${groupId}`, 3000);
  const open = qs.filter((q) => !q.hidden && !q.answered).slice(0, 7);
  return (
    <div className="screen">
      <div className="kicker">Вопросы из зала</div>
      <h1>Задайте вопрос с телефона: раздел «Вопросы»</h1>
      <div style={{ marginTop: 20 }}>
        {open.map((q) => (
          <div key={q.id} className="qa-screen"><span className="v">▲ {q.votes}</span><span>{q.text}</span></div>
        ))}
        {open.length === 0 && <p style={{ fontSize: '1.5rem', opacity: .7 }}>Пока вопросов нет.</p>}
      </div>
    </div>
  );
}
