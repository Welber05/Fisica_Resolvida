import QuestionsClient from '@/app/questions-client';
import { listQuestionCurations, listTeacherSchools, requirePageUser, safeUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function CollectionPage() {
  const { user } = await requirePageUser('/acervo');
  const schools = ['professor', 'manager', 'admin'].includes(user.role) ? await listTeacherSchools(user.id) : [];
  return <QuestionsClient currentUser={safeUser(user)} teacherSchools={schools} questionCurations={await listQuestionCurations()} />;
}
