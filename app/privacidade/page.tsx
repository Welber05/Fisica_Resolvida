import Link from 'next/link';
import { LEGAL_DOCUMENT_VERSION, LEGAL_EFFECTIVE_DATE } from '@/lib/legal';

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header><Link className="auth-brand light" href="/"><span>φ</span><strong>Física <em>Resolvida</em></strong></Link><Link href="/acervo">← Voltar ao acervo</Link></header>
      <article>
        <p className="eyebrow">VERSÃO {LEGAL_DOCUMENT_VERSION}</p>
        <h1>Aviso de Privacidade</h1>
        <p className="legal-date">Vigência: {LEGAL_EFFECTIVE_DATE}</p>
        <div className="legal-draft"><strong>Versão operacional inicial.</strong> Antes da abertura pública, o responsável pela plataforma deverá inserir um canal oficial de contato e obter revisão jurídica adequada à operação comercial.</div>

        <h2>1. Quem trata os dados</h2>
        <p>A plataforma Física Resolvida atua como controladora dos dados cadastrais usados na operação do acervo. O canal oficial para solicitações de privacidade será informado antes da abertura do cadastro ao público.</p>

        <h2>2. Dados coletados</h2>
        <p>São obrigatórios nome, e-mail autenticado, telefone, nível escolar e endereço. Imagem, Currículo Lattes, ORCID e redes sociais são opcionais. A área financeira pode receber dados cadastrais do pagador e endereço de cobrança; cartão e CVV não são coletados.</p>

        <h2>3. Finalidades</h2>
        <ul><li>identificar a pessoa e controlar o acesso;</li><li>personalizar o atendimento e a experiência acadêmica;</li><li>administrar papéis, bloqueios, suspensões e segurança;</li><li>preparar cadastro e suporte para futura assinatura;</li><li>manter registros de consentimento e auditoria.</li></ul>

        <h2>4. Compartilhamento e infraestrutura</h2>
        <p>A identidade de acesso é confirmada pelo ChatGPT. O site utiliza a infraestrutura OpenAI Sites/Cloudflare para execução, banco e armazenamento de imagens. Dados financeiros de pagamento só serão enviados a um provedor especializado quando essa função for ativada e comunicada.</p>

        <h2>5. Conservação e segurança</h2>
        <p>Os dados são mantidos enquanto a conta estiver ativa ou enquanto necessários às finalidades informadas e às obrigações aplicáveis. A plataforma aplica controle de acesso por papel, trilha de auditoria, arquivos privados e anonimização administrativa. Nenhum sistema elimina todos os riscos; incidentes serão avaliados e tratados conforme as regras aplicáveis.</p>

        <h2>6. Direitos da pessoa titular</h2>
        <p>A pessoa pode consultar e corrigir seus dados em “Minha conta” e poderá solicitar confirmação, acesso, correção, anonimização, bloqueio, eliminação, informação sobre compartilhamento e revogação do consentimento, conforme aplicável. Um canal formal será publicado antes da abertura externa.</p>

        <h2>7. Atualizações</h2>
        <p>Mudanças materiais gerarão nova versão e, quando necessário, novo aceite. A versão aceita fica registrada no banco de consentimentos.</p>

        <footer><a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares" target="_blank" rel="noreferrer">Direitos dos titulares — ANPD ↗</a><a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noreferrer">Lei Geral de Proteção de Dados ↗</a></footer>
      </article>
    </main>
  );
}
