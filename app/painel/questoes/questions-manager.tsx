'use client';

import { useMemo, useState } from 'react';
import { importedQuestions, type Question } from '@/app/questions';
import { bnccForQuestion, bnccLabel, bnccSkills } from '@/lib/bncc';
import { applyQuestionCurations } from '@/lib/question-overrides';
import type { QuestionCuration, QuestionVisibilityStatus } from '@/lib/user-types';

const institutions = ['Todas', 'ITA', 'IME', 'ENEM', 'FTD'];
const levels = ['Todas', 'Fácil', 'Médio', 'Difícil'];
const visibilityLabels: Record<QuestionVisibilityStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  deleted: 'Excluída',
};

export default function QuestionsManager({
  initialCurations,
  baseCount,
}: {
  initialCurations: QuestionCuration[];
  baseCount: number;
}) {
  const [curations, setCurations] = useState(initialCurations);
  const [editing, setEditing] = useState<Question | null>(null);
  const [query, setQuery] = useState('');
  const [institution, setInstitution] = useState('Todas');
  const [topic, setTopic] = useState('Todos');
  const [level, setLevel] = useState('Todas');
  const [visibility, setVisibility] = useState('Todos');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const questions = useMemo(
    () => applyQuestionCurations(importedQuestions, curations, { includeHidden: true }),
    [curations],
  );
  const topics = useMemo(() => Array.from(new Set(questions.map((question) => question.topic))).sort(), [questions]);
  const filtered = useMemo(
    () =>
      questions.filter((question) => {
        const haystack = `${question.code} ${question.title} ${question.text} ${question.edition} ${question.topic} ${question.sourceFile} ${bnccForQuestion(question).map(bnccLabel).join(' ')}`.toLowerCase();
        return (
          (institution === 'Todas' || question.institution === institution) &&
          (topic === 'Todos' || question.topic === topic) &&
          (level === 'Todas' || normalizeLevel(question.level) === level) &&
          (visibility === 'Todos' || (question.visibilityStatus ?? 'active') === visibility) &&
          haystack.includes(query.toLowerCase())
        );
      }),
    [questions, institution, topic, level, visibility, query],
  );
  const activeCount = questions.filter((question) => (question.visibilityStatus ?? 'active') === 'active').length;
  const inactiveCount = questions.filter((question) => question.visibilityStatus === 'inactive').length;
  const deletedCount = questions.filter((question) => question.visibilityStatus === 'deleted').length;

  async function saveQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage('');
    try {
      const payload = payloadFromForm(new FormData(event.currentTarget));
      const response = await fetch(`/api/admin/questions/${editing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { curations?: QuestionCuration[]; error?: string };
      if (!response.ok || !data.curations) throw new Error(data.error || 'Não foi possível salvar a questão.');
      setCurations(data.curations);
      setEditing(null);
      setMessage('Questão atualizada. Os filtros do acervo já passam a considerar essa curadoria.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  }

  async function changeVisibility(question: Question, nextStatus: QuestionVisibilityStatus) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payloadFromQuestion(question, nextStatus)),
      });
      const data = (await response.json()) as { curations?: QuestionCuration[]; error?: string };
      if (!response.ok || !data.curations) throw new Error(data.error || 'Não foi possível alterar o status.');
      setCurations(data.curations);
      setMessage(`Questão marcada como ${visibilityLabels[nextStatus].toLowerCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuestion(question: Question) {
    if (!confirm('Excluir esta questão do acervo visível? A exclusão é lógica e pode ser auditada.')) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { curations?: QuestionCuration[]; error?: string };
      if (!response.ok || !data.curations) throw new Error(data.error || 'Não foi possível excluir a questão.');
      setCurations(data.curations);
      if (editing?.id === question.id) setEditing(null);
      setMessage('Questão excluída do acervo visível.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">BANCO DE QUESTÕES</p>
          <h1>Questões cadastradas</h1>
          <p>Revise, classifique, inative ou exclua questões importadas sem perder a fonte original.</p>
        </div>
        <span>{baseCount} importadas · {curations.length} curadorias</span>
      </div>
      {message && <p className={`toast ${message.toLowerCase().includes('não') || message.toLowerCase().includes('erro') ? 'error' : 'success'}`}>{message}</p>}
      <section className="academic-summary">
        <article><span>✓</span><strong>{activeCount}</strong><p>questões ativas no acervo</p></article>
        <article><span>Ⅱ</span><strong>{inactiveCount}</strong><p>questões inativas nos filtros do usuário</p></article>
        <article><span>×</span><strong>{deletedCount}</strong><p>questões excluídas logicamente</p></article>
      </section>
      <section className="question-admin-grid">
        <div className="admin-list question-admin-list">
          <div className="question-admin-tools">
            <input placeholder="Buscar por código, título, enunciado, edição, assunto ou BNCC" value={query} onChange={(event) => setQuery(event.target.value)} />
            <select value={institution} onChange={(event) => setInstitution(event.target.value)}>{institutions.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={topic} onChange={(event) => setTopic(event.target.value)}><option>Todos</option>{topics.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option>Todos</option><option value="active">Ativas</option><option value="inactive">Inativas</option><option value="deleted">Excluídas</option></select>
          </div>
          <p className="empty-note">{filtered.length} questão(ões) encontradas.</p>
          {filtered.slice(0, 250).map((question) => (
            <article key={question.id} className={question.visibilityStatus === 'deleted' ? 'muted-row' : ''}>
              <div>
                <strong>{question.title}</strong>
                <small>{question.code} · {question.institution} {question.edition} · {question.topic}</small>
                <p>{normalizeLevel(question.level)} · {bnccForQuestion(question).map((skill) => skill.code).join(', ')} · {question.sourceFile || 'sem fonte'}</p>
              </div>
              <span className={`state ${question.visibilityStatus === 'inactive' ? 'inactive' : question.visibilityStatus === 'deleted' ? 'blocked' : 'active'}`}>{visibilityLabels[question.visibilityStatus ?? 'active']}</span>
              <button onClick={() => setEditing(question)}>Editar</button>
              {(question.visibilityStatus ?? 'active') === 'active'
                ? <button onClick={() => changeVisibility(question, 'inactive')} disabled={busy}>Inativar</button>
                : <button onClick={() => changeVisibility(question, 'active')} disabled={busy}>Ativar</button>}
              <button onClick={() => deleteQuestion(question)} disabled={busy}>Excluir</button>
            </article>
          ))}
          {filtered.length > 250 && <p className="empty-note">Mostrando as 250 primeiras. Use filtros ou busca para refinar.</p>}
        </div>

        <form className="admin-create inline question-editor" key={editing?.id ?? 'empty-question'} onSubmit={saveQuestion}>
          {editing ? (
            <>
              <h2>Editar questão</h2>
              <p className="empty-note">{editing.code} · ID {editing.id}</p>
              <div className="admin-form-grid">
                <label>Status no acervo<select name="visibilityStatus" defaultValue={editing.visibilityStatus ?? 'active'}><option value="active">Ativa</option><option value="inactive">Inativa</option><option value="deleted">Excluída</option></select></label>
                <label>Instituição<select name="institution" defaultValue={editing.institution}><option value="ITA">ITA</option><option value="IME">IME</option><option value="ENEM">ENEM</option><option value="FTD">FTD</option></select></label>
                <label>Nome da instituição<input name="institutionName" defaultValue={editing.institutionName} /></label>
                <label>Edição<input name="edition" defaultValue={editing.edition} /></label>
                <label>Fase<input name="phase" defaultValue={editing.phase} /></label>
                <label>Ano<input name="year" type="number" defaultValue={editing.year} /></label>
                <label>Número<input name="number" type="number" defaultValue={editing.number} /></label>
                <label>Assunto<input name="topic" defaultValue={editing.topic} list="topic-options" /></label>
                <datalist id="topic-options">{topics.map((item) => <option key={item} value={item} />)}</datalist>
                <label>Dificuldade<select name="level" defaultValue={normalizeLevel(editing.level)}><option>Fácil</option><option>Médio</option><option>Difícil</option></select></label>
                <label>Status/importação<input name="questionStatus" defaultValue={editing.status} placeholder="Importada, Discursiva, Anulada..." /></label>
                <label className="wide">Título<input name="title" required defaultValue={editing.title} /></label>
                <label className="wide">Enunciado<textarea name="text" required rows={8} defaultValue={editing.text} /></label>
                <label className="wide">Alternativas<textarea name="options" rows={5} defaultValue={editing.options.join('\n')} placeholder="Uma alternativa por linha" /></label>
                <label>Resposta correta<select name="answer" defaultValue={editing.answer ?? ''}><option value="">Sem gabarito/anulada</option>{['A', 'B', 'C', 'D', 'E'].map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
                <label>Rótulo do gabarito<input name="answerLabel" defaultValue={editing.answerLabel ?? ''} /></label>
                <label className="wide">Descritores / habilidades BNCC<div className="bncc-checks">{bnccSkills.map((skill) => <label key={skill.code}><input type="checkbox" name="bnccCodes" value={skill.code} defaultChecked={bnccForQuestion(editing).some((item) => item.code === skill.code)} />{bnccLabel(skill)}</label>)}</div></label>
                <label className="wide">Vídeo de resolução<input name="video" defaultValue={editing.video} placeholder="https://youtube.com/..." /></label>
                <label>Status do roteiro<input name="scriptStatus" defaultValue={editing.scriptStatus} /></label>
                <label>Arquivo fonte<input name="sourceFile" defaultValue={editing.sourceFile} /></label>
                <label>Página fonte<input name="sourcePage" type="number" defaultValue={editing.sourcePage} /></label>
                <label className="wide">Imagem da fonte<input name="sourceImage" defaultValue={editing.sourceImage} /></label>
                <label className="wide">Notas internas<textarea name="notes" rows={3} defaultValue={editing.curationNotes ?? ''} /></label>
                <input type="hidden" name="essentialFigure" value={editing.essentialFigure ? '1' : ''} />
              </div>
              <footer><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary" disabled={busy}>Salvar questão</button></footer>
            </>
          ) : (
            <div className="empty-state">
              <b>Selecione uma questão</b>
              <p>Clique em “Editar” para alterar assunto, dificuldade, BNCC, status, gabarito, vídeo e demais classificações usadas nos filtros.</p>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

function normalizeLevel(value: string) {
  const raw = value.toLowerCase();
  if (raw.includes('fácil') || raw.includes('facil')) return 'Fácil';
  if (raw.includes('méd') || raw.includes('med')) return 'Médio';
  return 'Difícil';
}

function payloadFromForm(form: FormData) {
  const answerValue = String(form.get('answer') ?? '');
  return {
    visibilityStatus: String(form.get('visibilityStatus')),
    institution: String(form.get('institution')),
    institutionName: String(form.get('institutionName') ?? ''),
    edition: String(form.get('edition') ?? ''),
    phase: String(form.get('phase') ?? ''),
    year: String(form.get('year') ?? ''),
    number: String(form.get('number') ?? ''),
    topic: String(form.get('topic') ?? ''),
    level: String(form.get('level') ?? ''),
    title: String(form.get('title') ?? ''),
    text: String(form.get('text') ?? ''),
    options: String(form.get('options') ?? '').split('\n').map((item) => item.trim()).filter(Boolean),
    answer: answerValue === '' ? null : Number(answerValue),
    answerLabel: String(form.get('answerLabel') ?? ''),
    questionStatus: String(form.get('questionStatus') ?? ''),
    video: String(form.get('video') ?? ''),
    scriptStatus: String(form.get('scriptStatus') ?? ''),
    sourcePage: String(form.get('sourcePage') ?? ''),
    sourceFile: String(form.get('sourceFile') ?? ''),
    sourceImage: String(form.get('sourceImage') ?? ''),
    essentialFigure: String(form.get('essentialFigure') ?? ''),
    bnccCodes: form.getAll('bnccCodes').map(String),
    notes: String(form.get('notes') ?? ''),
  };
}

function payloadFromQuestion(question: Question, visibilityStatus: QuestionVisibilityStatus) {
  return {
    visibilityStatus,
    institution: question.institution,
    institutionName: question.institutionName,
    edition: question.edition,
    phase: question.phase,
    year: question.year,
    number: question.number,
    topic: question.topic,
    level: normalizeLevel(question.level),
    title: question.title,
    text: question.text,
    options: question.options,
    answer: question.answer,
    answerLabel: question.answerLabel ?? '',
    questionStatus: question.status,
    video: question.video,
    scriptStatus: question.scriptStatus,
    sourcePage: question.sourcePage,
    sourceFile: question.sourceFile,
    sourceImage: question.sourceImage,
    essentialFigure: question.essentialFigure ? '1' : '',
    bnccCodes: bnccForQuestion(question).map((skill) => skill.code),
    notes: question.curationNotes ?? '',
  };
}
