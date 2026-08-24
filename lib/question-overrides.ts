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
      if (!curation) {
        return normalizeQuestionText({
          ...question,
          visibilityStatus: 'active' as const,
        });
      }
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
      return normalizeQuestionText(merged);
    })
    .filter(
      (question) =>
        options.includeHidden ||
        !question.visibilityStatus ||
        question.visibilityStatus === 'active',
    );
}

export function normalizeQuestionText(question: Question): Question {
  return {
    ...question,
    code: normalizeCompactText(question.code),
    institutionName: normalizeCompactText(question.institutionName),
    edition: normalizeCompactText(question.edition),
    phase: normalizeCompactText(question.phase),
    topic: normalizeCompactText(question.topic),
    level: normalizeCompactText(question.level),
    title: normalizeCompactText(question.title),
    text: normalizeExtractedText(question.text),
    options: question.options.map(normalizeExtractedText),
    answerLabel: question.answerLabel ? normalizeCompactText(question.answerLabel) : question.answerLabel,
    status: normalizeCompactText(question.status),
    video: question.video.trim(),
    scriptStatus: normalizeCompactText(question.scriptStatus),
    sourceFile: normalizeCompactText(question.sourceFile),
    curationNotes: question.curationNotes
      ? normalizeExtractedText(question.curationNotes)
      : question.curationNotes,
  };
}

export function normalizeExtractedText(value: string) {
  const paragraphBreak = '§§PARAGRAFO§§';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/([A-Za-zÀ-ÖØ-öø-ÿ])- *\n *([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1$2')
    .replace(/[ \t]*\n{2,}[ \t]*/g, paragraphBreak)
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?%)\]}])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(new RegExp(paragraphBreak, 'g'), '\n\n')
    .trim();
}

function normalizeCompactText(value: string) {
  return normalizeExtractedText(value).replace(/\n{2,}/g, ' ');
}

function normalizeInstitution(value: string, fallback: Question['institution']): Question['institution'] {
  return ['ITA', 'IME', 'ENEM', 'FTD'].includes(value)
    ? (value as Question['institution'])
    : fallback;
}
