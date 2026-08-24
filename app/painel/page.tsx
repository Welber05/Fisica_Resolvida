import { dashboardMetrics, recentAuditLogs, requirePageUser } from '@/lib/user-service';
import { roleLabels } from '@/lib/user-types';
import { importedQuestions } from '@/app/questions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { user } = await requirePageUser('/painel', { roles: ['admin', 'manager', 'professor'] });
  const canManageUsers = ['admin', 'manager'].includes(user.role);
  const metrics = canManageUsers ? await dashboardMetrics() : null;
  const logs = canManageUsers ? await recentAuditLogs() : [];
  const editionCount = new Set(
    importedQuestions.map((question) => `${question.institution}|${question.edition}`),
  ).size;
  return (
    <main className="dashboard-page">
      <div className="dashboard-heading"><div><p className="eyebrow">BEM-VINDO, {roleLabels[user.role].toUpperCase()}</p><h1>Central de gestão</h1><p>Acompanhe cadastros, acessos, faturamento e conteúdo acadêmico.</p></div><span>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
      <section className="metric-grid">
        <article><span>∑</span><div><small>BANCO DE QUESTÕES</small><strong>{importedQuestions.length}</strong><p>ITA, IME e ENEM</p></div></article>
        {metrics ? <><article><span>●</span><div><small>USUÁRIOS ATIVOS</small><strong>{metrics.active}</strong><p>de {metrics.users} cadastros</p></div></article><article><span>◆</span><div><small>EQUIPE</small><strong>{metrics.staff}</strong><p>professores e gestores</p></div></article><article><span>!</span><div><small>ACESSO RESTRITO</small><strong>{metrics.restricted}</strong><p>bloqueados ou suspensos</p></div></article></> : <><article><span>▣</span><div><small>EDIÇÕES</small><strong>{editionCount}</strong><p>acervo conferido</p></div></article><article><span>▶</span><div><small>ROTEIROS</small><strong>{importedQuestions.length}</strong><p>prontos para adaptar</p></div></article></>}
      </section>
      <section className="dashboard-columns">
        <article className="dashboard-panel"><header><div><p className="eyebrow">ACESSOS RÁPIDOS</p><h2>Operação da plataforma</h2></div></header><div className="quick-grid">
          {canManageUsers && <a href="/painel/usuarios"><span>01</span><strong>Usuários e equipe</strong><p>Cadastrar, editar, atribuir papéis e controlar o acesso.</p><b>Gerenciar →</b></a>}
          {canManageUsers && <a href="/painel/faturamento"><span>02</span><strong>Faturamento</strong><p>Consultar perfis financeiros e preparar futuras assinaturas.</p><b>Acessar →</b></a>}
          <a href="/painel/conteudo"><span>{canManageUsers ? '03' : '01'}</span><strong>Conteúdo acadêmico</strong><p>Gerenciar lotes, provas, roteiros e videoaulas.</p><b>Gerenciar →</b></a>
          <a href="/conta"><span>{canManageUsers ? '04' : '02'}</span><strong>Minha conta</strong><p>Perfil, endereço, imagem e faturamento pessoal.</p><b>Editar →</b></a>
        </div></article>
        <aside className="dashboard-panel compact"><header><p className="eyebrow">SEGURANÇA E AUDITORIA</p><h2>{canManageUsers ? 'Atividade recente' : 'Seu nível de acesso'}</h2></header>
          {canManageUsers ? <div className="audit-list">{logs.length ? logs.map((log) => <div key={log.id}><span>{new Date(log.createdAt).toLocaleDateString('pt-BR')}</span><p><strong>{auditLabel(log.action)}</strong><small>{log.actorName} → {log.targetName}</small></p></div>) : <p className="empty-note">As ações administrativas aparecerão aqui.</p>}</div> : <div className="role-summary"><span>PROFESSOR</span><p>Você pode acessar o painel, cadastrar questões, usar o gerador e preparar roteiros. Dados pessoais de usuários ficam restritos à gestão.</p></div>}
        </aside>
      </section>
    </main>
  );
}

function auditLabel(action: string) {
  const labels: Record<string, string> = { 'system.codex_actor_registered': 'Ator técnico registrado', 'user.owner_reserved': 'Administrador proprietário reservado', 'user.bootstrap': 'Administrador inicial', 'profile.onboarding_completed': 'Cadastro concluído', 'profile.updated': 'Perfil atualizado', 'user.created': 'Usuário cadastrado', 'user.role_changed': 'Papel alterado', 'user.status_changed': 'Estado alterado', 'billing.updated': 'Faturamento atualizado', 'user.anonymized': 'Cadastro anonimizado' };
  return labels[action] || action;
}
