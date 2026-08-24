import type { Question } from '@/app/questions';
import type { QuestionCuration } from '@/lib/user-types';

export function applyQuestionCurations(
  baseQuestions: Question[],
  curations: QuestionCuration[],
  options: { includeHidden?: boolean } = {},
) {
  const byId = new Map(curations.map((curation) => [curation.questionId, curation]));
  return baseQuestions
    .map((question) => {
      const curation = byId.get(question.id);
      if (!curation) return { ...question, visibilityStatus: 'active' as const };
      const merged: Question = {
        ...question,
        institution: normalizeInstitution(curation.institution, question.institution),
        institutionName: curation.institutionName || question.institutionName,
        edition: curation.edition || question.edition,
        phase: curation.phase || question.phase,
        year: curation.year ?? question.year,
        number: curation.number ?? question.number,
        topic: curation.topic || question.topic,
        level: curation.level || question.level,
        title: curation.title || question.title,
        text: curation.text || question.text,
        options: curation.options.length ? curation.options : question.options,
        answer: curation.answer ?? question.answer,
        answerLabel: curation.answerLabel || question.answerLabel,
        status: curation.questionStatus || question.status,
        video: curation.video || question.video,
        scriptStatus: curation.scriptStatus || question.scriptStatus,
        sourcePage: curation.sourcePage ?? question.sourcePage,
        sourceFile: curation.sourceFile || question.sourceFile,
        sourceImage: curation.sourceImage || question.sourceImage,
        essentialFigure: curation.essentialFigure ?? question.essentialFigure,
        bnccCodes: curation.bnccCodes,
        visibilityStatus: curation.visibilityStatus,
        curationNotes: curation.notes,
        curatedAt: curation.updatedAt,
      };
      return merged;
    })
    .filter(
      (question) =>
        options.includeHidden ||
        !question.visibilityStatus ||
        question.visibilityStatus === 'active',
    );
}

function normalizeInstitution(value: string, fallback: Question['institution']): Question['institution'] {
  return ['ITA', 'IME', 'ENEM', 'FTD'].includes(value)
    ? (value as Question['institution'])
    : fallback;
}
