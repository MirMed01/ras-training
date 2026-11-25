import { requireUser } from '@/lib/auth';
import { LiveClient } from '@/components/Live';

export default async function LivePage() {
  await requireUser();
  return (
    <main className="wrap narrow">
      <LiveClient />
    </main>
  );
}
