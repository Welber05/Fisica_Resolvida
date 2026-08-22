import QuestionsClient from './questions-client';
import { requirePageUser, safeUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { user } = await requirePageUser('/');
  return <QuestionsClient currentUser={safeUser(user)} />;
}
