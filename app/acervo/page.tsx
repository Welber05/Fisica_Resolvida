import QuestionsClient from '@/app/questions-client';
import { listQuestionCurations, listTeacherSchools, requirePageUser, safeUser } from '@/lib/user-service';
import type { QuestionCuration, TeacherSchool } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export default async function CollectionPage() {
  const { user } = await requirePageUser('/acervo');
  let schools: TeacherSchool[] = [];
  let questionCurations: QuestionCuration[] = [];
  try {
    schools = ['professor', 'manager', 'admin'].includes(user.role) ? await listTeacherSchools(user.id) : [];
    questionCurations = await listQuestionCurations();
  } catch (error) {
    // The public catalogue remains usable while the optional D1 layer is
    // unavailable or being migrated to PHP/MySQL.
    console.warn('Catálogo público em modo somente leitura:', error);
  }
  return <QuestionsClient currentUser={safeUser(user)} teacherSchools={schools} questionCurations={questionCurations} />;
}
