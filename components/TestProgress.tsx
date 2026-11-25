'use client';
import { useEffect, useRef, useState } from 'react';

// Счётчик «отвечено N из M» и автосохранение ответов в браузере:
// если телефон перезагрузит страницу, выбранные ответы вернутся.
export function TestProgress({ storageKey, total }: { storageKey: string; total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(0);
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const groups = () => Array.from(new Set(Array.from(form.querySelectorAll<HTMLInputElement>('input[type=radio]')).map((i) => i.name)));
    const count = () => setDone(groups().filter((n) => form.querySelector(`input[name="${n}"]:checked`)).length);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, string>;
      Object.entries(saved).forEach(([n, v]) => {
        const el = form.querySelector<HTMLInputElement>(`input[name="${n}"][value="${v}"]`);
        if (el) el.checked = true;
      });
    } catch {}
    count();
    const onChange = () => {
      const data: Record<string, string> = {};
      form.querySelectorAll<HTMLInputElement>('input[type=radio]:checked').forEach((i) => { data[i.name] = i.value; });
      try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
      count();
    };
    const onSubmit = () => { try { localStorage.removeItem(storageKey); } catch {} };
    form.addEventListener('change', onChange);
    form.addEventListener('submit', onSubmit);
    return () => { form.removeEventListener('change', onChange); form.removeEventListener('submit', onSubmit); };
  }, [storageKey]);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div ref={ref} className="progress-sticky">
      <div className="row between small"><span>Отвечено {done} из {total}</span><span className="muted">ответы сохраняются</span></div>
      <div className="bar"><span style={{ width: pct + '%' }} /></div>
    </div>
  );
}
