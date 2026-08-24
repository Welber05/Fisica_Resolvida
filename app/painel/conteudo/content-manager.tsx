'use client';

import { useMemo, useState } from 'react';
import type { AcademicContentItem } from '@/lib/user-types';

const kindLabels: Record<string, string> = {
  question_set: 'Lote de questões',
  exam: 'Prova / simulado',
  script: 'Roteiro',
  video: 'Videoaula',
};

const statusLabels: Record<AcademicContentItem['status'], string> = {
  draft: 'Rascunho',
  review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
};

export default function ContentManager({
  initialItems,
  questionCount,
  editionCount,
  curatedCount,
}: {
  initialItems: AcademicContentItem[];
  questionCount: number;
  editionCount: number;
  curatedCount: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<AcademicContentItem | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => items.filter((item) => `${item.title} ${item.institution} ${item.topic} ${item.edition}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const url = editing ? `/api/admin/academic-content/${editing.id}` : '/api/admin/academic-content';
    const method = editing ? 'PATCH' : 'POST';
    try {
      const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = (await response.json()) as { items?: AcademicContentItem[]; error?: string };
      if (!response.ok || !data.items) throw new Error(data.error || 'Não foi possível salvar o conteúdo.');
      setItems(data.items); setEditing(null); setMessage('Conteúdo acadêmico salvo com sucesso.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  async function removeItem(id: string) {
    if (!confirm('Arquivar/remover este conteúdo da gestão?')) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/academic-content/${id}`, { method: 'DELETE' });
      const data = (await response.json()) as { items?: AcademicContentItem[]; error?: string };
      if (!response.ok || !data.items) throw new Error(data.error || 'Não foi possível remover o conteúdo.');
      setItems(data.items); setMessage('Conteúdo removido da listagem.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-heading"><div><p className="eyebrow">GESTÃO ACADÊMICA</p><h1>Conteúdo acadêmico</h1><p>Gerencie lotes de questões, provas, roteiros e videoaulas ligadas ao acervo.</p></div><span>{questionCount} questões · {editionCount} edições</span></div>
      {message && <p className={`toast ${message.toLowerCase().includes('não') || message.toLowerCase().includes('erro') ? 'error' : 'success'}`}>{message}</p>}
      <section className="academic-summary"><article><span>∑</span><strong>{questionCount}</strong><p>questões importadas no acervo principal</p></article><article><span>✎</span><strong>{curatedCount}</strong><p>questões com curadoria em Gestão</p></article><article><span>▣</span><strong>{items.length}</strong><p>registros acadêmicos gerenciáveis</p></article><article><span>▶</span><strong>{items.filter((item) => item.kind === 'video').length}</strong><p>videoaulas/roteiros cadastrados</p></article></section>
      <p className="empty-note"><a href="/painel/questoes">Abrir Questões cadastradas</a> para editar assunto, dificuldade, BNCC, status e demais filtros do acervo.</p>
      <section className="admin-crud-grid">
        <div className="admin-list">
          <div className="users-tools"><input placeholder="Buscar conteúdo por título, instituição, tema ou edição" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          {filtered.length ? filtered.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{kindLabels[item.kind] ?? item.kind} · {item.institution} {item.edition}</small><p>{item.topic} · {item.sourceReference || 'sem referência externa'}</p></div><span className={`state ${item.status === 'published' ? 'active' : item.status === 'archived' ? 'inactive' : 'suspended'}`}>{statusLabels[item.status]}</span><button onClick={() => setEditing(item)}>Editar</button><button onClick={() => removeItem(item.id)} disabled={busy}>Remover</button></article>) : <div className="empty-state"><b>Nenhum conteúdo cadastrado</b><p>Use o formulário ao lado para organizar materiais além do acervo importado.</p></div>}
        </div>
        <form className="admin-create inline" key={editing?.id ?? 'new-content'} onSubmit={saveItem}>
          <h2>{editing ? 'Editar conteúdo' : 'Novo conteúdo'}</h2>
          <div className="admin-form-grid">
            <label className="wide">Título<input name="title" required defaultValue={editing?.title ?? ''} /></label>
            <label>Tipo<select name="kind" defaultValue={editing?.kind ?? 'question_set'}><option value="question_set">Lote de questões</option><option value="exam">Prova / simulado</option><option value="script">Roteiro</option><option value="video">Videoaula</option></select></label>
            <label>Status<select name="status" defaultValue={editing?.status ?? 'draft'}><option value="draft">Rascunho</option><option value="review">Em revisão</option><option value="published">Publicado</option><option value="archived">Arquivado</option></select></label>
            <label>Instituição<input name="institution" defaultValue={editing?.institution ?? 'Geral'} /></label>
            <label>Edição/ano<input name="edition" defaultValue={editing?.edition ?? ''} /></label>
            <label>Tema<input name="topic" defaultValue={editing?.topic ?? 'Física geral'} /></label>
            <label className="wide">Referência/fonte<input name="sourceReference" defaultValue={editing?.sourceReference ?? ''} placeholder="PDF, YouTube, lista, prova..." /></label>
            <label className="wide">Notas<textarea name="notes" rows={5} defaultValue={editing?.notes ?? ''} /></label>
          </div>
          <footer>{editing && <button type="button" onClick={() => setEditing(null)}>Cancelar</button>}<button className="primary" disabled={busy}>Salvar conteúdo</button></footer>
        </form>
      </section>
    </main>
  );
}
