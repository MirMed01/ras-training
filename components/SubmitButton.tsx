'use client';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ label, pendingLabel, className = 'btn block' }: { label: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? (pendingLabel ?? '…') : label}</button>;
}
