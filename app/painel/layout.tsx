import Link from 'next/link';
import { requirePageUser } from '@/lib/user-service';
import { roleLabels } from '@/lib/user-types';

export const dynamic = 'force-dynamic';

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePageUser('/painel', { roles: ['admin', 'manager'] });
  const initials = (user.fullName || user.email).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <div className="management-layout">
      <aside className="management-sidebar">
        <Link className="auth-brand light" href="/" prefetch={false}><span>φ</span><strong>Física <em>Resolvida</em></strong></Link>
        <p className="management-label">GESTÃO</p>
        <nav>
          <a href="/painel">Visão geral</a>
          <a href="/painel/convites">Convites e códigos</a>
          <a href="/painel/usuarios">Usuários e equipe</a>
          <a href="/painel/faturamento">Faturamento</a>
          <a href="/painel/questoes">Questões cadastradas</a>
          <a href="/painel/conteudo">Conteúdo acadêmico</a>
          <a href="/ajuda">Guia de uso</a>
        </nav>
        <div className="management-user"><div className="avatar">{user.avatarKey ? <img src={`/api/avatar/${user.id}`} alt="" /> : initials}</div><div><strong>{user.fullName}</strong><span>{roleLabels[user.role]}</span></div></div>
        <div className="management-bottom"><a href="/conta">Minha conta</a><a href="/acervo">Acervo público</a></div>
      </aside>
      <div className="management-main">
        <header className="management-top"><div><span>PAINEL DE GERENCIAMENTO</span><strong>Física Resolvida</strong></div><Link href="/acervo" prefetch={false}>← Voltar ao acervo</Link></header>
        {children}
      </div>
    </div>
  );
}
