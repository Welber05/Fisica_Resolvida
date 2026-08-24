import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { importedQuestions } from '@/app/questions';
import { listQuestionCurations, requireApiUser, writeAudit } from '@/lib/user-service';
import type { QuestionVisibilityStatus } from '@/lib/user-types';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager', 'professor'] });
    const { id } = await context.params;
    const questionId = Number(id);
    const base = importedQuestions.find((question) => question.id === questionId);
    if (!base) throw new ValidationError('Questão não encontrada no acervo importado.');
    const payload = validateQuestionPayload(await request.json());
    const now = Date.now();
    await getD1()
      .prepare(
        `INSERT INTO question_curations (
          question_id, visibility_status, institution, institution_name, edition, phase,
          year, number, topic, level, title, statement_text, options_json, answer,
          answer_label, question_status, video, script_status, source_page, source_file,
          source_image, essential_figure, bncc_codes_json, notes, updated_by, created_at,
          updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(question_id) DO UPDATE SET
          visibility_status = excluded.visibility_status,
          institution = excluded.institution,
          institution_name = excluded.institution_name,
          edition = excluded.edition,
          phase = excluded.phase,
          year = excluded.year,
          number = excluded.number,
          topic = excluded.topic,
          level = excluded.level,
          title = excluded.title,
          statement_text = excluded.statement_text,
          options_json = excluded.options_json,
          answer = excluded.answer,
          answer_label = excluded.answer_label,
          question_status = excluded.question_status,
          video = excluded.video,
          script_status = excluded.script_status,
          source_page = excluded.source_page,
          source_file = excluded.source_file,
          source_image = excluded.source_image,
          essential_figure = excluded.essential_figure,
          bncc_codes_json = excluded.bncc_codes_json,
          notes = excluded.notes,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at`,
      )
      .bind(
        questionId,
        payload.visibilityStatus,
        payload.institution,
        payload.institutionName,
        payload.edition,
        payload.phase,
        payload.year,
        payload.number,
        payload.topic,
        payload.level,
        payload.title,
        payload.text,
        JSON.stringify(payload.options),
        payload.answer,
        payload.answerLabel,
        payload.questionStatus,
        payload.video,
        payload.scriptStatus,
        payload.sourcePage,
        payload.sourceFile,
        payload.sourceImage,
        payload.essentialFigure === null ? null : payload.essentialFigure ? 1 : 0,
        JSON.stringify(payload.bnccCodes),
        payload.notes,
        user.id,
        now,
        now,
        payload.visibilityStatus === 'deleted' ? now : null,
      )
      .run();
    await writeAudit(user.id, String(questionId), 'question.curation_updated', {
      visibilityStatus: payload.visibilityStatus,
      topic: payload.topic,
      level: payload.level,
      bnccCodes: payload.bnccCodes,
    });
    return NextResponse.json({ curations: await listQuestionCurations() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ roles: ['admin', 'manager', 'professor'] });
    const { id } = await context.params;
    const questionId = Number(id);
    const base = importedQuestions.find((question) => question.id === questionId);
    if (!base) throw new ValidationError('Questão não encontrada no acervo importado.');
    const now = Date.now();
    await getD1()
      .prepare(
        `INSERT INTO question_curations (
          question_id, visibility_status, institution, institution_name, edition, phase,
          year, number, topic, level, title, statement_text, options_json, answer,
          answer_label, question_status, video, script_status, source_page, source_file,
          source_image, essential_figure, bncc_codes_json, notes, updated_by, created_at,
          updated_at, deleted_at
        ) VALUES (?, 'deleted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)
        ON CONFLICT(question_id) DO UPDATE SET
          visibility_status = 'deleted',
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at`,
      )
      .bind(
        questionId,
        base.institution,
        base.institutionName,
        base.edition,
        base.phase,
        base.year,
        base.number,
        base.topic,
        base.level,
        base.title,
        base.text,
        JSON.stringify(base.options),
        base.answer,
        base.answerLabel,
        base.status,
        base.video,
        base.scriptStatus,
        base.sourcePage,
        base.sourceFile,
        base.sourceImage,
        base.essentialFigure ? 1 : 0,
        'Questão excluída logicamente pela gestão.',
        user.id,
        now,
        now,
        now,
      )
      .run();
    await writeAudit(user.id, String(questionId), 'question.deleted');
    return NextResponse.json({ curations: await listQuestionCurations() });
  } catch (error) {
    return jsonError(error);
  }
}

function validateQuestionPayload(value: unknown) {
  const input = objectValue(value);
  const visibilityStatus = String(input.visibilityStatus || 'active') as QuestionVisibilityStatus;
  if (!['active', 'inactive', 'deleted'].includes(visibilityStatus)) {
    throw new ValidationError('Status de exibição inválido.');
  }
  const answer = optionalInteger(input.answer);
  const bnccCodes = Array.isArray(input.bnccCodes)
    ? input.bnccCodes.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
    : String(input.bnccCodes ?? '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8);
  const options = Array.isArray(input.options)
    ? input.options.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
    : String(input.options ?? '').split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 8);
  return {
    visibilityStatus,
    institution: oneOf(input.institution, ['ITA', 'IME', 'ENEM', 'FTD'], 'instituição'),
    institutionName: optionalText(input.institutionName, 120),
    edition: text(input.edition, 'edição', 1, 80),
    phase: optionalText(input.phase, 120),
    year: optionalInteger(input.year),
    number: optionalInteger(input.number),
    topic: text(input.topic, 'assunto', 2, 80),
    level: oneOf(input.level, ['Fácil', 'Médio', 'Difícil'], 'dificuldade'),
    title: text(input.title, 'título', 3, 220),
    text: text(input.text, 'enunciado', 5, 12000),
    options,
    answer,
    answerLabel: optionalText(input.answerLabel, 12),
    questionStatus: optionalText(input.questionStatus, 60),
    video: optionalText(input.video, 500),
    scriptStatus: optionalText(input.scriptStatus, 80),
    sourcePage: optionalInteger(input.sourcePage),
    sourceFile: optionalText(input.sourceFile, 240),
    sourceImage: optionalText(input.sourceImage, 500),
    essentialFigure: input.essentialFigure === '' || input.essentialFigure === null || input.essentialFigure === undefined
      ? null
      : Boolean(input.essentialFigure),
    bnccCodes,
    notes: optionalText(input.notes, 1000),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ValidationError('Dados inválidos.');
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, min: number, max: number) {
  const result = String(value ?? '').trim();
  if (result.length < min) throw new ValidationError(`Preencha corretamente o campo ${label}.`);
  if (result.length > max) throw new ValidationError(`O campo ${label} excede o limite permitido.`);
  return result;
}

function optionalText(value: unknown, max: number) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new ValidationError('Um dos campos excede o limite permitido.');
  return result;
}

function optionalInteger(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new ValidationError('Um dos campos numéricos é inválido.');
  return Math.trunc(number);
}

function oneOf(value: unknown, allowed: string[], label: string) {
  const result = String(value ?? '').trim();
  if (!allowed.includes(result)) throw new ValidationError(`Selecione corretamente o campo ${label}.`);
  return result;
}
