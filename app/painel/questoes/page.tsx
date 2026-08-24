import QuestionsManager from './questions-manager';
import { importedQuestions } from '@/app/questions';
import { listQuestionCurations, requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function ManagedQuestionsPage() {
  await requirePageUser('/painel/questoes', { roles: ['admin', 'manager'] });
  return (
    <QuestionsManager
      baseCount={importedQuestions.length}
      initialCurations={await listQuestionCurations()}
    />
  );
}
