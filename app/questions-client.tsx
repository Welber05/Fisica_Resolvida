'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { importedQuestions, Question } from './questions';
import { bnccForQuestion, bnccLabel, bnccSkills } from '@/lib/bncc';
import { applyQuestionCurations, normalizeQuestionText } from '@/lib/question-overrides';
import type { QuestionCuration, SafeUser, TeacherSchool } from '@/lib/user-types';

type View = 'questoes' | 'prova' | 'cadastro' | 'roteiros';
type InstitutionFilter = 'Todas' | Question['institution'];
type DifficultyFilter = 'Todas' | 'Fácil' | 'Médio' | 'Difícil';

const topicIcons: Record<string, string> = {
  'Mecânica': '↗',
  'Eletricidade': 'ϟ',
  'Eletrostática': '⊕',
  'Eletromagnetismo': '∿',
  'Óptica': '◈',
  'Termologia': '♨',
  'Gravitação': '◎',
  'Oscilações': '∿',
  'Ondulatória': '≈',
  'Fluidos': '≋',
  'Física moderna': 'ℏ',
  'Física geral': 'Σ',
  'Cinemática': '↗',
  'Dinâmica': '↘',
  'Estática': '□',
  'Hidrostática': '≋',
  'Hidrodinâmica': '≋',
  'Óptica Geométrica': '◈',
  'Eletrodinâmica': 'ϟ',
};

const institutions: InstitutionFilter[] = ['Todas', 'ITA', 'IME', 'ENEM', 'FTD'];
const difficultyLevels: DifficultyFilter[] = ['Todas', 'Fácil', 'Médio', 'Difícil'];

function examKey(question: Question) {
  return question.institution + '|' + question.edition;
}

function examLabel(question: Question) {
  return question.institution + ' ' + question.edition;
}

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizedLevel(question: Question): DifficultyFilter {
  const raw = question.level.toLowerCase();
  if (raw.includes('fácil') || raw.includes('facil')) return 'Fácil';
  if (raw.includes('méd') || raw.includes('med')) return 'Médio';
  return 'Difícil';
}

