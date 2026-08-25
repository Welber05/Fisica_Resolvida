import Link from 'next/link';
import { LEGAL_DOCUMENT_VERSION, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export default function TermsPage() {
  return (
    <main className="legal-page">
      <header><Link className="auth-brand light" href="/"><span>φ</span><strong>Física <em>Resolvida</em></strong></Link><Link href="/acervo">← Voltar ao acervo</Link></header>
      <article>
        <p className="eyebrow">VERSÃO {LEGAL_DOCUMENT_VERSION}</p>
        <h1>Termos de Uso</h1>
        <p className="legal-date">Vigência: {LEGAL_EFFECTIVE_DATE}</p>
        <div className="legal-draft"><strong>Versão operacional inicial.</strong> Estes termos devem receber revisão jurídica e identificação completa do responsável antes do acesso público ou da cobrança.</div>

        <h2>1. Objeto</h2>
        <p>A Física Resolvida organiza questões, gabaritos, roteiros e ferramentas para estudo e ensino de Física. Nesta fase, o módulo financeiro é apenas cadastral e não realiza cobranças.</p>

        <h2>2. Acesso e conta</h2>
        <p>O login usa a identidade ChatGPT. Cada pessoa deve usar a própria conta, manter seus dados corretos e não compartilhar o acesso. Papéis de professor, gerente e administrador são atribuídos pela gestão.</p>

        <h2>3. Uso permitido</h2>
        <p>O conteúdo deve ser usado para fins pessoais, educacionais e operacionais autorizados. É proibido tentar contornar controles de acesso, explorar falhas, prejudicar o serviço, automatizar extração abusiva ou usar dados de terceiros sem autorização.</p>

        <h2>4. Conteúdo acadêmico</h2>
        <p>Questões e gabaritos oficiais permanecem associados às respectivas instituições e fontes. Materiais editoriais, organização, roteiros e recursos próprios da plataforma não podem ser redistribuídos comercialmente sem autorização. Eventuais erros devem ser comunicados para revisão.</p>

        <h2>5. Moderação e estados da conta</h2>
        <p>A gestão pode inativar, suspender ou bloquear uma conta por segurança, abuso, violação destes termos ou necessidade operacional, sempre com justificativa registrada. A pessoa poderá solicitar revisão quando o canal oficial estiver disponível.</p>

        <h2>6. Faturamento futuro</h2>
        <p>Planos pagos só entrarão em vigor após divulgação de preço, ciclo, meios de pagamento, cancelamento, reembolso e documentos fiscais. Nenhuma cobrança decorre do simples preenchimento da área de faturamento atual.</p>

        <h2>7. Alterações</h2>
        <p>Uma nova versão será apresentada quando houver mudança relevante. O uso continuado poderá depender de novo aceite.</p>
      </article>
    </main>
  );
}
