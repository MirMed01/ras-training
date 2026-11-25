'use client';
export function ConfirmButton({ text, className, children }: { text: string; className?: string; children: React.ReactNode }) {
  return <button className={className} onClick={(e) => { if (!confirm(text)) e.preventDefault(); }}>{children}</button>;
}
