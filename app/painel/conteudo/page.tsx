import ContentManager from './content-manager';
import { importedQuestions } from '@/app/questions';
import { listAcademicContentItems, listQuestionCurations, requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function AcademicContentPage() {
  await requirePageUser('/painel/conteudo', { roles: ['admin', 'manager', 'professor'] });
  return (
    <ContentManager
      initialItems={await listAcademicContentItems()}
      questionCount={importedQuestions.length}
      editionCount={new Set(importedQuestions.map((question) => `${question.institution}|${question.edition}`)).size}
      curatedCount={(await listQuestionCurations()).length}
    />
  );
}
