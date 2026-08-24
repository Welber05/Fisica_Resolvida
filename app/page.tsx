import QuestionsClient from './questions-client';
import { listTeacherSchools, requirePageUser, safeUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { user } = await requirePageUser('/');
  const schools = ['professor', 'manager', 'admin'].includes(user.role) ? await listTeacherSchools(user.id) : [];
  return <QuestionsClient currentUser={safeUser(user)} teacherSchools={schools} />;
}
