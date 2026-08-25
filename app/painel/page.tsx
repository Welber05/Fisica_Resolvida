import { dashboardMetrics, recentAuditLogs, requirePageUser } from '@/lib/user-service';
import { roleLabels } from '@/lib/user-types';
import { importedQuestions } from '@/app/questions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { user } = await requirePageUser('/painel', { roles: ['admin', 'manager'] });
  let metrics = { users: 0, active: 0, staff: 0, restricted: 0, billing: 0 };
  let logs: Awaited<ReturnType<typeof recentAuditLogs>> = [];
  try {
    [metrics, logs] = await Promise.all([dashboardMetrics(), recentAuditLogs()]);
  } catch (error) {
    console.warn('Painel público em modo somente leitura:', error);
  }
  return (
    <main className="dashboard-page">
      <div className="dashboard-heading"><div><p className="eyebrow">BEM-VINDO, {roleLabels[user.role].toUpperCase()}</p><h1>Central de gestão</h1><p>Acompanhe cadastros, acessos, faturamento e conteúdo acadêmico.</p></div><span>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
      <section className="metric-grid">
        <article><span>∑</span><div><small>BANCO DE QUESTÕES</small><strong>{importedQuestions.length}</strong><p>ITA, IME e ENEM</p></div></article>
        <article><span>●</span><div><small>USUÁRIOS ATIVOS</small><strong>{metrics.active}</strong><p>de {metrics.users} cadastros</p></div></article><article><span>◆</span><div><small>EQUIPE</small><strong>{metrics.staff}</strong><p>professores e gestores</p></div></article><article><span>!</span><div><small>ACESSO RESTRITO</small><strong>{metrics.restricted}</strong><p>bloqueados ou suspensos</p></div></article>
      </section>
      <section className="dashboard-columns">
        <article className="dashboard-panel"><header><div><p className="eyebrow">ACESSOS RÁPIDOS</p><h2>Operação da plataforma</h2></div></header><div className="quick-grid">
          <a href="/painel/convites"><span>01</span><strong>Convites e códigos</strong><p>Liberar cadastro por perfil, e-mail, licença e limite de uso.</p><b>Gerenciar →</b></a>
          <a href="/painel/usuarios"><span>02</span><strong>Usuários e equipe</strong><p>Cadastrar, editar, atribuir papéis e controlar o acesso.</p><b>Gerenciar →</b></a>
          <a href="/painel/faturamento"><span>03</span><strong>Faturamento</strong><p>Consultar perfis financeiros e preparar futuras assinaturas.</p><b>Acessar →</b></a>
          <a href="/painel/questoes"><span>04</span><strong>Questões cadastradas</strong><p>Editar classificações, BNCC, dificuldade, status e fonte das questões.</p><b>Curar questões →</b></a>
          <a href="/painel/conteudo"><span>05</span><strong>Conteúdo acadêmico</strong><p>Gerenciar lotes, provas, roteiros e videoaulas.</p><b>Gerenciar →</b></a>
          <a href="/conta"><span>06</span><strong>Minha conta</strong><p>Perfil, endereço, imagem e faturamento pessoal.</p><b>Editar →</b></a>
        </div></article>
        <aside className="dashboard-panel compact"><header><p className="eyebrow">SEGURANÇA E AUDITORIA</p><h2>Atividade recente</h2></header>
          <div className="audit-list">{logs.length ? logs.map((log) => <div key={log.id}><span>{new Date(log.createdAt).toLocaleDateString('pt-BR')}</span><p><strong>{auditLabel(log.action)}</strong><small>{log.actorName} → {log.targetName}</small></p></div>) : <p className="empty-note">As ações administrativas aparecerão aqui.</p>}</div>
        </aside>
      </section>
    </main>
  );
}

function auditLabel(action: string) {
  const labels: Record<string, string> = { 'system.codex_actor_registered': 'Ator técnico registrado', 'user.owner_reserved': 'Administrador proprietário reservado', 'user.bootstrap': 'Administrador inicial', 'profile.onboarding_completed': 'Cadastro concluído', 'profile.updated': 'Perfil atualizado', 'user.created': 'Usuário cadastrado', 'user.role_changed': 'Papel alterado', 'user.status_changed': 'Estado alterado', 'billing.updated': 'Faturamento atualizado', 'user.anonymized': 'Cadastro anonimizado', 'invite.created': 'Convite criado', 'invite.updated': 'Convite atualizado', 'invite.status_changed': 'Estado do convite alterado', 'invite.deleted': 'Convite excluído', 'invite.redeemed': 'Convite usado' };
  return labels[action] || action;
}
