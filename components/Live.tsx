'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Act = { id: number; type: 'myth' | 'quiz' | 'poll' | 'open'; title: string; prompt: string; options: string[] };
type Res = { counts: number[]; texts: string[]; total: number };
type LiveData = {
  state: 'live' | 'idle' | 'nogroup'; runId?: string; revealed?: boolean; activity?: Act; members?: number;
  correct?: number | null; explanation?: string | null; board?: { name: string; xp: number; level: string }[]; mine?: { choice: number | null; text: string | null } | null; results?: Res | null;
};

const TYPE_LABEL: Record<string, string> = { myth: 'Миф или факт', quiz: 'Кейс', poll: 'Опрос', open: 'Открытый вопрос' };

function usePoll(url: string, ms: number) {
  const [data, setData] = useState<LiveData | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setData(await r.json()); setErr(false);
    } catch { setErr(true); }
  }, [url]);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, ms);
    const v = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', v);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [load, ms]);
  return { data, err, reload: load };
}

export function Results({ a, res, correct }: { a: Act; res: Res; correct: number | null | undefined }) {
  if (a.type === 'open') {
    return <div className="texts">{res.texts.slice(-60).map((t, i) => <span key={i}>{t}</span>)}</div>;
  }
  const max = Math.max(1, res.total);
  return (
    <div>
      {a.options.map((o, i) => {
        const c = res.counts[i] ?? 0;
        const p = Math.round((c / max) * 100);
        return (
          <div className={'res' + (correct === i ? ' correct' : '')} key={i}>
            <div className="rl"><span>{correct === i ? '✓ ' : ''}{o}</span><span>{p}% · {c}</span></div>
            <div className="bar"><span style={{ width: p + '%' }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export function LiveClient() {
  const { data, err, reload } = usePoll('/api/live', 2000);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const lastRun = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (data?.runId !== lastRun.current) { lastRun.current = data?.runId; setText(''); setMsg(''); }
  }, [data?.runId]);

  async function send(payload: { choice?: number; text?: string }) {
    if (!data?.runId) return;
    setSending(true); setMsg('');
    try {
      const r = await fetch('/api/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId: data.runId, ...payload }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || 'Не получилось отправить');
      else if (payload.text) setText('');
    } catch { setMsg('Нет связи, попробуйте ещё раз'); }
    setSending(false);
    reload();
  }

  if (!data) return <div className="card muted">Подключаемся…</div>;
  if (data.state === 'nogroup') return <div className="card">Вы пока не в группе. Подойдите к тренеру.</div>;
  if (data.state === 'idle' || !data.activity) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <h2>Ждём следующий вопрос</h2>
        <p className="muted">Держите эту страницу открытой: вопрос появится сам, когда тренер его запустит.</p>
        {err && <p className="err">Связь прерывается, страница переподключится сама.</p>}
      </div>
    );
  }
  const a = data.activity;
  const mine = data.mine;
  const locked = !!data.revealed;
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="badge">{TYPE_LABEL[a.type]}</span>
        {mine && !locked && <span className="badge ok">ответ принят, можно изменить</span>}
      </div>
      {a.title !== TYPE_LABEL[a.type] && <div className="muted small">{a.title}</div>}
      <h2 style={{ fontSize: '1.3rem' }}>{a.prompt}</h2>
      {a.type === 'open' ? (
        <>
          {!locked && (
            <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send({ text }); }}>
              <input type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="Ваш ответ" />
              <button className="btn block" style={{ marginTop: 10 }} disabled={sending || !text.trim()}>{mine ? 'Заменить ответ' : 'Отправить'}</button>
            </form>
          )}
          {mine?.text && <p className="small muted" style={{ marginTop: 8 }}>Ваш ответ: {mine.text}</p>}
        </>
      ) : (
        <div className={'vote' + (a.type === 'myth' ? ' mf' : '')}>
          {a.options.map((o, i) => {
            const isSel = mine?.choice === i;
            let style: React.CSSProperties | undefined;
            if (locked && data.correct === i) style = { borderColor: 'var(--ok)', background: 'var(--ok-soft)' };
            else if (locked && isSel && data.correct !== null && data.correct !== undefined) style = { borderColor: 'var(--bad)', background: 'var(--bad-soft)' };
            return (
              <button key={i} className={isSel ? 'sel' : ''} style={style} disabled={sending || locked} onClick={() => send({ choice: i })}>
                {locked && data.correct === i ? '✓ ' : ''}{o}
              </button>
            );
          })}
        </div>
      )}
      {msg && <div className="err">{msg}</div>}
      {locked && data.correct !== null && data.correct !== undefined && mine && mine.choice !== null && (
        <div className={mine.choice === data.correct ? 'okmsg' : 'err'}>{mine.choice === data.correct ? 'Верно!' : 'Не совсем.'}</div>
      )}
      {data.explanation && <div className="okmsg" style={{ background: 'var(--brand-soft)', color: 'var(--ink)' }}>{data.explanation}</div>}
      {data.results && (
        <div style={{ marginTop: 16 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>Ответы группы ({data.results.total})</div>
          <Results a={a} res={data.results} correct={locked ? data.correct : null} />
        </div>
      )}
    </div>
  );
}

export function ScreenClient({ groupId, qr, joinUrl, groupName }: { groupId: number; qr: string; joinUrl: string; groupName: string }) {
  const { data } = usePoll(`/api/live/screen?g=${groupId}`, 1500);
  const a = data?.activity;
  const showBars = a && (data?.revealed || a.type === 'poll' || a.type === 'open');
  return (
    <div className="screen">
      <div className="head">
        <div style={{ flex: 1 }}>
          {a ? (<>
            <div className="kicker">{TYPE_LABEL[a.type]}{a.title !== TYPE_LABEL[a.type] ? ' · ' + a.title : ''}</div>
            <h1>{a.prompt}</h1>
          </>) : (<>
            <div className="kicker">{groupName}</div>
            <h1>Подключайтесь с телефона</h1>
            <p style={{ fontSize: '1.5rem', opacity: .8 }}>Отсканируйте QR-код, зарегистрируйтесь и откройте «Интерактив». Вопросы появятся автоматически.</p>
          </>)}
        </div>
        <div className="qrbox">
          <div dangerouslySetInnerHTML={{ __html: qr }} />
          <div>{joinUrl.replace(/^https?:\/\//, '')}</div>
        </div>
      </div>
      {a && (
        <div style={{ marginTop: 28, maxWidth: 1200 }}>
          {showBars && data?.results ? (
            <Results a={a} res={data.results} correct={data.revealed ? data.correct : null} />
          ) : (
            <div>{a.options.map((o, i) => <div key={i} className="res"><div className="rl"><span>{String.fromCharCode(65 + i)}. {o}</span></div></div>)}</div>
          )}
          {data?.revealed && data.explanation && <div className="expl">{data.explanation}</div>}
        </div>
      )}
      {!a && data?.board && data.board.length > 0 && (
        <div style={{ marginTop: 24, maxWidth: 900 }}>
          <div className="kicker">Рейтинг группы</div>
          <ol className="board">{data.board.map((b, i) => <li key={i}><span>{b.name}</span><span className="muted">{b.level}</span><b>{b.xp}</b></li>)}</ol>
        </div>
      )}
      <div className="count">
        {a ? <>Ответили: <b>{data?.results?.total ?? 0}</b> из {data?.members ?? 0}</> : <>Зарегистрировано: <b>{data?.members ?? 0}</b></>}
      </div>
    </div>
  );
}

export function LiveMonitor({ groupId }: { groupId: number }) {
  const { data } = usePoll(`/api/live/screen?g=${groupId}`, 2000);
  if (!data) return null;
  if (!data.activity) return <p className="muted small">Сейчас ничего не запущено. Участников в группе: {data.members ?? 0}.</p>;
  return (
    <div>
      <p className="small">Ответили: <b>{data.results?.total ?? 0}</b> из {data.members ?? 0}{data.revealed ? ' · ответ показан' : ''}</p>
      {data.results && <Results a={data.activity} res={data.results} correct={data.correct} />}
    </div>
  );
}
