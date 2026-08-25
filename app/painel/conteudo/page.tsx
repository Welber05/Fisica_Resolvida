import ContentManager from './content-manager';
import { importedQuestions } from '@/app/questions';
import { listAcademicContentItems, listQuestionCurations, requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function AcademicContentPage() {
  await requirePageUser('/painel/conteudo', { roles: ['admin', 'manager'] });
  let items = [], curations = [];
  try { [items, curations] = await Promise.all([listAcademicContentItems(), listQuestionCurations()]); } catch (error) { console.warn('Conteúdo acadêmico indisponível para leitura:', error); }
  return (
    <ContentManager
      initialItems={items}
      questionCount={importedQuestions.length}
      editionCount={new Set(importedQuestions.map((question) => `${question.institution}|${question.edition}`)).size}
      curatedCount={curations.length}
    />
  );
}