export default function QuestionsClient({
  currentUser,
  teacherSchools = [],
  questionCurations = [],
}: {
  currentUser: SafeUser;
  teacherSchools?: TeacherSchool[];
  questionCurations?: QuestionCuration[];
}) {
  const curatedQuestions = useMemo(
    () => applyQuestionCurations(importedQuestions, questionCurations),
    [questionCurations],
  );
  const [questions, setQuestions] = useState<Question[]>(curatedQuestions);
  const [active, setActive] = useState(curatedQuestions[0] ?? importedQuestions[0]);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [topic, setTopic] = useState('Todos');
  const [institution, setInstitution] = useState<InstitutionFilter>('Todas');
  const [edition, setEdition] = useState('Todas');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('Todas');
  const [bncc, setBncc] = useState('Todas');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('questoes');
  const [selected, setSelected] = useState<number[]>(
    curatedQuestions.slice(0, 3).map((question) => question.id),
  );
  const [showSource, setShowSource] = useState(false);
  const [scriptQuestion, setScriptQuestion] = useState((curatedQuestions[0] ?? importedQuestions[0]).id);
  const canUseTeacherTools = ['professor', 'manager', 'admin'].includes(currentUser.role);
  const canManageContent = ['manager', 'admin'].includes(currentUser.role);
  const activeSchool = teacherSchools.find((school) => school.isActive) ?? teacherSchools[0] ?? null;
  const initials = (currentUser.fullName || currentUser.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const institutionCounts = useMemo(
    () => ({
      ITA: questions.filter((question) => question.institution === 'ITA').length,
      IME: questions.filter((question) => question.institution === 'IME').length,
      ENEM: questions.filter((question) => question.institution === 'ENEM').length,
      FTD: questions.filter((question) => question.institution === 'FTD').length,
    }),
    [questions],
  );

  const editions = useMemo(() => {
    const seen = new Set<string>();
    return questions
      .filter(
        (question) =>
          institution === 'Todas' || question.institution === institution,
      )
      .filter((question) => {
        const key = examKey(question);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((question) => ({ key: examKey(question), label: examLabel(question) }));
  }, [questions, institution]);

  const topicScope = useMemo(
    () =>
      questions.filter(
        (question) =>
          (institution === 'Todas' || question.institution === institution) &&
          (edition === 'Todas' || examKey(question) === edition),
      ),
    [questions, institution, edition],
  );

  const topics = useMemo(
    () => Array.from(new Set(topicScope.map((question) => question.topic))),
    [topicScope],
  );

  const difficultyScope = useMemo(
    () =>
      topicScope.filter(
        (question) => topic === 'Todos' || question.topic === topic,
      ),
    [topicScope, topic],
  );

  const bnccScope = useMemo(
    () =>
      difficultyScope.filter(
        (question) =>
          difficulty === 'Todas' || normalizedLevel(question) === difficulty,
      ),
    [difficultyScope, difficulty],
  );

  const filtered = useMemo(
    () =>
      questions.filter(
        (question) =>
          (institution === 'Todas' || question.institution === institution) &&
          (edition === 'Todas' || examKey(question) === edition) &&
          (topic === 'Todos' || question.topic === topic) &&
          (difficulty === 'Todas' || normalizedLevel(question) === difficulty) &&
          (bncc === 'Todas' ||
            bnccForQuestion(question).some((skill) => skill.code === bncc)) &&
          (
            question.title +
            question.text +
            question.code +
            question.sourceFile +
            bnccForQuestion(question).map(bnccLabel).join(' ')
          )
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [questions, institution, edition, topic, difficulty, bncc, query],
  );

  const roteiro =
    questions.find((question) => question.id === scriptQuestion) ?? questions[0];

  const activeIndex = filtered.findIndex((question) => question.id === active.id);
  const previousQuestion = activeIndex > 0 ? filtered[activeIndex - 1] : null;
  const nextQuestion =
    activeIndex >= 0 && activeIndex < filtered.length - 1
      ? filtered[activeIndex + 1]
      : null;

  useEffect(() => {
    const payload = {
      questionId: active.id,
      questionCode: active.code,
      institution: active.institution,
      topic: active.topic,
      edition: active.edition,
      status: 'viewed',
    };
    const sent = navigator.sendBeacon?.('/api/progress', JSON.stringify(payload));
    if (sent) return;
    void
      fetch('/api/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
  }, [active]);

  function saveProgress(status: 'viewed' | 'answered' | 'correct' | 'wrong') {
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        questionId: active.id,
        questionCode: active.code,
        institution: active.institution,
        topic: active.topic,
        edition: active.edition,
        selectedAnswer: choice,
        correctAnswer: active.answer,
        status,
      }),
    }).catch(() => {});
  }

  function navigate(next: View) {
    if (next === 'cadastro' && !canManageContent) return;
    if (next === 'roteiros' && !canUseTeacherTools) return;
    setView(next);
    setShowSource(false);
  }

  function openQuestion(question: Question) {
    setActive(question);
    setChoice(null);
    setChecked(false);
    setShowSource(false);
    setView('questoes');
  }

  function chooseInstitution(next: InstitutionFilter) {
    setInstitution(next);
    setEdition('Todas');
    setTopic('Todos');
    setDifficulty('Todas');
    setBncc('Todas');
    const first = questions.find(
      (question) => next === 'Todas' || question.institution === next,
    );
    if (first) {
      setActive(first);
      setChoice(null);
      setChecked(false);
      setShowSource(false);
    }
  }

  function chooseEdition(next: string) {
    setEdition(next);
    setTopic('Todos');
    setDifficulty('Todas');
    setBncc('Todas');
    const first = questions.find(
      (question) =>
        (institution === 'Todas' || question.institution === institution) &&
        (next === 'Todas' || examKey(question) === next),
    );
    if (first) {
      setActive(first);
      setChoice(null);
      setChecked(false);
      setShowSource(false);
    }
  }

  function downloadText(filename: string, content: string) {
    const anchor = document.createElement('a');
    const objectUrl = URL.createObjectURL(
      new Blob([content], { type: 'text/plain;charset=utf-8' }),
    );
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  }

  function downloadQuestion(question: Question) {
    const alternatives = question.options
      .map(
        (option, index) =>
          String.fromCharCode(65 + index) + ') ' + option,
      )
      .join('\n');
    const content = [
      question.code,
      question.title,
      'Instituição: ' + question.institutionName,
      'Edição: ' + question.edition + ' · ' + question.phase,
      'BNCC: ' + bnccForQuestion(question).map(bnccLabel).join('; '),
      'Fonte: ' + question.sourceFile + ', página ' + question.sourcePage,
      '',
      question.text,
      '',
      alternatives,
    ].join('\n');
    downloadText(
      safeName(question.institution + '-' + question.edition) +
        '-q' +
        question.number +
        '.txt',
      content,
    );
  }

  function roteiroText(question: Question) {
    const resposta = question.answerLabel ?? 'Questão anulada';
    const schoolHeader = activeSchool
      ? [
          activeSchool.name,
          activeSchool.headerTitle + ' — ' + activeSchool.headerSubtitle,
          activeSchool.footerText ? 'Observação institucional: ' + activeSchool.footerText : '',
          '',
        ].filter(Boolean)
      : [];
    return [
      ...schoolHeader,
      'ROTEIRO DE RESOLUÇÃO — ' + question.code,
      question.title,
      '',
      '1. ABERTURA (0:00–0:15)',
      'Hoje vamos resolver a questão ' +
        question.number +
        ' de Física do ' +
        question.institution +
        ' ' +
        question.edition +
        '. Pause o vídeo, tente primeiro e depois acompanhe a resolução.',
      '',
      '2. LEITURA E DADOS (0:15–1:00)',
      question.text,
      '',
      'Dados e figura: consultar ' +
        question.sourceFile +
        ', página ' +
        question.sourcePage +
        '.',
      '',
      '3. IDEIA FÍSICA CENTRAL (1:00–1:40)',
      'Tema: ' +
        question.topic +
        '. Apresente o princípio físico, as hipóteses e as grandezas relevantes antes das contas.',
      '',
      '4. RESOLUÇÃO PASSO A PASSO (1:40–5:00)',
      '• Organize os dados e converta unidades.',
      '• Escreva as equações fundamentais.',
      '• Desenvolva a solução com uma justificativa por etapa.',
      '• Compare o resultado com as alternativas.',
      '',
      '5. RESPOSTA (5:00–5:20)',
      'Gabarito oficial: ' +
        resposta +
        '. Explique por que esta alternativa é compatível com o resultado.',
      '',
      '6. FECHAMENTO (5:20–5:35)',
      'Se esta resolução ajudou, salve a questão e pratique outros itens de ' +
        question.topic +
        '.',
      '',
      'TÍTULO SUGERIDO PARA O YOUTUBE',
      question.code + ': ' + question.title + ' | Resolução completa',
      '',
      'DESCRIÇÃO SUGERIDA',
      'Resolução comentada da ' +
        question.code +
        ', tema ' +
        question.topic +
        '. Prova: ' +
        question.sourceFile +
        '.',
    ].join('\n');
  }

  function addQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageContent) return;
    const form = new FormData(event.currentTarget);
    const newId = Date.now();
    const answer = Number(form.get('answer'));
    const newInstitution = String(form.get('institution')) as Question['institution'];
    const newEdition = String(form.get('edition'));
    const question: Question = {
      id: newId,
      code: String(form.get('code')),
      institution: newInstitution,
      institutionName:
        newInstitution === 'IME'
          ? 'Instituto Militar de Engenharia'
          : newInstitution === 'ENEM'
            ? 'Exame Nacional do Ensino Médio'
            : newInstitution === 'FTD'
              ? 'Editora FTD'
              : 'Instituto Tecnológico de Aeronáutica',
      edition: newEdition,
      phase: String(form.get('phase')),
      year: Number(form.get('year')),
      number: Number(form.get('number')),
      topic: String(form.get('topic')),
      level: String(form.get('level')),
      title: String(form.get('title')),
      text: String(form.get('text')),
      options: ['a', 'b', 'c', 'd', 'e'].map((key) => String(form.get(key))),
      answer,
      answerLabel: String.fromCharCode(65 + answer),
      status: 'Cadastro manual',
      video: String(form.get('video') || ''),
      scriptStatus: 'Pendente',
      sourcePage: Number(form.get('page') || 0),
      sourceFile: String(
        form.get('source') ||
          newInstitution + ' ' + newEdition + ' - cadastro manual',
      ),
      sourceImage: '',
      essentialFigure: false,
    };
    const normalizedQuestion = normalizeQuestionText(question);
    setQuestions((current) => [normalizedQuestion, ...current]);
    openQuestion(normalizedQuestion);
  }

  return (
    <main>
      <header className="topbar">
        <Link className="brand" href="/" prefetch={false} aria-label="Ir para a página inicial">
          <span>φ</span>
          <strong>
            Física
            <br />
            <em>Resolvida</em>
          </strong>
        </Link>
        <nav>
          <button
            className={view === 'questoes' ? 'on' : ''}
            onClick={() => navigate('questoes')}
          >
            Banco de questões
          </button>
          <button
            className={view === 'prova' ? 'on' : ''}
            onClick={() => navigate('prova')}
          >
            Gerador de provas
          </button>
          {canUseTeacherTools && (
            <button
              className={view === 'roteiros' ? 'on' : ''}
              onClick={() => navigate('roteiros')}
            >
              Roteiros
            </button>
          )}
          {canManageContent && (
            <button
              className={view === 'cadastro' ? 'on' : ''}
              onClick={() => navigate('cadastro')}
            >
              Cadastrar questão
            </button>
          )}
          {canManageContent && <a href="/painel">Painel</a>}
          <a href="/ajuda">Ajuda</a>
          <a href="/conta">Minha conta</a>
        </nav>
        <a className="profile" href="/conta" aria-label="Abrir minha conta">
          {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="" /> : initials}
        </a>
      </header>

      {view === 'questoes' && (
        <div className="workspace">
          <aside className="filters">
            <p className="eyebrow">ACERVO OFICIAL</p>
            <h2>Questões de Física</h2>
            <div className="search">
              <span>⌕</span>
              <input
                aria-label="Buscar questões"
                placeholder="Buscar questão..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <p className="label">INSTITUIÇÃO</p>
            <div className="institution-row">
              {institutions.map((item) => (
                <button
                  key={item}
                  className={
                    institution === item
                      ? 'institution-filter active'
                      : 'institution-filter'
                  }
                  onClick={() => chooseInstitution(item)}
                >
                  <span>{item}</span>
                  <b>
                    {item === 'Todas'
                      ? questions.length
                      : institutionCounts[item]}
                  </b>
                </button>
              ))}
            </div>

            <p className="label">EDIÇÃO</p>
            <select
              className="year-select"
              aria-label="Filtrar por edição"
              value={edition}
              onChange={(event) => chooseEdition(event.target.value)}
            >
              <option value="Todas">Todas as edições</option>
              {editions.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="label">ASSUNTO</p>
            <button
              className={topic === 'Todos' ? 'filter active' : 'filter'}
              onClick={() => setTopic('Todos')}
            >
              <span>◎</span>
              Todos
              <b>{topicScope.length}</b>
            </button>
            {topics.map((item) => (
              <button
                key={item}
                className={topic === item ? 'filter active' : 'filter'}
                onClick={() => {
                  setTopic(item);
                  setDifficulty('Todas');
                  setBncc('Todas');
                }}
              >
                <span>{topicIcons[item] || '•'}</span>
                {item}
                <b>
                  {
                    topicScope.filter((question) => question.topic === item)
                      .length
                  }
                </b>
              </button>
            ))}

            <p className="label">CLASSIFICAÇÃO</p>
            <div className="difficulty-row">
              {difficultyLevels.map((item) => (
                <button
                  key={item}
                  className={difficulty === item ? 'difficulty active' : 'difficulty'}
                  onClick={() => {
                    setDifficulty(item);
                    setBncc('Todas');
                  }}
                >
                  <span>{item}</span>
                  <b>
                    {
                      difficultyScope.filter(
                        (question) =>
                          item === 'Todas' || normalizedLevel(question) === item,
                      ).length
                    }
                  </b>
                </button>
              ))}
            </div>

            <p className="label">BNCC · HABILIDADES</p>
            <select
              className="year-select"
              aria-label="Filtrar por habilidade da BNCC"
              value={bncc}
              onChange={(event) => setBncc(event.target.value)}
            >
              <option value="Todas">Todas as habilidades</option>
              {bnccSkills.map((skill) => (
                <option key={skill.code} value={skill.code}>
                  {bnccLabel(skill)} ({bnccScope.filter((question) => bnccForQuestion(question).some((item) => item.code === skill.code)).length})
                </option>
              ))}
            </select>
            <div className="generator-card">
              <span>✦</span>
              <h3>{questions.length} questões importadas</h3>
              <p>
                ITA, IME, ENEM e Simuladão com gabaritos, marcação de origem e
                páginas para conferência.
              </p>
              <button onClick={() => navigate('prova')}>
                Criar atividade →
              </button>
            </div>
          </aside>

          <section className="question">
            <div className="crumb">
              {active.institution} {active.edition}
              <span>/</span>
              {active.phase.toUpperCase()}
              <span>/</span>
              QUESTÃO {active.number}
            </div>
            <div className="chips">
              <span>{active.code}</span>
              <span
                className={
                  'institution-chip ' + active.institution.toLowerCase()
                }
              >
                {active.institution}
              </span>
              <span className="level">● {active.level}</span>
              {bnccForQuestion(active).map((skill) => (
                <span className="bncc-chip" key={skill.code}>
                  {bnccLabel(skill)}
                </span>
              ))}
              <span
                className={
                  active.status === 'Anulada' ? 'annulled' : 'imported'
                }
              >
                {active.status === 'Anulada'
                  ? 'ANULADA'
                  : '✓ GABARITO CONFERIDO'}
              </span>
            </div>
            <h1>{active.title}</h1>
            <p className="statement">{active.text}</p>
            {active.sourceImage && (
              <button
                className="source-toggle"
                onClick={() => setShowSource((current) => !current)}
              >
                {showSource ? 'Fechar página original' : '▣ Ver página original'}{' '}
                <small>p. {active.sourcePage}</small>
              </button>
            )}
            {showSource && (
              <div className="source-panel">
                <img
                  src={active.sourceImage}
                  alt={
                    'Página ' +
                    active.sourcePage +
                    ' da prova ' +
                    active.institution +
                    ' ' +
                    active.edition
                  }
                />
                <p>
                  Fonte: {active.sourceFile}, página {active.sourcePage}. Use
                  esta imagem para conferir figuras, gráficos e a notação
                  original.
                </p>
              </div>
            )}
            <div className="answers">
              {active.options.map((option, index) => (
                <button
                  key={index + '-' + option}
                  onClick={() => {
                    setChoice(index);
                    setChecked(false);
                  }}
                  className={
                    (choice === index ? 'chosen ' : '') +
                    (checked && active.answer === index ? 'correct ' : '') +
                    (checked &&
                    active.answer !== null &&
                    choice === index &&
                    index !== active.answer
                      ? 'wrong'
                      : '')
                  }
                >
                  <b>{String.fromCharCode(65 + index)}</b>
                  <span>{option}</span>
                  {checked && active.answer === index && <i>✓</i>}
                </button>
              ))}
            </div>
            <div className="actions">
              <button
                className="primary"
                disabled={choice === null && active.answer !== null}
                onClick={() => {
                  setChecked(true);
                  saveProgress(
                    active.answer === null
                      ? 'answered'
                      : choice === active.answer
                        ? 'correct'
                        : 'wrong',
                  );
                }}
              >
                {active.answer === null
                  ? 'Ver situação oficial'
                  : 'Verificar resposta'}
              </button>
              <button onClick={() => downloadQuestion(active)}>
                ⇩ Baixar questão
              </button>
              {active.video ? (
                <a href={active.video} target="_blank" rel="noreferrer">
                  ▶ Ver resolução
                </a>
              ) : (
                <button
                  onClick={() => {
                    setScriptQuestion(active.id);
                    navigate('roteiros');
                  }}
                >
                  ✎ Criar roteiro
                </button>
              )}
            </div>
            {checked && (
              <div
                className={
                  active.answer === null
                    ? 'feedback annulled-box'
                    : choice === active.answer
                      ? 'feedback good'
                      : 'feedback'
                }
              >
                <strong>
                  {active.answer === null
                    ? active.status === 'Anulada'
                      ? 'Questão anulada pelo gabarito oficial.'
                      : 'Questão sem alternativa objetiva extraída.'
                    : choice === active.answer
                      ? 'Muito bem! Resposta correta.'
                      : 'Ainda não. Revise a estratégia.'}
                </strong>
                <span>
                  {active.answer === null
                    ? active.status === 'Anulada'
                      ? 'A banca considerou a questão correta para todos os candidatos.'
                      : 'Consulte a página original e use a resolução como referência de correção.'
                    : 'Gabarito oficial: alternativa ' +
                      active.answerLabel +
                      '.'}
                </span>
              </div>
            )}
            <div className="question-nav">
              <button disabled={!previousQuestion} onClick={() => previousQuestion && openQuestion(previousQuestion)}>
                ← Anterior
              </button>
              <span>
                {activeIndex >= 0 ? activeIndex + 1 : 1} de {filtered.length} no filtro atual
              </span>
              <button disabled={!nextQuestion} onClick={() => nextQuestion && openQuestion(nextQuestion)}>
                Próxima →
              </button>
            </div>
          </section>
        </div>
      )}

      {view === 'prova' && (
        <section className="page">
          <div className="page-title">
            <p className="eyebrow">GERADOR DE ATIVIDADES</p>
            <h1>Monte uma prova com questões reais.</h1>
            <p>
              Combine questões oficiais do ITA, IME e ENEM em uma folha pronta
              para imprimir.
            </p>
          </div>
          <div className="builder">
            <div className="pick">
              <h2>
                Escolha as questões
                <span>{selected.length} selecionadas</span>
              </h2>
              <div className="pick-tools">
                <select
                  aria-label="Instituição no gerador"
                  value={institution}
                  onChange={(event) =>
                    chooseInstitution(event.target.value as InstitutionFilter)
                  }
                >
                  <option value="Todas">ITA + IME + ENEM + Simuladão</option>
                  <option value="ITA">ITA</option>
                  <option value="IME">IME</option>
                  <option value="ENEM">ENEM</option>
                  <option value="FTD">FTD / Simuladão</option>
                </select>
                <select
                  aria-label="Edição no gerador"
                  value={edition}
                  onChange={(event) => chooseEdition(event.target.value)}
                >
                  <option value="Todas">Todas as edições</option>
                  {editions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Dificuldade no gerador"
                  value={difficulty}
                  onChange={(event) => {
                    setDifficulty(event.target.value as DifficultyFilter);
                    setBncc('Todas');
                  }}
                >
                  {difficultyLevels.map((item) => (
                    <option key={item} value={item}>
                      {item === 'Todas' ? 'Todas as dificuldades' : item}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Habilidade BNCC no gerador"
                  value={bncc}
                  onChange={(event) => setBncc(event.target.value)}
                >
                  <option value="Todas">Todas as habilidades BNCC</option>
                  {bnccSkills.map((skill) => (
                    <option key={skill.code} value={skill.code}>
                      {bnccLabel(skill)}
                    </option>
                  ))}
                </select>
              </div>
              {filtered.map((question) => (
                <label key={question.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(question.id)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(question.id)
                          ? current.filter((id) => id !== question.id)
                          : [...current, question.id],
                      )
                    }
                  />
                  <div>
                    <small>
                      {question.code} · {question.topic}
                    </small>
                    <strong>{question.title}</strong>
                  </div>
                </label>
              ))}
            </div>
            <div className="paper">
              <div className="paper-head custom-paper-head">
                {activeSchool?.logoUrl && <img className="paper-school-logo" src={activeSchool.logoUrl} alt="" />}
                <span>{activeSchool?.name ?? 'FÍSICA RESOLVIDA'}</span>
                <strong>{activeSchool?.headerTitle ?? 'LISTA DE EXERCÍCIOS'}</strong>
                <em>{activeSchool?.headerSubtitle ?? 'Física'}</em>
                <p>
                  Nome: ___________________________________ Turma: __________
                </p>
              </div>
              {questions
                .filter((question) => selected.includes(question.id))
                .map((question, index) => (
                  <article key={question.id}>
                    <b>{index + 1}.</b>
                    <div>
                      <small>{question.code}</small>
                      <p>{question.text}</p>
                      {question.options.map((option, optionIndex) => (
                        <span key={optionIndex + '-' + option}>
                          ({String.fromCharCode(65 + optionIndex)}) {option}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              {(activeSchool?.footerText || activeSchool?.name) && (
                <footer className="paper-footer">
                  {activeSchool?.footerText || 'Material preparado no Física Resolvida.'}
                </footer>
              )}
              <button
                className="primary no-print"
                onClick={() => window.print()}
              >
                ⎙ Imprimir / salvar em PDF
              </button>
            </div>
          </div>
        </section>
      )}

      {view === 'roteiros' && canUseTeacherTools && (
        <section className="page scripts-page">
          <div className="page-title">
            <p className="eyebrow">ESTÚDIO DE CONTEÚDO</p>
            <h1>Roteiros para as resoluções.</h1>
            <p>
              Escolha uma questão e gere uma estrutura pronta para adaptar à
              sua gravação.
            </p>
          </div>
          <div className="builder">
            <div className="pick">
              <h2>
                Fila de gravação
                <span>{filtered.length} pendentes</span>
              </h2>
              {filtered.map((question) => (
                <button
                  key={question.id}
                  className={
                    roteiro.id === question.id
                      ? 'script-item active'
                      : 'script-item'
                  }
                  onClick={() => setScriptQuestion(question.id)}
                >
                  <small>
                    {question.code} · {question.topic}
                  </small>
                  <strong>{question.title}</strong>
                  <i>Roteiro pendente</i>
                </button>
              ))}
            </div>
            <article className="script-paper">
              {activeSchool && (
                <div className="script-school">
                  {activeSchool.logoUrl && <img src={activeSchool.logoUrl} alt="" />}
                  <div>
                    <strong>{activeSchool.name}</strong>
                    <span>{activeSchool.headerTitle} · {activeSchool.headerSubtitle}</span>
                  </div>
                </div>
              )}
              <div className="script-head">
                <span>ROTEIRO DE RESOLUÇÃO</span>
                <strong>{roteiro.code}</strong>
                <h2>{roteiro.title}</h2>
              </div>
              <pre>{roteiroText(roteiro)}</pre>
              <div className="script-actions">
                <button
                  className="primary"
                  onClick={() =>
                    downloadText(
                      'roteiro-' +
                        safeName(roteiro.institution + '-' + roteiro.edition) +
                        '-q' +
                        roteiro.number +
                        '.txt',
                      roteiroText(roteiro),
                    )
                  }
                >
                  ⇩ Baixar roteiro
                </button>
                <button onClick={() => openQuestion(roteiro)}>
                  Ver questão
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      {view === 'cadastro' && canManageContent && (
        <section className="page">
          <div className="page-title">
            <p className="eyebrow">ÁREA DO PROFESSOR</p>
            <h1>Cadastre uma nova questão.</h1>
            <p>
              Adicione instituição, edição, fase, enunciado, alternativas e o
              vídeo da resolução.
            </p>
          </div>
          <form className="form" onSubmit={addQuestion}>
            <div className="grid">
              <label>
                Instituição
                <select name="institution">
                  <option value="ITA">ITA</option>
                  <option value="IME">IME</option>
                  <option value="ENEM">ENEM</option>
                  <option value="FTD">FTD / Simuladão</option>
                </select>
              </label>
              <label>
                Edição
                <input required name="edition" placeholder="Ex.: 2025/2026" />
              </label>
              <label>
                Ano final
                <input required type="number" name="year" placeholder="2026" />
              </label>
              <label>
                Fase
                <input
                  required
                  name="phase"
                  defaultValue="1ª fase objetiva"
                />
              </label>
              <label>
                Número oficial
                <input required type="number" min="1" name="number" />
              </label>
              <label>
                Código / origem
                <input
                  required
                  name="code"
                  placeholder="Ex.: IME 2025/2026 · Q16"
                />
              </label>
              <label>
                Título
                <input required name="title" placeholder="Título curto" />
              </label>
              <label>
                Assunto
                <select name="topic">
                  {Array.from(new Set(questions.map((question) => question.topic))).map(
                    (item) => (
                      <option key={item}>{item}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Dificuldade
                <select name="level">
                  <option>Fácil</option>
                  <option>Médio</option>
                  <option>Difícil</option>
                </select>
              </label>
            </div>
            <label>
              Enunciado
              <textarea
                required
                name="text"
                rows={5}
                placeholder="Digite o enunciado completo..."
              />
            </label>
            <div className="options">
              {['a', 'b', 'c', 'd', 'e'].map((key) => (
                <label key={key}>
                  {key.toUpperCase()}
                  <input required name={key} />
                </label>
              ))}
            </div>
            <div className="grid">
              <label>
                Alternativa correta
                <select name="answer">
                  {['A', 'B', 'C', 'D', 'E'].map((item, index) => (
                    <option key={item} value={index}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Link da resolução no YouTube
                <input
                  type="url"
                  name="video"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </label>
              <label>
                Documento de origem
                <input name="source" placeholder="Ex.: IME 2025/2026" />
              </label>
              <label>
                Página original
                <input type="number" min="0" name="page" />
              </label>
            </div>
            <button className="primary">Publicar questão</button>
          </form>
        </section>
      )}
    </main>
  );
}
