import type { Question } from '@/app/questions';

export type BnccSkill = {
  code: string;
  label: string;
  topics: string[];
  keywords: string[];
};

export const bnccSkills: BnccSkill[] = [
  {
    code: 'EM13CNT101',
    label: 'Energia, matéria e conservação',
    topics: ['Mecânica', 'Dinâmica', 'Estática', 'Gravitação', 'Fluidos', 'Hidrostática', 'Hidrodinâmica', 'Termologia'],
    keywords: ['energia', 'trabalho', 'potência', 'quantidade de movimento', 'colisão', 'calor', 'temperatura', 'pressão'],
  },
  {
    code: 'EM13CNT103',
    label: 'Radiações, ondas e aplicações',
    topics: ['Ondulatória', 'Óptica', 'Óptica Geométrica', 'Física moderna'],
    keywords: ['onda', 'frequência', 'comprimento de onda', 'interferência', 'difração', 'radiação', 'luz', 'fóton'],
  },
  {
    code: 'EM13CNT106',
    label: 'Energia elétrica e tecnologias',
    topics: ['Eletricidade', 'Eletrodinâmica', 'Eletrostática', 'Eletromagnetismo'],
    keywords: ['corrente', 'tensão', 'resistência', 'circuito', 'campo elétrico', 'campo magnético', 'indução'],
  },
  {
    code: 'EM13CNT201',
    label: 'Modelos, previsões e sistemas físicos',
    topics: ['Física geral', 'Cinemática', 'Oscilações'],
    keywords: ['modelo', 'gráfico', 'função', 'movimento', 'oscilador', 'equilíbrio', 'trajetória'],
  },
  {
    code: 'EM13CNT301',
    label: 'Investigação, dados e comunicação científica',
    topics: [],
    keywords: ['experimento', 'medida', 'dados', 'gráfico', 'estimativa', 'incerteza', 'evidência'],
  },
];

export function bnccForQuestion(question: Pick<Question, 'title' | 'text' | 'topic' | 'bnccCodes'>) {
  if (question.bnccCodes?.length) {
    const curated = question.bnccCodes
      .map((code) => bnccSkills.find((skill) => skill.code === code))
      .filter((skill): skill is BnccSkill => Boolean(skill));
    if (curated.length) return curated;
  }
  const haystack = `${question.title} ${question.text} ${question.topic}`.toLowerCase();
  const matches = bnccSkills.filter(
    (skill) =>
      skill.topics.includes(question.topic) ||
      skill.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
  );
  return matches.length ? matches.slice(0, 2) : [bnccSkills[3]];
}

export function bnccLabel(skill: BnccSkill) {
  return `${skill.code} · ${skill.label}`;
}
