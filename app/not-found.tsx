import Link from 'next/link';
export default function NotFound() {
  return <main className="wrap narrow"><div className="card"><h1>Страница не найдена</h1><p><Link href="/">На главную</Link></p></div></main>;
}
