'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap narrow"><div className="card">
      <h1>Что-то пошло не так</h1>
      <p>Проверьте интернет и попробуйте ещё раз. Если ошибка повторяется, подойдите к тренеру.</p>
      <button className="btn" onClick={() => reset()}>Попробовать снова</button>
    </div></main>
  );
}
