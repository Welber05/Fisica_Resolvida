import { NextResponse } from 'next/server';
import { getD1 } from '@/db';
import { ApiAccessError, requireApiUser } from '@/lib/user-service';

type ProgressPayload = {
  questionId?: number;
  questionCode?: string;
  institution?: string;
  topic?: string;
  edition?: string;
  selectedAnswer?: number | null;
  correctAnswer?: number | null;
  status?: 'viewed' | 'answered' | 'correct' | 'wrong';
};

export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser();
    const payload = (await request.json()) as ProgressPayload;
    const questionId = Number(payload.questionId);
    if (!Number.isFinite(questionId) || questionId <= 0) {
      return NextResponse.json({ error: 'Questão inválida.' }, { status: 400 });
    }

    const now = Date.now();
    const status = payload.status ?? 'viewed';
    const selectedAnswer =
      typeof payload.selectedAnswer === 'number' ? payload.selectedAnswer : null;
    const correctAnswer =
      typeof payload.correctAnswer === 'number' ? payload.correctAnswer : null;
    const answered = status !== 'viewed';
    const correct = status === 'correct';

    await getD1()
      .prepare(
        `INSERT INTO user_question_progress (
          user_id, question_id, question_code, institution, topic, edition,
          status, selected_answer, correct_answer, attempts, correct_attempts,
          first_seen_at, last_seen_at, last_answered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, question_id) DO UPDATE SET
          question_code = excluded.question_code,
          institution = excluded.institution,
          topic = excluded.topic,
          edition = excluded.edition,
          status = excluded.status,
          selected_answer = COALESCE(excluded.selected_answer, user_question_progress.selected_answer),
          correct_answer = COALESCE(excluded.correct_answer, user_question_progress.correct_answer),
          attempts = user_question_progress.attempts + ?,
          correct_attempts = user_question_progress.correct_attempts + ?,
          last_seen_at = excluded.last_seen_at,
          last_answered_at = COALESCE(excluded.last_answered_at, user_question_progress.last_answered_at)`,
      )
      .bind(
        user.id,
        questionId,
        String(payload.questionCode ?? ''),
        String(payload.institution ?? ''),
        String(payload.topic ?? ''),
        String(payload.edition ?? ''),
        status,
        selectedAnswer,
        correctAnswer,
        answered ? 1 : 0,
        correct ? 1 : 0,
        now,
        now,
        answered ? now : null,
        answered ? 1 : 0,
        correct ? 1 : 0,
      )
      .run();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error(error);
    return NextResponse.json({ error: 'Não foi possível gravar o progresso.' }, { status: 500 });
  }
}
