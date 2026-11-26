import { EVENT } from '@/lib/content';

// Место под логотип центра. Пока файл логотипа не задан, показываем название центра.
export function CenterMark({ light = false }: { light?: boolean }) {
  if (EVENT.logo) {
    return (
      <span className={`center-brand${light ? ' light' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="center-logo" src={EVENT.logo} alt="" width={56} height={56} />
        <span><b>Академия {EVENT.organizer}</b><small>центр ментального здоровья</small></span>
      </span>
    );
  }
  return (
    <span className={`center-mark${light ? ' light' : ''}`} aria-label={`Центр ${EVENT.organizer}`}>
      <span className="cm-name">{EVENT.organizer}</span>
      <span className="cm-sub">центр</span>
    </span>
  );
}

// Иллюстрация: протокол наблюдения с двумя доменами критериев DSM-5-TR.
export function ProtocolArt() {
  const rowsA = ['Взаимность в общении', 'Невербальная коммуникация', 'Отношения со сверстниками'];
  const rowsB = ['Стереотипии', 'Приверженность рутине', 'Узкие интересы', 'Сенсорные особенности'];
  const checkedA = [true, true, true];
  const checkedB = [true, false, true, true];
  return (
    <svg className="protocol-art" viewBox="0 0 360 440" role="img" aria-label="Схема протокола наблюдения: домены A и B">
      <defs>
        <filter id="sh" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#06302c" floodOpacity=".35" />
        </filter>
      </defs>
      {/* лист под листом */}
      <rect x="34" y="26" width="300" height="396" rx="10" fill="#d5eadf" transform="rotate(4 184 224)" />
      <g filter="url(#sh)">
        <rect x="24" y="18" width="300" height="400" rx="10" fill="#fff" />
      </g>
      {/* шапка */}
      <rect x="24" y="18" width="300" height="56" rx="10" fill="#edf6f1" />
      <rect x="24" y="64" width="300" height="10" fill="#edf6f1" />
      <text x="44" y="44" fontSize="13" fontWeight="700" fill="#073f30">Протокол наблюдения</text>
      <text x="44" y="62" fontSize="10.5" fill="#5b6b66">Ребёнок 4 г. 2 мес. · сессия 1</text>
      <circle cx="296" cy="46" r="13" fill="none" stroke="#0c7053" strokeWidth="2" />
      <path d="M290 46l4 4 8-8" fill="none" stroke="#0c7053" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      {/* домен A */}
      <text x="44" y="102" fontSize="11.5" fontWeight="700" fill="#15201d">A. Социальная коммуникация</text>
      <text x="304" y="102" fontSize="10.5" fontWeight="700" fill="#0c7053" textAnchor="end">3 из 3</text>
      {rowsA.map((t, i) => (
        <g key={t} transform={`translate(44 ${116 + i * 26})`}>
          <rect width="14" height="14" rx="3" fill={checkedA[i] ? '#0c7053' : '#fff'} stroke="#0c7053" strokeWidth="1.5" />
          {checkedA[i] && <path d="M3.5 7.5l2.5 2.5 4.5-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          <text x="24" y="11" fontSize="11" fill="#2b3a36">{t}</text>
        </g>
      ))}

      <line x1="44" y1="206" x2="304" y2="206" stroke="#e3ebe8" />

      {/* домен B */}
      <text x="44" y="230" fontSize="11.5" fontWeight="700" fill="#15201d">B. Повторяющееся поведение</text>
      <text x="304" y="230" fontSize="10.5" fontWeight="700" fill="#0c7053" textAnchor="end">3 из 4</text>
      {rowsB.map((t, i) => (
        <g key={t} transform={`translate(44 ${244 + i * 26})`}>
          <rect width="14" height="14" rx="3" fill={checkedB[i] ? '#0c7053' : '#fff'} stroke="#0c7053" strokeWidth="1.5" />
          {checkedB[i] && <path d="M3.5 7.5l2.5 2.5 4.5-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          <text x="24" y="11" fontSize="11" fill={checkedB[i] ? '#2b3a36' : '#8a9a95'}>{t}</text>
        </g>
      ))}

      {/* шкала уровня поддержки */}
      <text x="44" y="366" fontSize="10.5" fill="#5b6b66">Уровень поддержки</text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={44 + i * 88} y="376" width="80" height="10" rx="5" fill={i === 0 ? '#f5952d' : '#eef2f1'} />
      ))}
      <text x="44" y="404" fontSize="10" fill="#8a9a95">1</text>
      <text x="132" y="404" fontSize="10" fill="#8a9a95">2</text>
      <text x="220" y="404" fontSize="10" fill="#8a9a95">3</text>
    </svg>
  );
}
