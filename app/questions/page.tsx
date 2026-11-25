import { requireUser } from '@/lib/auth';
import { QuestionsClient } from '@/components/Questions';
export default async function QuestionsPage() {
  await requireUser();
  return <main className="wrap narrow"><h1>Вопросы спикеру</h1><QuestionsClient /></main>;
}
