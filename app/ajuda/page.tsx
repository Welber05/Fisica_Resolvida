import Link from 'next/link';
import { requirePageUser } from '@/lib/user-service';

export const dynamic = 'force-dynamic';

export default async function HelpPage() {
  const { user } = await requirePageUser('/ajuda');
  const canManage = user.role === 'admin' || user.role === 'manager';

  return (
    <main className="guide-page">
      <header className="guide-hero">
        <Link className="auth-brand light" href="/"><span>φ</span><strong>Física <em>Resolvida</em></strong></Link>
        <div><p className="eyebrow">GUIA DE USO</p><h1>Como usar a plataforma</h1><p>Um roteiro rápido do primeiro acesso à administração.</p></div>
        <Link href="/acervo">← Voltar ao acervo</Link>
      </header>
      <article className="guide-content">
        <section><span>01</span><div><h2>Acesso e cadastro</h2><ol><li>Selecione <b>Entrar com ChatGPT</b>.</li><li>No primeiro acesso, preencha nome, telefone, nível escolar e endereço.</li><li>Imagem, Lattes, ORCID e redes sociais são opcionais.</li><li>O e-mail vem da identidade autenticada; o site não armazena senha.</li></ol></div></section>
        <section><span>02</span><div><h2>Acervo e atividades</h2><ol><li>Filtre o banco por instituição, edição, assunto ou dificuldade.</li><li>Responda a questão e confira o gabarito oficial.</li><li>Baixe o PDF disponível ou selecione questões no gerador de provas.</li><li>Use a área de roteiros para preparar as gravações.</li></ol></div></section>
        <section><span>03</span><div><h2>Perfil e faturamento</h2><ol><li>Abra <b>Minha conta</b> para editar perfil, endereço e imagem.</li><li>Use a aba de faturamento para os dados do pagador e endereço de cobrança.</li><li>Nunca informe cartão ou CVV: pagamentos ainda não estão ativos.</li></ol></div></section>
        {canManage && <section><span>04</span><div><h2>Gerenciar usuários e equipe</h2><ol><li>Abra <b>Painel → Usuários e equipe</b>.</li><li>Crie usuários, professores, gerentes ou administradores conforme sua permissão.</li><li>Edite cadastros, papéis e estados de acesso.</li><li>Para suspender ou bloquear, informe uma justificativa; suspensão exige data futura.</li><li>A exclusão anonimiza dados pessoais e preserva a auditoria mínima.</li></ol></div></section>}
        {canManage && <section><span>05</span><div><h2>Identificação das alterações</h2><p>Sua conta é o administrador humano. <b>Codex · automação</b> é um ator técnico sem login, reservado à auditoria de inicializações e automações. Ações humanas mostram o nome do operador; mudanças de código permanecem no histórico do GitHub.</p></div></section>}
        <section className="guide-warning"><span>!</span><div><h2>Antes de cobrar pelo acesso</h2><p>Ative um provedor de pagamentos, termos, privacidade e proteção server-side do conteúdo premium. O módulo atual prepara o cadastro de faturamento, mas não executa cobranças.</p></div></section>
        <footer><Link className="primary" href={canManage ? '/painel' : '/acervo'}>{canManage ? 'Abrir painel de gestão' : 'Abrir banco de questões'} →</Link><Link href="/conta">Editar minha conta</Link></footer>
      </article>
    </main>
  );
}
